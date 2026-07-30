/**
 * Phase 6 — Enterprise Platform Administration Controller
 *
 * Provides endpoints that don't already exist in admin.controller.ts:
 *  - Enhanced user management (search, lock/unlock)
 *  - Platform overview stats (executive dashboard)
 *  - Security overview per user
 *  - Platform configuration (read-only, env-derived)
 *  - Audit log (in-memory ring buffer)
 *
 * All existing admin APIs (/admin/users, /admin/cities, /admin/authority-requests,
 * /admin/stats, /admin/workload, /reports, /environmental) are reused
 * unchanged from the frontend.
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

// ─── In-memory audit ring (capped at 500 entries, session-scoped) ─────────────

export interface AuditEntry {
  id: string;
  who: string;
  whoId: string;
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
  AUDIT_RING.unshift({
    ...entry,
    id: new mongoose.Types.ObjectId().toString(),
    at: new Date(),
  });
  if (AUDIT_RING.length > AUDIT_MAX) AUDIT_RING.length = AUDIT_MAX;
}

function adminName(req: AuthRequest): string {
  return (req.user as { name?: string } | undefined)?.name ?? "Administrator";
}
function adminId(req: AuthRequest): string {
  return req.user?._id?.toString() ?? "";
}

// ─── GET /api/platform-admin/overview ────────────────────────────────────────

export async function getPlatformOverview(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [
      totalUsers, citizens, authorities, admins, activeUsers,
      totalCities, activeCities,
      totalComplaints, openComplaints, closedComplaints,
      activeAlerts, criticalAlerts,
      pendingAuthorities,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "authority", approvalStatus: "approved" }),
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

    const resolutionRate = totalComplaints > 0
      ? Math.round((closedComplaints / totalComplaints) * 100) : 0;

    const resTimeAgg = await Complaint.aggregate([
      { $match: { status: "closed", resolvedAt: { $exists: true } } },
      { $project: { days: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 86_400_000] } } },
      { $group: { _id: null, avg: { $avg: "$days" } } },
    ]);
    const avgResolutionDays = resTimeAgg.length > 0
      ? Math.round((resTimeAgg[0] as { avg: number }).avg) : null;

    const scheduler = getSchedulerStatus();
    const dbConnected = mongoose.connection.readyState === 1;
    const aiEnabled = !!process.env.GEMINI_API_KEY;

    const latestReading = await EnvironmentalData.findOne()
      .sort({ timestamp: -1 }).select("timestamp").lean();
    const dataFreshMinutes = latestReading
      ? Math.round((Date.now() - new Date((latestReading as { timestamp: Date }).timestamp).getTime()) / 60_000)
      : null;
    const dataFreshOk = dataFreshMinutes !== null && dataFreshMinutes <= 120;

    const insights: Array<{ type: "critical" | "warning" | "info"; message: string }> = [];
    if (criticalAlerts > 0) insights.push({ type: "critical", message: `${criticalAlerts} critical alert${criticalAlerts !== 1 ? "s" : ""} active.` });
    if (pendingAuthorities > 0) insights.push({ type: "warning", message: `${pendingAuthorities} authority registration${pendingAuthorities !== 1 ? "s" : ""} awaiting approval.` });
    if (openComplaints > 20) insights.push({ type: "warning", message: `${openComplaints} complaints open — workload may be elevated.` });
    if (!aiEnabled) insights.push({ type: "info", message: "AI services are not configured (GEMINI_API_KEY missing)." });
    if (!scheduler.enabled) insights.push({ type: "info", message: "Environmental scheduler is disabled — no ingestion keys configured." });
    if (dataFreshMinutes !== null && !dataFreshOk) insights.push({ type: "warning", message: `Environmental data is ${dataFreshMinutes}m old.` });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, citizens, authorities, admins, active: activeUsers },
        cities: { total: totalCities, active: activeCities },
        complaints: { total: totalComplaints, open: openComplaints, closed: closedComplaints, resolutionRate, avgResolutionDays },
        alerts: { active: activeAlerts, critical: criticalAlerts },
        pendingAuthorities,
        platform: { database: dbConnected, ai: aiEnabled, scheduler: scheduler.enabled, dataFreshOk, dataFreshMinutes },
        insights,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/platform-admin/users (enhanced — with search) ──────────────────

export async function listUsersEnhanced(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const search = (req.query.search as string || "").trim();
    const role = req.query.role as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;
    const isVerified = req.query.isVerified !== undefined ? req.query.isVerified === "true" : undefined;
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
    const sf = sortMap[sortBy] || "createdAt";

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sf]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -refreshTokens -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorPendingSecret -twoFactorBackupCodes")
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/platform-admin/users/:id ─────────────────────────────────────

export async function updateUserEnhanced(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Prevent self-demotion
    if (req.user?._id?.toString() === req.params.id && req.body.role && req.body.role !== "administrator") {
      return next(new AppError("Administrators cannot change their own role.", 400));
    }
    const allowed = ["isActive", "role"] as const;
    const update: Record<string, unknown> = {};
    for (const f of allowed) { if (req.body[f] !== undefined) update[f] = req.body[f]; }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("-password -refreshTokens").lean();
    if (!user) return next(new AppError("User not found", 404));

    pushAudit({ who: adminName(req), whoId: adminId(req), action: "user_updated", target: (user as { name?: string }).name ?? req.params.id, targetId: req.params.id, status: "success", detail: JSON.stringify(update) });
    logger.info("[platform-admin] user_updated", { id: req.params.id, update });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/platform-admin/users/:id/lock ─────────────────────────────────

export async function lockUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountLockedUntil: new Date(Date.now() + 24 * 3600 * 1000), failedLoginAttempts: 999 },
      { new: true },
    ).lean();
    if (!user) return next(new AppError("User not found", 404));
    pushAudit({ who: adminName(req), whoId: adminId(req), action: "account_locked", target: (user as { name?: string }).name ?? req.params.id, targetId: req.params.id, status: "success" });
    res.json({ success: true, message: "Account locked for 24 hours." });
  } catch (err) { next(err); }
}

// ─── POST /api/platform-admin/users/:id/unlock ───────────────────────────────

export async function unlockUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $unset: { accountLockedUntil: "" }, failedLoginAttempts: 0 },
      { new: true },
    ).lean();
    if (!user) return next(new AppError("User not found", 404));
    pushAudit({ who: adminName(req), whoId: adminId(req), action: "account_unlocked", target: (user as { name?: string }).name ?? req.params.id, targetId: req.params.id, status: "success" });
    res.json({ success: true, message: "Account unlocked." });
  } catch (err) { next(err); }
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
      .sort({ timestamp: -1 }).select("timestamp").lean();
    const dataFreshMinutes = latestReading
      ? Math.round((Date.now() - new Date((latestReading as { timestamp: Date }).timestamp).getTime()) / 60_000)
      : null;

    const totalMem = Math.round(os.totalmem() / 1_048_576);
    const freeMem = Math.round(os.freemem() / 1_048_576);
    const usedMem = totalMem - freeMem;
    const memPct = Math.round((usedMem / totalMem) * 100);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        database: { connected: dbConnected, state: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown" },
        aiEnabled,
        scheduler: { enabled: scheduler.enabled, running: scheduler.running, lastRunAt: scheduler.lastRunAt, lastRunResult: scheduler.lastRunResult },
        dataFreshMinutes,
        system: {
          uptimeSeconds: Math.round(process.uptime()),
          totalMemMb: totalMem, usedMemMb: usedMem, memUsedPct: memPct,
          loadAvg: os.platform() !== "win32" ? os.loadavg() : null,
          platform: os.platform(), nodeVersion: process.version,
        },
        services: [
          { name: "Backend API", status: "online", detail: "Express responding" },
          { name: "MongoDB", status: dbConnected ? "online" : "offline", detail: dbConnected ? "Connected" : "Disconnected" },
          { name: "AI (Gemini)", status: aiEnabled ? "online" : "unconfigured", detail: aiEnabled ? "GEMINI_API_KEY set" : "Key not configured" },
          { name: "Scheduler", status: scheduler.enabled ? "online" : "disabled", detail: scheduler.enabled ? `Last: ${scheduler.lastRunAt ?? "never"}` : "No ingestion keys" },
          {
            name: "Data Pipeline",
            status: dataFreshMinutes === null ? "no-data" : dataFreshMinutes <= 120 ? "online" : dataFreshMinutes <= 1440 ? "delayed" : "stale",
            detail: dataFreshMinutes === null ? "No readings" : `${dataFreshMinutes}m ago`,
          },
        ],
      },
    });
  } catch (err) { next(err); }
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
    const action = (req.query.action as string || "").trim();

    let entries = [...AUDIT_RING];
    if (search) entries = entries.filter(e => e.who.toLowerCase().includes(search) || e.action.includes(search) || e.target.toLowerCase().includes(search));
    if (action) entries = entries.filter(e => e.action === action);

    const total = entries.length;
    res.json({ success: true, data: { entries: entries.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
}

// ─── GET /api/platform-admin/config ──────────────────────────────────────────

export async function getPlatformConfig(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const scheduler = getSchedulerStatus();
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
          schedulerEnabled: scheduler.enabled,
          emailEnabled: !!process.env.SMTP_HOST,
          uploadsEnabled: true,
        },
        security: { sessionTimeoutDays: 7, maxFailedLogins: 5, accountLockMinutes: 15, twoFactorAvailable: true },
        complaints: {
          allowedIssueTypes: ["air_pollution", "water_contamination", "open_burning", "noise", "waste_dumping", "chemical_spill", "other"],
          severityLevels: ["low", "medium", "high", "critical"],
        },
      },
    });
  } catch (err) { next(err); }
}

// ─── GET /api/platform-admin/analytics ───────────────────────────────────────

export async function getPlatformAnalytics(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      complaintsByStatus,
      complaintsByCategory,
      complaintsByMonth,
      usersByRole,
      cityComplaintCounts,
    ] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: "$issueType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $group: { _id: "$cityId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Authority performance — resolution rate per authority
    const authorityPerf = await Complaint.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          closed: { $sum: { $cond: [{ $in: ["$status", ["closed", "resolved"]] }, 1, 0] } },
        },
      },
      { $addFields: { resolutionRate: { $cond: [{ $eq: ["$total", 0] }, 0, { $multiply: [{ $divide: ["$closed", "$total"] }, 100] }] } } },
      { $sort: { resolutionRate: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "authority",
        },
      },
      { $unwind: { path: "$authority", preserveNullAndEmptyArrays: true } },
      { $project: { name: "$authority.name", total: 1, closed: 1, resolutionRate: { $round: ["$resolutionRate", 0] } } },
    ]);

    res.json({
      success: true,
      data: {
        complaintsByStatus: (complaintsByStatus as Array<{ _id: string; count: number }>).map(d => ({ status: d._id, count: d.count })),
        complaintsByCategory: (complaintsByCategory as Array<{ _id: string; count: number }>).map(d => ({ issueType: d._id, count: d.count })),
        complaintsByMonth: (complaintsByMonth as Array<{ _id: { year: number; month: number }; count: number }>).map(d => ({ year: d._id.year, month: d._id.month, count: d.count })),
        usersByRole: (usersByRole as Array<{ _id: string; count: number }>).map(d => ({ role: d._id, count: d.count })),
        cityComplaintCounts: (cityComplaintCounts as Array<{ _id: string; count: number }>).map(d => ({ cityId: d._id, count: d.count })),
        authorityPerformance: authorityPerf,
      },
    });
  } catch (err) { next(err); }
}
