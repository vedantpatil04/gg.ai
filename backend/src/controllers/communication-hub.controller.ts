/**
 * Administrator Communication Hub — controller
 *
 * Admin-only surface over the four existing communication models
 * (SupportTicket, BugReport, FeatureRequest, Feedback). No new models, no
 * parallel data store — every handler here reads/writes the same
 * collections support.controller.ts already uses for the citizen side.
 *
 * Workflow is intentionally simple and uniform across all four types:
 *   Receive → Review (list/detail, marks adminRead) → Reply → Resolve → Reopen
 * There is no assignment/team/escalation workflow by design.
 */

import { Response, NextFunction } from "express";
import mongoose, { Model } from "mongoose";
import { SupportTicket }  from "../models/SupportTicket";
import { BugReport }      from "../models/BugReport";
import { FeatureRequest } from "../models/FeatureRequest";
import { Feedback }       from "../models/Feedback";
import { Notification }   from "../models/Notification";
import { User }           from "../models/User";
import { AppError }       from "../middleware/errorHandler";
import { AuthRequest }    from "../middleware/auth";
import {
  notifySupportReply,
  notifySupportResolved,
  notifySupportReopened,
  notifyEmergencyBroadcast,
  type SupportItemType,
} from "../services/notification.service";
import type { NotificationRecipientRole, NotificationPriority } from "../models/Notification";

// ─── Type registry ──────────────────────────────────────────────────────────
// URL segment ("tickets") <-> Mongoose model <-> notification SupportItemType
// ("ticket"). Kept in one small table so every handler below stays generic
// instead of four near-duplicate controllers.

type TypeKey = "tickets" | "bugs" | "features" | "feedback";

const MODEL_MAP: Record<TypeKey, Model<any>> = {
  tickets:  SupportTicket,
  bugs:     BugReport,
  features: FeatureRequest,
  feedback: Feedback,
};

const ITEM_TYPE_MAP: Record<TypeKey, SupportItemType> = {
  tickets: "ticket", bugs: "bug", features: "feature", feedback: "feedback",
};

// The set of statuses each model treats as "terminal" (resolved-like) for
// Overview counting. "reopened" is tracked separately and is the same
// literal value across all four models.
const TERMINAL_STATUSES: Record<TypeKey, string[]> = {
  tickets:  ["resolved", "closed"],
  bugs:     ["fixed", "wontfix", "resolved"],
  features: ["shipped", "declined", "resolved"],
  feedback: ["resolved"],
};

function parseType(typeParam: string): TypeKey | null {
  return (["tickets", "bugs", "features", "feedback"] as const).includes(typeParam as TypeKey)
    ? (typeParam as TypeKey)
    : null;
}

function getItemTitle(type: TypeKey, doc: any): string {
  if (type === "tickets")  return doc.subject;
  if (type === "feedback") return doc.category; // Feedback has no title/subject field
  return doc.title; // bugs, features
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchFilter(type: TypeKey, search: string): Record<string, unknown> {
  const re = new RegExp(escapeRegex(search.trim()), "i");

  let textFilters: Record<string, unknown>[];
  if (type === "tickets") textFilters = [{ subject: re }, { description: re }, { category: re }];
  else if (type === "bugs") textFilters = [{ title: re }, { category: re }, { steps: re }];
  else if (type === "features") textFilters = [{ title: re }, { description: re }, { category: re }];
  else textFilters = [{ category: re }, { comment: re }];

  // Also match by reference ID (the last-6/8 hex chars shown as "#REF" in the UI)
  // or a full Mongo ObjectId pasted in directly.
  if (mongoose.Types.ObjectId.isValid(search.trim()) && search.trim().length === 24) {
    return { $or: [...textFilters, { _id: new mongoose.Types.ObjectId(search.trim()) }] };
  }
  if (/^[0-9a-fA-F]{4,24}$/.test(search.trim())) {
    return {
      $or: [
        ...textFilters,
        { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: escapeRegex(search.trim()), options: "i" } } },
      ],
    };
  }
  return { $or: textFilters };
}

/** All active administrator IDs — used when fanning out reopened-by-citizen
 *  alerts (not currently reachable from this admin-only controller, kept
 *  here for symmetry with support.controller.ts's identical helper). */
async function getAdminIds(): Promise<mongoose.Types.ObjectId[]> {
  const admins = await User.find({ role: "administrator", isActive: true }).select("_id").lean();
  return admins.map(a => a._id as mongoose.Types.ObjectId);
}

// ─── GET /api/admin/communication/overview ────────────────────────────────────

export async function getOverview(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const types: TypeKey[] = ["tickets", "bugs", "features", "feedback"];

    const perType = await Promise.all(
      types.map(async (type) => {
        const Model_ = MODEL_MAP[type];
        const [total, resolved, reopened, unread, fresh] = await Promise.all([
          Model_.countDocuments({}),
          Model_.countDocuments({ status: { $in: TERMINAL_STATUSES[type] } }),
          Model_.countDocuments({ status: "reopened" }),
          Model_.countDocuments({ adminRead: { $ne: true } }),
          Model_.countDocuments({ createdAt: { $gte: since24h } }),
        ]);
        const open = Math.max(0, total - resolved - reopened);
        return { type, total, open, resolved, reopened, unread, new: fresh };
      }),
    );

    const totals = perType.reduce(
      (acc, t) => ({
        total:    acc.total + t.total,
        open:     acc.open + t.open,
        resolved: acc.resolved + t.resolved,
        reopened: acc.reopened + t.reopened,
        unread:   acc.unread + t.unread,
        new:      acc.new + t.new,
      }),
      { total: 0, open: 0, resolved: 0, reopened: 0, unread: 0, new: 0 },
    );

    // Recent activity strip — latest 8 across all four types, newest first.
    const recentPerType = await Promise.all(
      types.map(async (type) => {
        const docs = await MODEL_MAP[type]
          .find({})
          .sort({ updatedAt: -1 })
          .limit(8)
          .populate("submittedBy", "name email")
          .lean();
        return docs.map((d: any) => ({
          _id: d._id.toString(),
          type,
          title: getItemTitle(type, d),
          status: d.status,
          submittedBy: d.submittedBy ? { name: d.submittedBy.name, email: d.submittedBy.email } : null,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
      }),
    );
    const recent = recentPerType
      .flat()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);

    res.json({ success: true, data: { totals, byType: perType, recent } });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/communication/:type ───────────────────────────────────────

export async function listCommunications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const type = parseType(req.params.type);
    if (!type) return next(new AppError("Unknown communication type", 400));

    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    let filter: Record<string, unknown> = {};

    const status = req.query.status as string | undefined;
    if (status && status !== "all") filter.status = status;

    const unread = req.query.unread as string | undefined;
    if (unread === "true")  filter.adminRead = { $ne: true };
    if (unread === "false") filter.adminRead = true;

    const search = req.query.search as string | undefined;
    if (search && search.trim()) {
      filter = { ...filter, ...buildSearchFilter(type, search) };
    }

    const sortOrder = req.query.sort === "oldest" ? 1 : -1;

    const [items, total] = await Promise.all([
      MODEL_MAP[type]
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("submittedBy", "name email")
        .lean(),
      MODEL_MAP[type].countDocuments(filter),
    ]);

    const shaped = items.map((d: any) => ({
      _id: d._id.toString(),
      title: getItemTitle(type, d),
      status: d.status,
      adminRead: d.adminRead ?? false,
      submittedBy: d.submittedBy ? { _id: d.submittedBy._id, name: d.submittedBy.name, email: d.submittedBy.email } : null,
      commentCount: Array.isArray(d.comments) ? d.comments.length : 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      // Type-specific extras the list view may want without a second round trip
      priority: d.priority,
      severity: d.severity,
      category: d.category,
      voteCount: d.voteCount,
    }));

    res.json({
      success: true,
      data: { type, items: shaped, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/communication/:type/:id ───────────────────────────────────

export async function getCommunicationDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const type = parseType(req.params.type);
    if (!type) return next(new AppError("Unknown communication type", 400));
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new AppError("Invalid ID", 400));

    const item = await MODEL_MAP[type].findById(req.params.id).populate("submittedBy", "name email role");
    if (!item) return next(new AppError("Communication not found", 404));

    if (!item.adminRead) {
      item.adminRead = true;
      await item.save();
    }

    res.json({ success: true, data: { type, item } });
  } catch (err) { next(err); }
}

// ─── POST /api/admin/communication/:type/:id/reply ────────────────────────────

export async function replyToCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const type = parseType(req.params.type);
    if (!type) return next(new AppError("Unknown communication type", 400));

    const body = (req.body?.body as string | undefined)?.trim();
    if (!body || body.length < 1 || body.length > 2000) {
      return next(new AppError("Reply must be 1–2000 characters", 400));
    }

    const item = await MODEL_MAP[type].findById(req.params.id);
    if (!item) return next(new AppError("Communication not found", 404));

    item.comments.push({
      body,
      authorId:   req.user._id,
      authorName: req.user.name ?? "Administrator",
      authorRole: "administrator",
      isSystem:   false,
      createdAt:  new Date(),
    });
    item.adminRead = true;
    await item.save();

    await notifySupportReply(
      item.submittedBy as mongoose.Types.ObjectId, ITEM_TYPE_MAP[type], (item._id as mongoose.Types.ObjectId).toString(), getItemTitle(type, item),
    );

    res.json({ success: true, data: { type, item } });
  } catch (err) { next(err); }
}

// ─── POST /api/admin/communication/:type/:id/resolve ──────────────────────────

export async function resolveCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const type = parseType(req.params.type);
    if (!type) return next(new AppError("Unknown communication type", 400));

    const item = await MODEL_MAP[type].findById(req.params.id);
    if (!item) return next(new AppError("Communication not found", 404));

    item.status = "resolved";
    item.comments.push({
      body: "Marked as resolved by administrator.",
      authorId:   req.user._id,
      authorName: req.user.name ?? "Administrator",
      authorRole: "administrator",
      isSystem:   true,
      createdAt:  new Date(),
    });
    item.adminRead = true;
    await item.save();

    await notifySupportResolved(
      item.submittedBy as mongoose.Types.ObjectId, ITEM_TYPE_MAP[type], (item._id as mongoose.Types.ObjectId).toString(), getItemTitle(type, item),
    );

    res.json({ success: true, data: { type, item } });
  } catch (err) { next(err); }
}

// ─── POST /api/admin/communication/:type/:id/reopen ───────────────────────────

export async function reopenCommunication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const type = parseType(req.params.type);
    if (!type) return next(new AppError("Unknown communication type", 400));

    const item = await MODEL_MAP[type].findById(req.params.id);
    if (!item) return next(new AppError("Communication not found", 404));

    item.status = "reopened";
    item.comments.push({
      body: "Reopened by administrator.",
      authorId:   req.user._id,
      authorName: req.user.name ?? "Administrator",
      authorRole: "administrator",
      isSystem:   true,
      createdAt:  new Date(),
    });
    item.adminRead = true;
    await item.save();

    await notifySupportReopened(
      ITEM_TYPE_MAP[type], (item._id as mongoose.Types.ObjectId).toString(), getItemTitle(type, item),
      /* reopenedByAdmin */ true,
      item.submittedBy as mongoose.Types.ObjectId,
      [],
    );

    res.json({ success: true, data: { type, item } });
  } catch (err) { next(err); }
}

// ─── Emergency broadcast ────────────────────────────────────────────────────

const EMERGENCY_AUDIENCES = ["all", "citizen", "authority", "administrator"] as const;
type EmergencyAudience = (typeof EMERGENCY_AUDIENCES)[number];

export async function sendEmergencyBroadcast(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const title    = (req.body?.title as string | undefined)?.trim();
    const message  = (req.body?.message as string | undefined)?.trim();
    const severity = req.body?.severity as NotificationPriority | undefined;
    const audience = req.body?.audience as EmergencyAudience | undefined;

    if (!title || title.length < 3 || title.length > 200) {
      return next(new AppError("Title must be 3–200 characters", 400));
    }
    if (!message || message.length < 5 || message.length > 1000) {
      return next(new AppError("Message must be 5–1000 characters", 400));
    }
    if (!severity || !["low", "medium", "high", "critical"].includes(severity)) {
      return next(new AppError("Invalid severity", 400));
    }
    if (!audience || !EMERGENCY_AUDIENCES.includes(audience)) {
      return next(new AppError("Invalid audience", 400));
    }

    const roles: NotificationRecipientRole[] =
      audience === "all" ? ["citizen", "authority", "administrator"] : [audience];

    const users = await User.find({ role: { $in: roles }, isActive: true }).select("_id role").lean();
    if (users.length === 0) {
      return next(new AppError("No matching recipients found for this audience", 400));
    }

    const broadcastId = new mongoose.Types.ObjectId().toString();
    const recipients = users.map(u => ({
      userId: u._id as mongoose.Types.ObjectId,
      role: u.role as NotificationRecipientRole,
    }));

    await notifyEmergencyBroadcast(recipients, broadcastId, title, message, severity);

    res.status(201).json({
      success: true,
      data: { broadcastId, recipientCount: recipients.length, audience, severity },
    });
  } catch (err) { next(err); }
}

export async function getEmergencyHistory(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await Notification.aggregate([
      { $match: { entityType: "platform", category: "platform", title: { $regex: "^Emergency Alert:" } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$entityId",
          title: { $first: "$title" },
          summary: { $first: "$summary" },
          priority: { $first: "$priority" },
          createdAt: { $first: "$createdAt" },
          recipientCount: { $sum: 1 },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, data: { history: rows } });
  } catch (err) { next(err); }
}

// Exported for reuse by index/route wiring if ever needed elsewhere.
export { getAdminIds as getCommunicationHubAdminIds };
