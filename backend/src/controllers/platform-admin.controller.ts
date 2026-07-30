/**
 * Phase 6 — Enterprise Platform Administration Controller
 *
 * All routes mounted under /api/platform-admin (administrator-only).
 * Reuses existing models (User, City, Complaint, Alert, EnvironmentalData).
 * No new schemas. No invented metrics.
 */

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import os from "os";
import { User } from "../models/User";
import { City } from "../models/City";
import { Complaint } from "../models/Complaint";
import { Alert } from "../models/Alert";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { getSchedulerStatus } from "../jobs/scheduler";
import { logger } from "../utils/logger";

// ─── In-memory audit log (append-only, capped at 500 entries) ────────────────
// A full persisted AuditLog collection is Phase 7+ territory. For Phase 6
// we keep a process-scoped ring-buffer so the Audit Center has real entries
// without introducing a new schema. Entries survive server restarts only when
// the process stays alive (dev/staging is fine; production should use a DB
// collection in Phase 8).

export interface AuditEntry {
  id: string;
  who: string;       // admin name
  whoId: string;     // admin _id
  action: string;
  target: string;
  targetId?: string;
  status: "success" | "failure";
  detail?: string;
  at: Date;
}

const AUDIT_RING: AuditEntry[] = [];
const AUDIT_MAX = 500;

export function pushAudit(entry: Omit<AuditEntry, "id" | "at">) {
  AUDIT_RING.unshift({ ...entry, id: new mongoose.Types.ObjectId().toString(), at: new Date() });
  if (AUDIT_RING.length > AUDIT_MAX) AUDIT_RING.length = AUDIT_MAX;
}

// ─── GET /api/platform-admin/executive-dashboard ─────────────────────────────

export async function getExecutiveDashboard(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [
      totalUsers,
      citizenCount,
      authorityCount,
      adminCount,
      activeUserCount,
      totalCities,
      activeCities,
      totalComplaints,
      openComplaints,
      closedComplaints,
      activeAlerts,
      criticalAlerts,
      pendingAuthorities,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "authority" }),
      User.countDocuments({ role: "administrator" }),
      User.countDocuments({ isActive: true }),
      City.countDocuments(),
      City.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: ["pending", "in-progress", "rework"] } }),
      Complaint.countDocuments({ status: "closed" }),
      Alert.countDocuments({ status: "active" }),
      Alert.countDocuments({ status: "active", severity: "critical" }),
      User.countDocuments({ role: "authority", approvalStatus: "pending" }),
    ]);

    // Resolution rate
    const resolutionRate =
      totalComplaints > 0 ? Math.round((closedComplaints / totalComplaints) * 100) : 0;

    // Avg resolution time (days, closed complaints only)
    const resolutionTimeAgg = await Complaint.aggregate([
      { $match: { status: "closed", resolvedAt: { $exists: true } } },
      {
        $project: {
          days: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 86400000] },
        },
      },
      { $group: { _id: null, avg: { $avg: "$days" } } },
    ]);
    const avgResolutionDays =
      resolutionTimeAgg.length > 0
        ? Math.round((resolutionTimeAgg[0] as { avg: number }).avg)
        : null;

    // Platform health signals
    const scheduler = getSchedulerStatus();
    const latestReading = await EnvironmentalData.findOne()
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean();

    const dbConnected = mongoose.connection.readyState === 1;
    const aiEnabled = !!process.env.GEMINI_API_KEY;
    const schedulerEnabled = scheduler.enabled;
    const dataFreshMinutes = latestReading
      ? Math.round((Date.now() - new Date((latestReading as { timestamp: Date }).timestamp).getTime()) / 60000)
      : null;
    const dataFreshOk = dataFreshMinutes !== null && dataFreshMinutes <= 120;

    // Operational insights from real data
    const insights: Array<{ type: "critical" | "warning" | "info"; message: string }> = [];
    if (criticalAlerts > 0)
      insights.push({ type: "critical", message: `${criticalAlerts} critical alert${criticalAlerts !== 1 ? "s" : ""} active across all cities.` });
    if (pendingAuthorities > 0)
      insights.push({ type: "warning", message: `${pendingAuthorities} authority registration${pendingAuthorities !== 1 ? "s" : ""} awaiting approval.` });
    if (openComplaints > 20)
      insights.push({ type: "warning", message: `${openComplaints} complaints are open — workload may be high.` });
    if (!aiEnabled)
      insights.push({ type: "info", message: "AI services are not configured (GEMINI_API_KEY missing)." });
    if (!schedulerEnabled)
      insights.push({ type: "info", message: "Environmental data ingestion is disabled — no API keys configured." });
    if (dataFreshMinutes !== null && !dataFreshOk)
      insights.push({ type: "warning", message: `Environmental data is ${dataFreshMinutes}m old — ingestion may be delayed.` });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, citizens: citizenCount, authorities: authorityCount, administrators: adminCount, active: activeUserCount },
        cities: { total: totalCities, active: activeCities },
        complaints: { total: totalComplaints, open: openComplaints, closed: closedComplaints, resolutionRate, avgResolutionDays },
        alerts: { active: activeAlerts, critical: criticalAlerts },
        pendingAuthorities,
        platformHealth: {
          database: dbConnected,
          ai: aiEnabled,
          scheduler: schedulerEnabled,
          dataFreshMinutes,
          dataFreshOk,
        },
        insights,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/users ───────────────────────────────────────────

export async function listUsersAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const search = (req.query.search as string || "").trim();
    const role = req.query.role as string | undefined;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === "true"
      : undefined;
    const isVerified = req.query.isVerified !== undefined
      ? req.query.isVerified === "true"
      : undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (isVerified !== undefined) filter.isVerified = isVerified;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const sortMap: Record<string, string> = { createdAt: "createdAt", name: "name", lastLogin: "lastLogin" };
    const sortField = sortMap[sortBy] || "createdAt";

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -refreshTokens -passwordResetToken -passwordResetExpires -failedLoginAttempts -accountLockedUntil -twoFactorSecret -twoFactorPendingSecret -twoFactorBackupCodes")
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/platform-admin/users/:id ─────────────────────────────────────

export async function updateUserAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allowed = ["isActive", "role"] as const;
    const update: Record<string, unknown> = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }

    // Prevent self-demotion
    if (req.user?._id?.toString() === req.params.id && update.role && update.role !== "administrator") {
      return next(new AppError("Administrators cannot change their own role.", 400));
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("-password -refreshTokens")
      .lean();
    if (!user) return next(new AppError("User not found", 404));

    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";
    pushAudit({
      who: adminName,
      whoId: req.user?._id?.toString() ?? "",
      action: "user_updated",
      target: (user as { name?: string }).name ?? req.params.id,
      targetId: req.params.id,
      status: "success",
      detail: JSON.stringify(update),
    });

    logger.info("[platform-admin] user_updated", { id: req.params.id, update });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/platform-admin/users/:id/lock ─────────────────────────────────

export async function lockUserAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountLockedUntil: new Date(Date.now() + 24 * 3600 * 1000), failedLoginAttempts: 999 },
      { new: true },
    ).lean();
    if (!user) return next(new AppError("User not found", 404));

    pushAudit({
      who: (req.user as { name?: string } | undefined)?.name ?? "Administrator",
      whoId: req.user?._id?.toString() ?? "",
      action: "account_locked",
      target: (user as { name?: string }).name ?? req.params.id,
      targetId: req.params.id,
      status: "success",
    });
    res.json({ success: true, message: "Account locked for 24 hours." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/platform-admin/users/:id/unlock ───────────────────────────────

export async function unlockUserAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $unset: { accountLockedUntil: "" }, failedLoginAttempts: 0 },
      { new: true },
    ).lean();
    if (!user) return next(new AppError("User not found", 404));

    pushAudit({
      who: (req.user as { name?: string } | undefined)?.name ?? "Administrator",
      whoId: req.user?._id?.toString() ?? "",
      action: "account_unlocked",
      target: (user as { name?: string }).name ?? req.params.id,
      targetId: req.params.id,
      status: "success",
    });
    res.json({ success: true, message: "Account unlocked." });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/cities ──────────────────────────────────────────

export async function listCitiesAdmin(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cities = await City.find({}).sort({ name: 1 }).lean();

    // Enrich each city with real complaint + alert counts
    const enriched = await Promise.all(
      cities.map(async (c) => {
        const [complaintCount, alertCount, authorityCount] = await Promise.all([
          Complaint.countDocuments({ cityId: c.cityId }),
          Alert.countDocuments({ cityId: c.cityId, status: "active" }),
          User.countDocuments({ role: "authority", assignedCities: c.cityId }),
        ]);
        return { ...c, complaintCount, alertCount, authorityCount };
      }),
    );

    res.json({ success: true, data: { cities: enriched, total: enriched.length } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/platform-admin/cities ─────────────────────────────────────────

export async function createCityAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId, name, country, lat, lng, timezone } = req.body;
    if (!cityId || !name || !country || lat === undefined || lng === undefined) {
      return next(new AppError("cityId, name, country, lat, lng are required", 400));
    }
    const existing = await City.findOne({ cityId: cityId.toLowerCase() });
    if (existing) return next(new AppError("A city with this ID already exists.", 409));

    const city = await City.create({
      cityId: cityId.toLowerCase().trim(),
      name: name.trim(),
      country: country.trim(),
      lat: Number(lat),
      lng: Number(lng),
      timezone: timezone || "UTC",
      isActive: true,
    });

    pushAudit({
      who: (req.user as { name?: string } | undefined)?.name ?? "Administrator",
      whoId: req.user?._id?.toString() ?? "",
      action: "city_created",
      target: name,
      targetId: city._id.toString(),
      status: "success",
    });

    res.status(201).json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/platform-admin/cities/:id ────────────────────────────────────

export async function updateCityAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allowed = ["name", "country", "lat", "lng", "timezone", "isActive"] as const;
    const update: Record<string, unknown> = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }

    const city = await City.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!city) return next(new AppError("City not found", 404));

    pushAudit({
      who: (req.user as { name?: string } | undefined)?.name ?? "Administrator",
      whoId: req.user?._id?.toString() ?? "",
      action: "city_updated",
      target: (city as { name?: string }).name ?? req.params.id,
      targetId: req.params.id,
      status: "success",
      detail: JSON.stringify(update),
    });

    res.json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/platform-admin/cities/:id/toggle ─────────────────────────────

export async function toggleCityAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return next(new AppError("City not found", 404));
    city.isActive = !city.isActive;
    await city.save();

    pushAudit({
      who: (req.user as { name?: string } | undefined)?.name ?? "Administrator",
      whoId: req.user?._id?.toString() ?? "",
      action: city.isActive ? "city_activated" : "city_deactivated",
      target: city.name,
      targetId: city._id.toString(),
      status: "success",
    });

    res.json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/audit ───────────────────────────────────────────

export async function getAuditLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const search = (req.query.search as string || "").trim().toLowerCase();
    const actionFilter = (req.query.action as string || "").trim();

    let entries = [...AUDIT_RING];
    if (search) {
      entries = entries.filter(
        (e) =>
          e.who.toLowerCase().includes(search) ||
          e.action.toLowerCase().includes(search) ||
          e.target.toLowerCase().includes(search),
      );
    }
    if (actionFilter) {
      entries = entries.filter((e) => e.action === actionFilter);
    }

    const total = entries.length;
    const page_entries = entries.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: {
        entries: page_entries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/system-health ───────────────────────────────────

export async function getSystemHealth(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1;

    const scheduler = getSchedulerStatus();
    const aiEnabled = !!process.env.GEMINI_API_KEY;

    const latestReading = await EnvironmentalData.findOne()
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean();

    const dataFreshMinutes = latestReading
      ? Math.round((Date.now() - new Date((latestReading as { timestamp: Date }).timestamp).getTime()) / 60000)
      : null;

    // OS-level metrics (only what Node.js exposes without native addons)
    const totalMemMb = Math.round(os.totalmem() / 1048576);
    const freeMemMb = Math.round(os.freemem() / 1048576);
    const usedMemMb = totalMemMb - freeMemMb;
    const memUsedPct = Math.round((usedMemMb / totalMemMb) * 100);

    const uptimeSeconds = Math.round(process.uptime());

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        database: {
          connected: dbConnected,
          state: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown",
        },
        aiEnabled,
        scheduler: {
          enabled: scheduler.enabled,
          running: scheduler.running,
          lastRunAt: scheduler.lastRunAt,
          lastRunResult: scheduler.lastRunResult,
        },
        dataFreshMinutes,
        system: {
          uptimeSeconds,
          totalMemMb,
          usedMemMb,
          memUsedPct,
          // CPU load: only available on non-Windows, single snapshot
          loadAvg: os.platform() !== "win32" ? os.loadavg() : null,
          platform: os.platform(),
          nodeVersion: process.version,
        },
        services: [
          { name: "Backend API", status: "online", detail: "Express server responding" },
          {
            name: "MongoDB",
            status: dbConnected ? "online" : "offline",
            detail: dbConnected ? "Connected" : "Disconnected",
          },
          {
            name: "AI Service (Gemini)",
            status: aiEnabled ? "online" : "unconfigured",
            detail: aiEnabled ? "GEMINI_API_KEY present" : "GEMINI_API_KEY not set",
          },
          {
            name: "Ingestion Scheduler",
            status: scheduler.enabled ? "online" : "disabled",
            detail: scheduler.enabled
              ? `Last run: ${scheduler.lastRunAt ?? "not yet"}`
              : "No ingestion keys configured",
          },
          {
            name: "Environmental Pipeline",
            status:
              dataFreshMinutes === null
                ? "no-data"
                : dataFreshMinutes <= 120
                  ? "online"
                  : dataFreshMinutes <= 1440
                    ? "delayed"
                    : "stale",
            detail:
              dataFreshMinutes === null
                ? "No readings ingested yet"
                : `Last reading ${dataFreshMinutes}m ago`,
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/config ──────────────────────────────────────────
// Read-only view of observable platform configuration (env-derived, no DB).

export async function getPlatformConfig(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const schedulerStatus = getSchedulerStatus();
    res.json({
      success: true,
      data: {
        platform: {
          name: "GreenGuard AI",
          environment: process.env.NODE_ENV ?? "development",
          version: process.env.npm_package_version ?? "1.0.0",
          frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
          port: process.env.PORT ?? "5000",
        },
        features: {
          aiEnabled: !!process.env.GEMINI_API_KEY,
          schedulerEnabled: schedulerStatus.enabled,
          emailEnabled: !!process.env.SMTP_HOST,
          uploadsEnabled: true,
        },
        security: {
          sessionTimeoutDays: 7,
          maxFailedLogins: 5,
          accountLockMinutes: 15,
          twoFactorAvailable: true,
        },
        complaints: {
          allowedIssueTypes: [
            "air_pollution",
            "water_contamination",
            "open_burning",
            "noise",
            "waste_dumping",
            "chemical_spill",
            "other",
          ],
          severityLevels: ["low", "medium", "high", "critical"],
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
