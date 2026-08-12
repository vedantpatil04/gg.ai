import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { Complaint } from "../models/Complaint";
import { Alert } from "../models/Alert";
import { Report } from "../models/Report";
import { AIInsight } from "../models/AIInsight";
import { City } from "../models/City";
import { AppError } from "../middleware/errorHandler";
import { generateAdminSummary } from "../services/gemini.service";
import { triggerManualIngestion, getSchedulerStatus } from "../jobs/scheduler";
import { AuthRequest } from "../middleware/auth";
import { logger } from "../utils/logger";
import {
  notifyAuthorityApproved,
  notifyAuthorityRejected,
  notifyAuthorityRegistrationRequest,
} from "../services/notification.service";

export async function getPlatformStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [
      users,
      complaints,
      alerts,
      reports,
      readings,
      pendingAuthorityRequests,
      totalCities,
      openComplaints,
      criticalAlerts,
      latestReading,
      recentAuthorityRequests,
      recentCitizens,
      recentComplaints,
    ] = await Promise.all([
      User.countDocuments(),
      Complaint.countDocuments(),
      Alert.countDocuments({ status: "active" }),
      Report.countDocuments(),
      EnvironmentalData.countDocuments(),
      // ── Phase 2.2 Executive Dashboard additions ──────────────────────────
      User.countDocuments({ role: "authority", approvalStatus: "pending" }),
      City.countDocuments({ isActive: true }),
      Complaint.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
      Alert.countDocuments({ severity: "critical", status: "active" }),
      EnvironmentalData.findOne().sort({ timestamp: -1 }).select("timestamp").lean(),
      User.find({ role: "authority" })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name createdAt")
        .lean(),
      User.find({ role: "citizen" })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name createdAt")
        .lean(),
      Complaint.find().sort({ createdAt: -1 }).limit(3).select("title createdAt").lean(),
    ]);
    const usersByRole = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);

    // ── Platform Health — real, currently-observable signals only. No
    // synthetic failures, no invented percentages (Phase 2.2 spec: "Display
    // available information only. Do not fake failures or invent metrics.")
    const now = Date.now();
    const dataFeedMinutesAgo = latestReading
      ? Math.round(
          (now - new Date((latestReading as { timestamp: Date }).timestamp).getTime()) / 60000,
        )
      : null;
    // 120 min ≈ 4x the 30-minute ingestion interval — a forgiving buffer
    // before calling the feed "delayed" rather than reacting to normal jitter.
    const dataFeedStatus =
      dataFeedMinutesAgo === null
        ? "no-data"
        : dataFeedMinutesAgo <= 120
          ? "operational"
          : "delayed";

    const scheduler = getSchedulerStatus();
    const schedulerMinutesAgo = scheduler.lastRunAt
      ? Math.round((now - new Date(scheduler.lastRunAt).getTime()) / 60000)
      : null;

    const health = [
      // Reaching this line at all required a verified, authenticated admin
      // session and a successful set of database queries — both facts
      // below are direct, honest consequences of that, not assumptions.
      { name: "Authentication", status: "operational", detail: "Session verified" },
      { name: "Database", status: "operational", detail: "Queries responding" },
      {
        name: "Environmental Data Feed",
        status: dataFeedStatus,
        detail:
          dataFeedMinutesAgo === null
            ? "No readings recorded yet"
            : `Last reading ${dataFeedMinutesAgo}m ago`,
      },
      {
        name: "AI Services",
        status: process.env.GEMINI_API_KEY ? "operational" : "not-configured",
        detail: process.env.GEMINI_API_KEY ? "Gemini API key configured" : "GEMINI_API_KEY not set",
      },
      {
        name: "Scheduler",
        status: !scheduler.enabled ? "disabled" : "operational",
        detail: !scheduler.enabled
          ? "No ingestion API keys configured"
          : schedulerMinutesAgo === null
            ? "Enabled — awaiting first run"
            : `Last run ${schedulerMinutesAgo}m ago (${scheduler.lastRunResult?.success ?? 0} succeeded, ${scheduler.lastRunResult?.failed ?? 0} failed)`,
      },
    ];

    // ── Recent Activity — merged from real sources only (Authority access
    // requests, Citizen signups, Complaint submissions). There is no
    // persisted log of administrator actions yet (Phase 1.4 logging is
    // console-only, not a queryable audit trail — that's a future phase),
    // so it's simply omitted here rather than faked.
    const recentActivity = [
      ...recentAuthorityRequests.map((u) => ({
        text: `Authority access request from ${u.name}`,
        at: (u as { createdAt: Date }).createdAt,
      })),
      ...recentCitizens.map((u) => ({
        text: `New citizen registered: ${u.name}`,
        at: (u as { createdAt: Date }).createdAt,
      })),
      ...recentComplaints.map((c) => ({
        text: `New complaint submitted: ${c.title}`,
        at: (c as { createdAt: Date }).createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        // Existing fields — unchanged, kept for backward compatibility.
        users,
        complaints,
        activeAlerts: alerts,
        reports,
        dataReadings: readings,
        usersByRole,

        // Phase 2.2 — Executive Dashboard aggregate fields.
        pendingAuthorityRequests,
        totalUsers: users,
        cities: totalCities,
        openComplaints,
        criticalAlerts,
        platformStatus: "Operational",
        health,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/admin/ai-summary ────────────────────────────────────────────────
export async function getAISummary(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Check cache (2-hour TTL)
    const cached = await AIInsight.findOne({
      type: "admin_summary",
      expiresAt: { $gt: new Date() },
    }).lean();

    if (cached) {
      res.json({ success: true, data: { summary: cached.content, cached: true } });
      return;
    }

    // Gather stats
    const [totalUsers, activeAlerts, totalComplaints] = await Promise.all([
      User.countDocuments(),
      Alert.countDocuments({ status: "active" }),
      Complaint.countDocuments(),
    ]);

    // Get latest reading per city
    const cityDocs = await EnvironmentalData.aggregate([
      { $sort: { cityId: 1, timestamp: -1 } },
      { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    const cities = cityDocs.map((c) => ({ cityName: c.cityName, aqi: c.aqi, risk: c.risk }));
    const summary = await generateAdminSummary({
      totalUsers,
      activeAlerts,
      totalComplaints,
      cities,
    });

    await AIInsight.create({
      cityId: "platform",
      cityName: "Platform",
      type: "admin_summary",
      content: summary,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    res.json({ success: true, data: { summary, cached: false } });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const filter: Record<string, unknown> = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
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

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      { new: true },
    );
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: City Management ─────────────────────────────────────────────────

export async function listCities(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cities = await City.find({}).sort({ name: 1 }).lean();
    res.json({ success: true, data: { cities, total: cities.length } });
  } catch (err) {
    next(err);
  }
}

export async function addCity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId, name, country, lat, lng, timezone } = req.body;
    if (!cityId || !name || !country || lat === undefined || lng === undefined) {
      return next(new AppError("cityId, name, country, lat, lng are required", 400));
    }
    const existing = await City.findOne({ cityId: cityId.toLowerCase() });
    if (existing) return next(new AppError("City with this cityId already exists", 409));

    const city = await City.create({
      cityId: cityId.toLowerCase(),
      name,
      country,
      lat: Number(lat),
      lng: Number(lng),
      timezone: timezone || "UTC",
      active: true,
    });
    res.status(201).json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

export async function updateCity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, country, lat, lng, timezone, active } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (country !== undefined) update.country = country;
    if (lat !== undefined) update.lat = Number(lat);
    if (lng !== undefined) update.lng = Number(lng);
    if (timezone !== undefined) update.timezone = timezone;
    if (active !== undefined) update.active = Boolean(active);

    const city = await City.findByIdAndUpdate(id, update, { new: true });
    if (!city) return next(new AppError("City not found", 404));
    res.json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

export async function toggleCityActive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return next(new AppError("City not found", 404));
    city.isActive = !city.isActive;
    await city.save();
    res.json({ success: true, data: { city } });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: Manual ingestion trigger (admin only) ──────────────────────────
export async function triggerIngestion(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await triggerManualIngestion();
    if (result.total === -1) {
      res.json({ success: false, message: "Ingestion already running — try again shortly" });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 1.3: Authority Approval Workflow (backend readiness) ──────────────
// Backend infrastructure for the future Administrator Portal (Phase 2) — no
// Administrator UI is introduced here. Operates entirely on the existing
// User model's `approvalStatus` field (introduced in Phase 1.1); no new
// collection. All routes are mounted under the existing admin router, which
// already enforces `authenticate, authorize("administrator")` for every
// request — see admin.routes.ts.
//
// Every endpoint below scopes its query to `role: "authority"`. This is a
// deliberate, single mechanism that satisfies several validation rules at
// once: a citizen or administrator id simply won't match, so "approving a
// non-authority user" / "rejecting a citizen" / "rejecting an administrator"
// all naturally resolve to 404 rather than needing separate role checks.
//
// State transitions: both approve and reject require the request to
// currently be "pending" — this is the only precondition the spec's own
// Pending → Approved / Pending → Rejected diagrams describe. Re-approving an
// already-approved request, or re-rejecting an already-rejected one, is
// rejected with 409; so is approving a rejected request (or vice versa).
// Reversing a decision isn't implemented here (deferred — see Notes).

const AUTHORITY_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
type AuthorityApprovalStatus = (typeof AUTHORITY_APPROVAL_STATUSES)[number];

// ─── GET /api/admin/authority-requests?status=pending|approved|rejected ─────
export async function listAuthorityRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status } = req.query;
    if (
      status !== undefined &&
      !AUTHORITY_APPROVAL_STATUSES.includes(status as AuthorityApprovalStatus)
    ) {
      return next(
        new AppError(
          `Invalid status filter. Must be one of: ${AUTHORITY_APPROVAL_STATUSES.join(", ")}`,
          400,
        ),
      );
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const filter: Record<string, unknown> = { role: "authority" };
    if (status) filter.approvalStatus = status;

    const [requests, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/admin/authority-requests/:id ───────────────────────────────────
export async function getAuthorityRequestDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const request = await User.findOne({ _id: req.params.id, role: "authority" }).lean();
    if (!request) return next(new AppError("Authority request not found", 404));
    res.json({ success: true, data: { request } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/admin/authority-requests/:id/approve ─────────────────────────
export async function approveAuthorityRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const request = await User.findOne({ _id: req.params.id, role: "authority" });
    if (!request) return next(new AppError("Authority request not found", 404));

    if (request.approvalStatus !== "pending") {
      return next(
        new AppError(
          `This authority request is already ${request.approvalStatus} and cannot be approved.`,
          409,
        ),
      );
    }

    request.approvalStatus = "approved";
    if (!request.availability) {
      (request as unknown as { availability: string }).availability = "available";
    }
    if (!request.assignedCities) {
      (request as unknown as { assignedCities: string[] }).assignedCities = [];
    }
    await request.save();

    logger.info("[admin] Authority request approved", {
      authorityId: request._id.toString(),
      email: request.email,
      approvedBy: req.user?._id?.toString(),
    });

    res.json({
      success: true,
      message: "Authority account approved successfully.",
      data: { request },
    });

    // Phase 7 — notify the authority their account is approved
    await notifyAuthorityApproved(request._id).catch(() => {});
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/admin/authority-requests/:id/reject ───────────────────────────
export async function rejectAuthorityRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const request = await User.findOne({ _id: req.params.id, role: "authority" });
    if (!request) return next(new AppError("Authority request not found", 404));

    if (request.approvalStatus !== "pending") {
      return next(
        new AppError(
          `This authority request is already ${request.approvalStatus} and cannot be rejected.`,
          409,
        ),
      );
    }

    request.approvalStatus = "rejected";
    await request.save();

    logger.info("[admin] Authority request rejected", {
      authorityId: request._id.toString(),
      email: request.email,
      rejectedBy: req.user?._id?.toString(),
    });

    res.json({
      success: true,
      message: "Authority request rejected.",
      data: { request },
    });

    // Phase 7 — notify the authority their request was rejected
    await notifyAuthorityRejected(request._id).catch(() => {});
  } catch (err) {
    next(err);
  }
}

// ─── Phase 3B — Authority Workload ───────────────────────────────────────────

/**
 * GET /api/admin/workload
 *
 * Returns each active, approved authority account with a live count of
 * complaints currently assigned to them (pending + in-progress only — resolved
 * and rejected are no longer "open work"). Also returns the count of pending
 * complaints with no assignedTo so the admin can see backlog at a glance.
 *
 * Uses Promise.all over individual per-authority Complaint.countDocuments calls
 * rather than a single $facet aggregation — simpler, predictable, and fast
 * enough for the typical authority count (<50) of an env-ops platform.
 */
export async function getAuthorityWorkload(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorities = await User.find({
      role: "authority",
      isActive: true,
      approvalStatus: "approved",
    })
      .select("name email")
      .lean();

    const [workloads, unassigned] = await Promise.all([
      Promise.all(
        authorities.map(async (a) => {
          const [assignedPending, assignedActive] = await Promise.all([
            Complaint.countDocuments({ assignedTo: a._id, status: "pending" }),
            Complaint.countDocuments({ assignedTo: a._id, status: "in-progress" }),
          ]);
          return {
            _id: String(a._id),
            name: a.name,
            email: a.email,
            assignedPending,
            assignedActive,
            total: assignedPending + assignedActive,
          };
        }),
      ),
      // Unassigned = pending with no assignedTo (not yet touched by any authority)
      Complaint.countDocuments({
        assignedTo: { $exists: false },
        status: "pending",
      }),
    ]);

    res.json({ success: true, data: { workloads, unassigned } });
  } catch (err) {
    next(err);
  }
}
