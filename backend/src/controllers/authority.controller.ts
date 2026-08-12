/**
 * Phase 4 — Enterprise Authority Management Controller
 *
 * All routes are admin-only (enforced at router level via authenticate +
 * authorize("administrator")). This controller is separate from
 * admin.controller.ts to keep concerns clean and avoid touching existing
 * working endpoints.
 */

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Complaint } from "../models/Complaint";
import { City } from "../models/City";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { logger } from "../utils/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function appendLifecycleEvent(
  user: InstanceType<typeof User> & { lifecycleEvents?: Array<{ event: string; description: string; performedBy?: string; performedByName?: string; at: Date }> },
  event: string,
  description: string,
  adminId?: string,
  adminName?: string,
) {
  if (!user.lifecycleEvents) user.lifecycleEvents = [];
  user.lifecycleEvents.push({
    event,
    description,
    performedBy: adminId,
    performedByName: adminName,
    at: new Date(),
  });
}

// Validate that every requested city id refers to a real, active GreenGuard
// city (the existing City model — the single supported-city source of
// truth). Smart Routing jurisdiction (`User.assignedCities`) must only ever
// be set to values that exist in this collection, never arbitrary
// admin-typed strings. Returns the normalized (lowercased) city ids on
// success, or null if any requested id is invalid/unsupported.
async function validateCityIds(cities: string[]): Promise<string[] | null> {
  const normalized = cities.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return null;
  const found = await City.find({ cityId: { $in: normalized }, isActive: true }).select("cityId").lean();
  const foundIds = new Set(found.map((c) => c.cityId));
  return normalized.every((c) => foundIds.has(c)) ? normalized : null;
}

// Derive capacity label from active complaint count
function capacityLabel(active: number): "free" | "moderate" | "busy" | "overloaded" {
  if (active === 0) return "free";
  if (active <= 5) return "moderate";
  if (active <= 10) return "busy";
  return "overloaded";
}

// ─── GET /api/admin/authorities ──────────────────────────────────────────────
/**
 * Enterprise authority directory with search, filter, sort, and workload.
 */
export async function listAuthorities(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const search = (req.query.search as string || "").trim();
    const statusFilter = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy as string) || "name";
    const sortDir = req.query.sortDir === "desc" ? -1 : 1;
    const cityFilter = req.query.city as string | undefined;
    const availabilityFilter = req.query.availability as string | undefined;

    // Build base filter — always authority role
    const filter: Record<string, unknown> = { role: "authority" };

    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    if (cityFilter) filter.assignedCities = cityFilter;
    if (availabilityFilter) filter.availability = availabilityFilter;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { organization: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { specializations: { $regex: search, $options: "i" } },
      ];
    }

    // Status composite filter
    if (statusFilter === "active") { filter.isActive = true; filter.approvalStatus = "approved"; }
    else if (statusFilter === "inactive") filter.isActive = false;
    else if (statusFilter === "overloaded") { filter.isActive = true; filter.approvalStatus = "approved"; }
    // overloaded resolved post-query

    const sortMap: Record<string, string> = {
      name: "name",
      joinedDate: "createdAt",
      lastActive: "lastLogin",
    };
    const sortField = sortMap[sortBy] || "name";

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -refreshTokens -passwordResetToken -passwordResetExpires -failedLoginAttempts -accountLockedUntil -twoFactorSecret -twoFactorPendingSecret -twoFactorBackupCodes")
        .lean(),
      User.countDocuments(filter),
    ]);

    // Enrich with live complaint workload
    const enriched = await Promise.all(
      users.map(async (u) => {
        const uid = u._id as mongoose.Types.ObjectId;
        const [active, pending, rework, resolved, closed] = await Promise.all([
          Complaint.countDocuments({ assignedTo: uid, status: "in-progress" }),
          Complaint.countDocuments({ assignedTo: uid, status: "pending" }),
          Complaint.countDocuments({ assignedTo: uid, status: "rework" }),
          Complaint.countDocuments({ assignedTo: uid, status: "resolved" }),
          Complaint.countDocuments({ assignedTo: uid, status: "closed" }),
        ]);
        const totalAssigned = active + pending + rework + resolved + closed;
        const totalClosed = resolved + closed;
        const resolutionRate = totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0;
        const capacity = capacityLabel(active + rework);

        return {
          ...u,
          assignedCities: Array.isArray((u as { assignedCities?: string[] }).assignedCities) ? (u as { assignedCities?: string[] }).assignedCities : [],
          specializations: Array.isArray((u as { specializations?: string[] }).specializations) ? (u as { specializations?: string[] }).specializations : [],
          workload: {
            active,
            pending,
            rework,
            resolved,
            closed,
            total: totalAssigned,
            capacity,
            resolutionRate,
          },
        };
      }),
    );

    res.json({
      success: true,
      data: {
        authorities: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/admin/authorities/:id ──────────────────────────────────────────
export async function getAuthorityDetail(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authority = await User.findOne({ _id: req.params.id, role: "authority" })
      .select("+lifecycleEvents")
      .lean();
    if (!authority) return next(new AppError("Authority not found", 404));

    const uid = authority._id as mongoose.Types.ObjectId;
    const [active, pending, rework, resolved, closed, verificationWaiting] = await Promise.all([
      Complaint.countDocuments({ assignedTo: uid, status: "in-progress" }),
      Complaint.countDocuments({ assignedTo: uid, status: "pending" }),
      Complaint.countDocuments({ assignedTo: uid, status: "rework" }),
      Complaint.countDocuments({ assignedTo: uid, status: "resolved" }),
      Complaint.countDocuments({ assignedTo: uid, status: "closed" }),
      Complaint.countDocuments({ assignedTo: uid, status: "resolved" }), // awaiting admin verify
    ]);

    const totalAssigned = active + pending + rework + resolved + closed;
    const totalClosed = resolved + closed;
    const resolutionRate = totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0;
    const reworkRate = totalAssigned > 0 ? Math.round((rework / totalAssigned) * 100) : 0;
    const capacity = capacityLabel(active + rework);

    // Per-city complaint volumes for assigned cities
    const cityVolumes: Record<string, number> = {};
    if ((authority as { assignedCities?: string[] }).assignedCities?.length) {
      const cityComplaints = await Complaint.aggregate([
        { $match: { assignedTo: uid } },
        { $group: { _id: "$cityId", count: { $sum: 1 } } },
      ]);
      for (const c of cityComplaints) {
        cityVolumes[c._id as string] = c.count as number;
      }
    }

    res.json({
      success: true,
      data: {
        authority: {
          ...authority,
          assignedCities: Array.isArray((authority as { assignedCities?: string[] }).assignedCities)
            ? (authority as { assignedCities?: string[] }).assignedCities
            : [],
          specializations: Array.isArray((authority as { specializations?: string[] }).specializations)
            ? (authority as { specializations?: string[] }).specializations
            : [],
        },
        workload: {
          active,
          pending,
          rework,
          resolved,
          closed,
          verificationWaiting,
          total: totalAssigned,
          capacity,
          resolutionRate,
          reworkRate,
        },
        cityVolumes,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/admin/authorities/:id ────────────────────────────────────────
/**
 * Update authority profile fields (designation, department, specializations,
 * availability, employeeId, etc.). Does NOT handle city assignment (separate
 * endpoint) or lifecycle (separate endpoint).
 */
export async function updateAuthorityProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allowed = [
      "department",
      "designation",
      "employeeId",
      "specializations",
      "availability",
      "organization",
      "phone",
    ] as const;

    const update: Record<string, unknown> = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    const authority = await User.findOneAndUpdate(
      { _id: req.params.id, role: "authority" },
      update,
      { new: true },
    ).lean();

    if (!authority) return next(new AppError("Authority not found", 404));
    res.json({ success: true, data: { authority } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/admin/authorities/:id/cities ──────────────────────────────────
export async function assignCities(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cities, primaryCity } = req.body as { cities: string[]; primaryCity?: string };
    if (!Array.isArray(cities) || cities.length === 0) {
      return next(new AppError("cities array is required", 400));
    }

    // Jurisdiction is a governance decision — only real, active GreenGuard
    // cities may become Smart Routing jurisdiction. Reject unsupported ids
    // instead of silently trusting admin-typed text.
    const validCities = await validateCityIds(cities);
    if (!validCities) {
      return next(new AppError("One or more cities are not valid, active GreenGuard cities", 400));
    }
    if (primaryCity && !validCities.includes(String(primaryCity).trim().toLowerCase())) {
      return next(new AppError("primaryCity must be one of the assigned cities", 400));
    }

    const authority = await User.findOne({ _id: req.params.id, role: "authority" }).select("+lifecycleEvents");
    if (!authority) return next(new AppError("Authority not found", 404));

    const newCities = validCities.filter(
      (c) => !(authority as unknown as { assignedCities: string[] }).assignedCities.includes(c),
    );

    // Use $addToSet to prevent duplicates
    const updateOp: Record<string, unknown> = { $addToSet: { assignedCities: { $each: validCities } } };
    if (primaryCity) (updateOp as Record<string, unknown>).$set = { primaryCity: primaryCity.trim().toLowerCase() };

    await User.updateOne({ _id: authority._id }, updateOp);

    // Log lifecycle event
    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";
    const adminId = req.user?._id?.toString();
    appendLifecycleEvent(
      authority as Parameters<typeof appendLifecycleEvent>[0],
      "cities_assigned",
      `Assigned cities: ${newCities.join(", ")}${primaryCity ? ` (primary: ${primaryCity})` : ""}`,
      adminId,
      adminName,
    );
    await (authority as unknown as { save: () => Promise<void> }).save();

    const updated = await User.findById(authority._id).lean();
    res.json({ success: true, data: { authority: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/admin/authorities/:id/cities ────────────────────────────────
export async function removeCities(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cities } = req.body as { cities: string[] };
    if (!Array.isArray(cities) || cities.length === 0) {
      return next(new AppError("cities array is required", 400));
    }

    const authority = await User.findOne({ _id: req.params.id, role: "authority" }).select("+lifecycleEvents");
    if (!authority) return next(new AppError("Authority not found", 404));

    const typedAuthority = authority as unknown as {
      assignedCities: string[];
      primaryCity?: string;
      save: () => Promise<void>;
      lifecycleEvents: Array<{ event: string; description: string; performedBy?: string; performedByName?: string; at: Date }>;
    };

    const updateOp: Record<string, unknown> = { $pull: { assignedCities: { $in: cities } } };
    // Clear primaryCity if it is being removed
    if (typedAuthority.primaryCity && cities.includes(typedAuthority.primaryCity)) {
      (updateOp as Record<string, unknown>).$unset = { primaryCity: "" };
    }

    await User.updateOne({ _id: authority._id }, updateOp);

    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";
    const adminId = req.user?._id?.toString();
    appendLifecycleEvent(
      authority as Parameters<typeof appendLifecycleEvent>[0],
      "cities_removed",
      `Removed cities: ${cities.join(", ")}`,
      adminId,
      adminName,
    );
    await typedAuthority.save();

    const updated = await User.findById(authority._id).lean();
    res.json({ success: true, data: { authority: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/admin/authorities/:id/primary-city ───────────────────────────
export async function setPrimaryCity(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { primaryCity } = req.body as { primaryCity: string };
    if (!primaryCity) return next(new AppError("primaryCity is required", 400));

    const authority = await User.findOne({ _id: req.params.id, role: "authority" }).select("+lifecycleEvents");
    if (!authority) return next(new AppError("Authority not found", 404));

    const typedAuthority = authority as unknown as { assignedCities: string[]; save: () => Promise<void> };
    if (!typedAuthority.assignedCities.includes(primaryCity)) {
      return next(new AppError("City must be in assignedCities before setting as primary", 400));
    }

    await User.updateOne({ _id: authority._id }, { primaryCity });

    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";
    appendLifecycleEvent(
      authority as Parameters<typeof appendLifecycleEvent>[0],
      "primary_city_changed",
      `Primary city set to ${primaryCity}`,
      req.user?._id?.toString(),
      adminName,
    );
    await typedAuthority.save();

    const updated = await User.findById(authority._id).lean();
    res.json({ success: true, data: { authority: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/admin/authorities/:id/lifecycle ───────────────────────────────
/**
 * Handles: activate, deactivate, suspend, reinstate, lock, unlock.
 * Each action requires confirmation (frontend sends action in body).
 */
export async function performLifecycleAction(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      action,
    }: { action: "activate" | "deactivate" | "suspend" | "reinstate" | "lock" | "unlock" } =
      req.body;

    const VALID_ACTIONS = ["activate", "deactivate", "suspend", "reinstate", "lock", "unlock"];
    if (!VALID_ACTIONS.includes(action)) {
      return next(new AppError(`Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`, 400));
    }

    const authority = await User.findOne({ _id: req.params.id, role: "authority" }).select(
      "+lifecycleEvents +failedLoginAttempts +accountLockedUntil",
    );
    if (!authority) return next(new AppError("Authority not found", 404));

    const typedAuthority = authority as unknown as {
      isActive: boolean;
      availability: string;
      failedLoginAttempts: number;
      accountLockedUntil?: Date;
      approvalStatus: string;
      save: () => Promise<void>;
    };

    const adminId = req.user?._id?.toString();
    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";

    let eventLabel = "";
    let eventDesc = "";

    switch (action) {
      case "activate":
        if (typedAuthority.isActive) return next(new AppError("Account is already active", 409));
        typedAuthority.isActive = true;
        typedAuthority.availability = "available";
        eventLabel = "activated";
        eventDesc = "Account activated by administrator.";
        break;

      case "deactivate":
        if (!typedAuthority.isActive) return next(new AppError("Account is already inactive", 409));
        typedAuthority.isActive = false;
        typedAuthority.availability = "inactive";
        eventLabel = "deactivated";
        eventDesc = "Account deactivated by administrator.";
        break;

      case "suspend":
        typedAuthority.isActive = false;
        typedAuthority.availability = "inactive";
        typedAuthority.approvalStatus = "rejected";
        eventLabel = "suspended";
        eventDesc = "Account suspended by administrator.";
        break;

      case "reinstate":
        typedAuthority.isActive = true;
        typedAuthority.availability = "available";
        typedAuthority.approvalStatus = "approved";
        eventLabel = "reinstated";
        eventDesc = "Account reinstated by administrator.";
        break;

      case "lock":
        // Lock account for 24h
        typedAuthority.accountLockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        typedAuthority.failedLoginAttempts = 999;
        eventLabel = "locked";
        eventDesc = "Account locked by administrator (24 hours).";
        break;

      case "unlock":
        typedAuthority.accountLockedUntil = undefined;
        typedAuthority.failedLoginAttempts = 0;
        eventLabel = "unlocked";
        eventDesc = "Account unlocked by administrator.";
        break;
    }

    appendLifecycleEvent(
      authority as Parameters<typeof appendLifecycleEvent>[0],
      eventLabel,
      eventDesc,
      adminId,
      adminName,
    );

    await typedAuthority.save();

    logger.info(`[authority] lifecycle:${eventLabel}`, {
      authorityId: authority._id.toString(),
      performedBy: adminId,
    });

    const updated = await User.findById(authority._id).lean();
    res.json({ success: true, message: eventDesc, data: { authority: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/admin/authorities/:id/lifecycle ────────────────────────────────
export async function getLifecycleHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authority = await User.findOne({ _id: req.params.id, role: "authority" })
      .select("lifecycleEvents name email")
      .lean();
    if (!authority) return next(new AppError("Authority not found", 404));

    const typed = authority as unknown as {
      lifecycleEvents?: Array<{ event: string; description: string; performedBy?: string; performedByName?: string; at: Date }>;
    };

    res.json({ success: true, data: { lifecycleEvents: typed.lifecycleEvents ?? [] } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/admin/authorities/dashboard ────────────────────────────────────
/**
 * Intelligence dashboard: aggregate workforce metrics from real data only.
 */
export async function getAuthorityDashboard(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [allAuthorities, cities] = await Promise.all([
      User.find({ role: "authority", approvalStatus: "approved" })
        .select("name email isActive availability assignedCities primaryCity lastLogin createdAt")
        .lean(),
      City.find({ isActive: true }).lean(),
    ]);

    // Enrich with complaint workload
    const enriched = await Promise.all(
      allAuthorities.map(async (a) => {
        const uid = a._id as mongoose.Types.ObjectId;
        const [active, pending, rework, resolved, closed] = await Promise.all([
          Complaint.countDocuments({ assignedTo: uid, status: "in-progress" }),
          Complaint.countDocuments({ assignedTo: uid, status: "pending" }),
          Complaint.countDocuments({ assignedTo: uid, status: "rework" }),
          Complaint.countDocuments({ assignedTo: uid, status: "resolved" }),
          Complaint.countDocuments({ assignedTo: uid, status: "closed" }),
        ]);
        const totalAssigned = active + pending + rework + resolved + closed;
        const totalClosed = resolved + closed;
        const resolutionRate = totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0;
        const capacity = capacityLabel(active + rework);
        return { ...a, workload: { active, pending, rework, resolved, closed, total: totalAssigned, resolutionRate, capacity } };
      }),
    );

    // Aggregate metrics
    const total = enriched.length;
    const activeCount = enriched.filter((a) => (a as { isActive?: boolean }).isActive).length;
    const availableCount = enriched.filter(
      (a) => (a as { availability?: string }).availability === "available" && (a as { isActive?: boolean }).isActive,
    ).length;
    const busyCount = enriched.filter(
      (a) => ["busy", "overloaded"].includes((a as { workload: { capacity: string } }).workload.capacity) && (a as { isActive?: boolean }).isActive,
    ).length;
    const overloadedCount = enriched.filter(
      (a) => (a as { workload: { capacity: string } }).workload.capacity === "overloaded" && (a as { isActive?: boolean }).isActive,
    ).length;
    const onLeaveCount = enriched.filter(
      (a) => (a as { availability?: string }).availability === "on_leave",
    ).length;

    const totalActive = enriched.reduce((s, a) => s + (a as { workload: { active: number } }).workload.active, 0);
    const totalPending = enriched.reduce((s, a) => s + (a as { workload: { pending: number } }).workload.pending, 0);
    const totalRework = enriched.reduce((s, a) => s + (a as { workload: { rework: number } }).workload.rework, 0);
    const totalVerification = enriched.reduce((s, a) => s + (a as { workload: { resolved: number } }).workload.resolved, 0);

    // Top performers by resolution rate (min 3 closed to qualify)
    const leaderboard = enriched
      .filter((a) => (a as { workload: { total: number } }).workload.total >= 3)
      .sort((a, b) => (b as { workload: { resolutionRate: number } }).workload.resolutionRate - (a as { workload: { resolutionRate: number } }).workload.resolutionRate)
      .slice(0, 5)
      .map((a) => ({
        _id: (a._id as mongoose.Types.ObjectId).toString(),
        name: (a as { name: string }).name,
        email: (a as { email: string }).email,
        resolutionRate: (a as { workload: { resolutionRate: number } }).workload.resolutionRate,
        total: (a as { workload: { total: number } }).workload.total,
        active: (a as { workload: { active: number } }).workload.active,
        capacity: (a as { workload: { capacity: string } }).workload.capacity,
      }));

    // Coverage: which cities have assigned authorities
    const cityIds = cities.map((c) => c.cityId);
    const coveredCityIds = new Set<string>();
    for (const a of enriched) {
      const ac = (a as { assignedCities?: string[] }).assignedCities ?? [];
      for (const c of ac) coveredCityIds.add(c);
    }
    const coveredCities = cityIds.filter((id) => coveredCityIds.has(id));
    const uncoveredCities = cityIds.filter((id) => !coveredCityIds.has(id));

    // Per-city authority count
    const authoritiesPerCity: Record<string, number> = {};
    for (const a of enriched) {
      const ac = (a as { assignedCities?: string[] }).assignedCities ?? [];
      for (const c of ac) {
        authoritiesPerCity[c] = (authoritiesPerCity[c] ?? 0) + 1;
      }
    }

    // Operational insights from real data
    const insights: Array<{ type: "warning" | "info" | "critical"; message: string }> = [];
    if (uncoveredCities.length > 0) {
      insights.push({ type: "critical", message: `${uncoveredCities.length} city/cities have no assigned authority.` });
    }
    if (overloadedCount > 0) {
      insights.push({ type: "warning", message: `${overloadedCount} authorit${overloadedCount === 1 ? "y is" : "ies are"} overloaded (>10 active cases).` });
    }
    if (totalPending > 20) {
      insights.push({ type: "warning", message: `${totalPending} pending complaints are awaiting assignment.` });
    }
    if (totalRework > 5) {
      insights.push({ type: "info", message: `${totalRework} complaints are under rework — quality review recommended.` });
    }
    if (activeCount === 0) {
      insights.push({ type: "critical", message: "No active authorities available on the platform." });
    }

    res.json({
      success: true,
      data: {
        metrics: {
          total,
          active: activeCount,
          available: availableCount,
          busy: busyCount,
          overloaded: overloadedCount,
          onLeave: onLeaveCount,
          inactive: total - activeCount,
          activeInvestigations: totalActive,
          waitingVerification: totalVerification,
          reworkCases: totalRework,
          pendingComplaints: totalPending,
        },
        coverage: {
          totalCities: cityIds.length,
          coveredCities: coveredCities.length,
          uncoveredCities: uncoveredCities.length,
          uncoveredCityIds: uncoveredCities,
          authoritiesPerCity,
        },
        leaderboard,
        insights,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/admin/authorities/bulk ────────────────────────────────────────
/**
 * Bulk operations: activate, deactivate, assign-cities, remove-cities.
 */
export async function bulkOperation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { action, ids, cities } = req.body as {
      action: "activate" | "deactivate" | "assign_cities" | "remove_cities";
      ids: string[];
      cities?: string[];
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError("ids array is required", 400));
    }
    const VALID = ["activate", "deactivate", "assign_cities", "remove_cities"];
    if (!VALID.includes(action)) return next(new AppError("Invalid bulk action", 400));

    // Same jurisdiction-integrity rule as the single-authority endpoint:
    // bulk city assignment must only ever use real, active GreenGuard cities.
    let validCities: string[] | undefined;
    if (action === "assign_cities") {
      if (!cities?.length) return next(new AppError("cities array is required for assign_cities", 400));
      const validated = await validateCityIds(cities);
      if (!validated) {
        return next(new AppError("One or more cities are not valid, active GreenGuard cities", 400));
      }
      validCities = validated;
    }

    const adminId = req.user?._id?.toString();
    const adminName = (req.user as { name?: string } | undefined)?.name ?? "Administrator";

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const id of ids) {
      try {
        const authority = await User.findOne({ _id: id, role: "authority" }).select("+lifecycleEvents");
        if (!authority) { results.push({ id, success: false, error: "Not found" }); continue; }

        const typed = authority as unknown as {
          isActive: boolean;
          availability: string;
          assignedCities: string[];
          save: () => Promise<void>;
        };

        switch (action) {
          case "activate":
            typed.isActive = true;
            typed.availability = "available";
            appendLifecycleEvent(authority as Parameters<typeof appendLifecycleEvent>[0], "activated", "Account activated (bulk operation).", adminId, adminName);
            break;
          case "deactivate":
            typed.isActive = false;
            typed.availability = "inactive";
            appendLifecycleEvent(authority as Parameters<typeof appendLifecycleEvent>[0], "deactivated", "Account deactivated (bulk operation).", adminId, adminName);
            break;
          case "assign_cities":
            if (!validCities?.length) break;
            await User.updateOne({ _id: id }, { $addToSet: { assignedCities: { $each: validCities } } });
            appendLifecycleEvent(authority as Parameters<typeof appendLifecycleEvent>[0], "cities_assigned", `Bulk city assignment: ${validCities.join(", ")}`, adminId, adminName);
            break;
          case "remove_cities":
            if (!cities?.length) break;
            await User.updateOne({ _id: id }, { $pull: { assignedCities: { $in: cities } } });
            appendLifecycleEvent(authority as Parameters<typeof appendLifecycleEvent>[0], "cities_removed", `Bulk city removal: ${cities.join(", ")}`, adminId, adminName);
            break;
        }

        await typed.save();
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    res.json({
      success: true,
      message: `Bulk ${action}: ${succeeded}/${ids.length} succeeded.`,
      data: { results },
    });
  } catch (err) {
    next(err);
  }
}
