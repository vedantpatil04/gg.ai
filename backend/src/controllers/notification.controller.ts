/**
 * Phase 7 — Notification Controller
 *
 * All responses are strictly scoped to req.user._id — a user can only
 * read / modify their own notifications. Server-side role enforcement
 * ensures cross-role leakage is impossible.
 */

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/Notification";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import type { NotificationCategory, NotificationStatus } from "../models/Notification";

// ─── GET /api/notifications ────────────────────────────────────────────────────
// Lists notifications for the authenticated user with filters and pagination.

export async function listNotifications(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId: req.user._id };

    // Status filter: "unread" | "read" | "archived" | "all"
    const statusQuery = req.query.status as string | undefined;
    if (statusQuery && statusQuery !== "all") {
      if (["unread", "read", "archived"].includes(statusQuery)) {
        filter.status = statusQuery;
      }
    } else if (!statusQuery) {
      // Default: exclude archived
      filter.status = { $ne: "archived" };
    }

    // Category filter
    const category = req.query.category as NotificationCategory | undefined;
    if (category) filter.category = category;

    // Search
    const search = req.query.search as string | undefined;
    if (search && search.trim()) {
      const pattern = new RegExp(search.trim(), "i");
      filter.$or = [{ title: pattern }, { summary: pattern }];
    }

    // Date range
    const fromDate = req.query.from as string | undefined;
    const toDate = req.query.to as string | undefined;
    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);
      filter.createdAt = dateFilter;
    }

    // Sort
    const sortOrder = req.query.sort === "oldest" ? 1 : -1;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user._id, status: "unread" }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/notifications/unread-count ──────────────────────────────────────

export async function getUnreadCount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const count = await Notification.countDocuments({
      userId: req.user._id,
      status: "unread",
    });

    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────

export async function markAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id, // ownership guard
    });

    if (!notification) return next(new AppError("Notification not found", 404));

    if (notification.status === "unread") {
      notification.status = "read";
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({ success: true, data: { notification } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/notifications/mark-all-read ───────────────────────────────────

export async function markAllRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const filter: Record<string, unknown> = { userId: req.user._id, status: "unread" };

    // Optionally scope to a specific category
    const category = req.body.category as NotificationCategory | undefined;
    if (category) filter.category = category;

    const result = await Notification.updateMany(filter, {
      $set: { status: "read", readAt: new Date() },
    });

    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/notifications/:id/archive ─────────────────────────────────────

export async function archiveNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) return next(new AppError("Notification not found", 404));

    notification.status = "archived";
    notification.archivedAt = new Date();
    await notification.save();

    res.json({ success: true, data: { notification } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/notifications/:id ────────────────────────────────────────────

export async function deleteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) return next(new AppError("Notification not found", 404));

    await notification.deleteOne();

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/notifications/preferences ───────────────────────────────────────
// Returns category preferences stored in the user document (or defaults).

export async function getPreferences(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    // Re-fetch the user so we have the notificationPreferences Map
    const { User } = await import("../models/User");
    const dbUser = await User.findById(req.user._id).select("notificationPreferences role").lean();

    let prefs: Record<string, boolean>;
    if (dbUser?.notificationPreferences && Object.keys(dbUser.notificationPreferences).length > 0) {
      // Mongoose Map serialised to plain object by .lean()
      prefs = dbUser.notificationPreferences as unknown as Record<string, boolean>;
    } else {
      prefs = getDefaultPreferences(req.user.role as string);
    }

    res.json({ success: true, data: { preferences: prefs } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/notifications/preferences ─────────────────────────────────────

export async function updatePreferences(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { preferences } = req.body as { preferences: Record<string, boolean> };
    if (!preferences || typeof preferences !== "object") {
      return next(new AppError("Invalid preferences payload", 400));
    }

    // Update using $set on the user document
    const { User } = await import("../models/User");
    await User.findByIdAndUpdate(req.user._id, {
      $set: { notificationPreferences: preferences },
    });

    res.json({ success: true, data: { preferences } });
  } catch (err) {
    next(err);
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDefaultPreferences(role: string): Record<string, boolean> {
  const base: Record<string, boolean> = {
    complaints: true,
    security: true,
    system: true,
  };

  if (role === "citizen") {
    return { ...base };
  }
  if (role === "authority") {
    return { ...base, assignments: true };
  }
  // administrator
  return {
    ...base,
    assignments: true,
    authorities: true,
    platform: true,
    environmental: true,
    ai: true,
  };
}
