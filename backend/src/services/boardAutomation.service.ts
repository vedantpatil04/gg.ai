/**
 * Automation 4 — Authority Board Automation Service
 *
 * Operational unit coordination, organization/board identity, department
 * alignment, aggregate workload metrics, jurisdiction coverage analysis,
 * availability management, and operational gap detection.
 *
 * Security Notice:
 *  - Board membership does NOT grant case-level access to other officers' complaints.
 *  - Individual complaint access remains strictly governed by `assignedTo`.
 *  - This service produces real, aggregate operational intelligence computed
 *    from active User and Complaint data.
 */

import mongoose from "mongoose";
import { User, type IUser, type AuthorityAvailability } from "../models/User";
import { Complaint } from "../models/Complaint";
import { City } from "../models/City";
import { logger } from "../utils/logger";
import { notifyBoardCoverageGap, getAdminUserIds } from "./notification.service";

export interface OfficerSummary {
  id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  assignedCities: string[];
  availability: AuthorityAvailability;
  activeCaseCount: number;
  totalCaseCount: number;
}

export interface CityCoverageSummary {
  cityId: string;
  cityName: string;
  officerCount: number;
  availableOfficerCount: number;
  activeComplaintCount: number;
  hasGap: boolean;
}

export interface BoardWorkloadSummary {
  totalAssigned: number;
  inProgress: number;
  rework: number;
  awaitingReview: number;
  resolved: number;
  closed: number;
}

export interface BoardOperationalContext {
  organization: string;
  department?: string;
  jurisdiction: string[];
  totalOfficers: number;
  availability: {
    available: number;
    busy: number;
    on_leave: number;
    inactive: number;
  };
  officers: OfficerSummary[];
  workload: BoardWorkloadSummary;
  jurisdictionCoverage: CityCoverageSummary[];
  coverageGaps: Array<{ cityId: string; cityName: string; reason: string }>;
  boardStatus: "optimal" | "warning" | "critical";
  self: {
    id: string;
    name: string;
    availability: AuthorityAvailability;
    department?: string;
    assignedCities: string[];
    myActiveCases: number;
    myTotalCases: number;
  };
}

const ACTIVE_CASE_STATUSES = ["pending", "in-progress", "rework", "awaiting_citizen_review"];

/**
 * Retrieves the comprehensive operational context for an Authority's Organization/Board.
 */
export async function getBoardOperationalContext(
  user: Pick<IUser, "_id" | "role" | "organization" | "department" | "assignedCities" | "name" | "email" | "availability">,
): Promise<BoardOperationalContext> {
  const organizationName = user.organization?.trim() || "State Environmental Authority";
  const userDepartment = user.department?.trim() || undefined;
  const userJurisdiction = Array.isArray(user.assignedCities) ? user.assignedCities : [];

  // Query all active, approved authority officers belonging to this organization
  const officerQuery: Record<string, unknown> = {
    role: "authority",
    approvalStatus: "approved",
    isActive: true,
  };

  if (user.organization?.trim()) {
    officerQuery.organization = user.organization.trim();
  }

  const rawOfficers = await User.find(officerQuery)
    .select("_id name email designation department assignedCities availability specializations")
    .lean();

  // If the user's organization has only 1 officer (the user themselves), ensure user is included
  const officerList = rawOfficers.length > 0 ? rawOfficers : [
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      designation: (user as { designation?: string }).designation,
      department: user.department,
      assignedCities: userJurisdiction,
      availability: user.availability || "available",
    },
  ];

  const officerIds = officerList.map((o) => o._id as mongoose.Types.ObjectId);

  // Aggregate complaints assigned across all board officers
  const complaintAgg = await Complaint.aggregate<{
    _id: { officerId: mongoose.Types.ObjectId; status: string };
    count: number;
  }>([
    { $match: { assignedTo: { $in: officerIds } } },
    { $group: { _id: { officerId: "$assignedTo", status: "$status" }, count: { $sum: 1 } } },
  ]);

  // Index case counts per officer and status
  const officerStatsMap = new Map<string, { active: number; total: number }>();
  const boardWorkload: BoardWorkloadSummary = {
    totalAssigned: 0,
    inProgress: 0,
    rework: 0,
    awaitingReview: 0,
    resolved: 0,
    closed: 0,
  };

  for (const item of complaintAgg) {
    const offId = String(item._id.officerId);
    const st = item._id.status;
    const cnt = item.count;

    boardWorkload.totalAssigned += cnt;
    if (st === "in-progress") boardWorkload.inProgress += cnt;
    else if (st === "rework") boardWorkload.rework += cnt;
    else if (st === "awaiting_citizen_review") boardWorkload.awaitingReview += cnt;
    else if (st === "resolved") boardWorkload.resolved += cnt;
    else if (st === "closed") boardWorkload.closed += cnt;

    const current = officerStatsMap.get(offId) || { active: 0, total: 0 };
    current.total += cnt;
    if (ACTIVE_CASE_STATUSES.includes(st)) {
      current.active += cnt;
    }
    officerStatsMap.set(offId, current);
  }

  // Calculate availability counts
  const availabilityCounts = {
    available: 0,
    busy: 0,
    on_leave: 0,
    inactive: 0,
  };

  const officers: OfficerSummary[] = officerList.map((off) => {
    const avail = (off.availability as AuthorityAvailability) || "available";
    if (avail === "available") availabilityCounts.available++;
    else if (avail === "busy") availabilityCounts.busy++;
    else if (avail === "on_leave") availabilityCounts.on_leave++;
    else availabilityCounts.inactive++;

    const stats = officerStatsMap.get(String(off._id)) || { active: 0, total: 0 };
    const cities = Array.isArray(off.assignedCities) ? off.assignedCities : [];

    return {
      id: String(off._id),
      name: off.name,
      email: off.email,
      designation: off.designation,
      department: off.department,
      assignedCities: cities,
      availability: avail,
      activeCaseCount: stats.active,
      totalCaseCount: stats.total,
    };
  });

  // Calculate all unique covered cities across the board
  const allCoveredCityIds = Array.from(
    new Set(officerList.flatMap((o) => (Array.isArray(o.assignedCities) ? o.assignedCities : []))),
  );

  const cityDocs = await City.find({ cityId: { $in: allCoveredCityIds } })
    .select("cityId name")
    .lean();

  const cityNameMap = new Map(cityDocs.map((c) => [c.cityId, c.name]));

  // Count active complaints in each covered city
  const cityComplaintCounts = await Complaint.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        cityId: { $in: allCoveredCityIds },
        status: { $in: ACTIVE_CASE_STATUSES },
      },
    },
    { $group: { _id: "$cityId", count: { $sum: 1 } } },
  ]);

  const cityComplaintMap = new Map(cityComplaintCounts.map((c) => [c._id, c.count]));

  // Build jurisdiction coverage summaries & detect gaps
  const coverageGaps: Array<{ cityId: string; cityName: string; reason: string }> = [];
  const jurisdictionCoverage: CityCoverageSummary[] = allCoveredCityIds.map((cid) => {
    const cName = cityNameMap.get(cid) || cid.toUpperCase();
    const assignedOfficers = officers.filter((o) => o.assignedCities.includes(cid));
    const availOfficers = assignedOfficers.filter((o) => o.availability === "available");
    const activeComplaints = cityComplaintMap.get(cid) || 0;
    const hasGap = availOfficers.length === 0;

    if (hasGap) {
      const reason =
        assignedOfficers.length === 0
          ? "No officers assigned to this jurisdiction"
          : `All ${assignedOfficers.length} assigned officer(s) are currently busy or on leave`;
      coverageGaps.push({ cityId: cid, cityName: cName, reason });
    }

    return {
      cityId: cid,
      cityName: cName,
      officerCount: assignedOfficers.length,
      availableOfficerCount: availOfficers.length,
      activeComplaintCount: activeComplaints,
      hasGap,
    };
  });

  // Determine board operational status
  let boardStatus: "optimal" | "warning" | "critical" = "optimal";
  if (
    coverageGaps.some((g) => (cityComplaintMap.get(g.cityId) || 0) > 0) ||
    availabilityCounts.available === 0
  ) {
    boardStatus = "critical";
  } else if (
    coverageGaps.length > 0 ||
    availabilityCounts.busy + availabilityCounts.on_leave >= officers.length * 0.5
  ) {
    boardStatus = "warning";
  }

  // Self officer stats
  const selfStats = officerStatsMap.get(String(user._id)) || { active: 0, total: 0 };

  return {
    organization: organizationName,
    department: userDepartment,
    jurisdiction: userJurisdiction,
    totalOfficers: officers.length,
    availability: availabilityCounts,
    officers,
    workload: boardWorkload,
    jurisdictionCoverage,
    coverageGaps,
    boardStatus,
    self: {
      id: String(user._id),
      name: user.name,
      availability: (user.availability as AuthorityAvailability) || "available",
      department: userDepartment,
      assignedCities: userJurisdiction,
      myActiveCases: selfStats.active,
      myTotalCases: selfStats.total,
    },
  };
}

/**
 * Updates an Authority officer's availability state and detects if this change
 * created an operational coverage gap in their assigned jurisdictions.
 */
export async function updateAuthorityAvailability(
  userId: mongoose.Types.ObjectId | string,
  newAvailability: AuthorityAvailability,
): Promise<{ success: boolean; user: IUser | null; gapTriggered?: boolean }> {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, user: null };

    const previousAvailability = user.availability;
    user.availability = newAvailability;

    // Append lifecycle event
    if (user.lifecycleEvents) {
      user.lifecycleEvents.push({
        event: "availability_change",
        description: `Availability changed from ${previousAvailability || "available"} to ${newAvailability}`,
        at: new Date(),
      });
    }

    await user.save();

    let gapTriggered = false;

    // If changing to busy or on_leave, evaluate if any assigned city has 0 remaining available officers
    if (newAvailability === "busy" || newAvailability === "on_leave") {
      const assignedCities = Array.isArray(user.assignedCities) ? user.assignedCities : [];
      if (assignedCities.length > 0) {
        for (const cityId of assignedCities) {
          const remainingAvailable = await User.countDocuments({
            role: "authority",
            approvalStatus: "approved",
            isActive: true,
            availability: "available",
            assignedCities: cityId,
          });

          if (remainingAvailable === 0) {
            gapTriggered = true;
            const adminIds = await getAdminUserIds();
            const boardName = user.organization || "Environmental Authority";
            void notifyBoardCoverageGap(
              adminIds,
              boardName,
              cityId,
              `Officer ${user.name} switched to ${newAvailability}, leaving 0 available authorities for this jurisdiction.`,
            );
          }
        }
      }
    }

    return { success: true, user, gapTriggered };
  } catch (err) {
    logger.error("[boardAutomation] Failed to update availability:", err);
    throw err;
  }
}
