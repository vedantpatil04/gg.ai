import mongoose from "mongoose";
import { Complaint } from "../models/Complaint";
import { Report } from "../models/Report";
import { User } from "../models/User";
import { City } from "../models/City";
import type { IUser, UserRole } from "../models/User";

export interface ProfileStatistic {
  key: string;
  label: string;
  value: number;
}

export interface ProfileStatisticsResult {
  role: UserRole;
  stats: ProfileStatistic[];
}

const OPEN_COMPLAINT_STATUSES = ["pending", "in-progress"];

/**
 * Phase 2 — Dynamic, role-aware Statistics.
 *
 * Every number below comes from a real, unambiguous query against the
 * existing Complaint / Report / User / City collections — there is no
 * synthetic or randomized figure anywhere in this service (unlike the
 * pre-existing `GET /api/users/stats` endpoint, which multiplies resolved
 * complaints by `Math.random()` for a "citizensHelped" figure — that
 * endpoint is untouched and unused by this phase, but was deliberately not
 * reused here for that reason).
 *
 * The spec's example statistic lists (per role) include a few concepts the
 * schema has no way to represent honestly:
 *   - Citizens can't create Reports at all (that route is authority-tier
 *     only), so "Reports Submitted" is dropped for citizens rather than
 *     always showing zero for a capability the role doesn't have.
 *   - Report has no review/approval workflow (no status field), so
 *     "Reports Reviewed" (Authority) and "Reports Approved" (Administrator)
 *     have nothing real to compute — dropped rather than approximated.
 * Everything else maps 1:1 onto a real field: submittedBy/assignedTo on
 * Complaint, generatedBy on Report, role/approvalStatus on User, isActive
 * on City.
 */
export async function getProfileStatistics(
  user: Pick<IUser, "_id" | "role">,
): Promise<ProfileStatisticsResult> {
  const userId = user._id;

  if (user.role === "citizen") {
    return { role: "citizen", stats: await getCitizenStatistics(userId) };
  }
  if (user.role === "authority") {
    return { role: "authority", stats: await getAuthorityStatistics(userId) };
  }
  if (user.role === "administrator") {
    return { role: "administrator", stats: await getAdministratorStatistics() };
  }

  // Defensive fallback for any future role this service doesn't know about
  // yet — an empty list renders as the "statistics unavailable" state
  // rather than throwing.
  return { role: user.role, stats: [] };
}

async function getCitizenStatistics(userId: mongoose.Types.ObjectId): Promise<ProfileStatistic[]> {
  const [submitted, resolved, pending] = await Promise.all([
    Complaint.countDocuments({ submittedBy: userId }),
    Complaint.countDocuments({ submittedBy: userId, status: "resolved" }),
    Complaint.countDocuments({ submittedBy: userId, status: { $in: OPEN_COMPLAINT_STATUSES } }),
  ]);

  return [
    { key: "complaintsSubmitted", label: "Complaints Submitted", value: submitted },
    { key: "complaintsResolved", label: "Complaints Resolved", value: resolved },
    { key: "complaintsPending", label: "Complaints Pending", value: pending },
  ];
}

async function getAuthorityStatistics(
  userId: mongoose.Types.ObjectId,
): Promise<ProfileStatistic[]> {
  const [assigned, resolved, pending, reportsGenerated] = await Promise.all([
    Complaint.countDocuments({ assignedTo: userId }),
    Complaint.countDocuments({ assignedTo: userId, status: "resolved" }),
    Complaint.countDocuments({ assignedTo: userId, status: { $in: OPEN_COMPLAINT_STATUSES } }),
    Report.countDocuments({ generatedBy: userId }),
  ]);

  return [
    { key: "complaintsAssigned", label: "Assigned Complaints", value: assigned },
    { key: "complaintsResolved", label: "Resolved Complaints", value: resolved },
    { key: "complaintsPending", label: "Pending Complaints", value: pending },
    { key: "reportsGenerated", label: "Reports Generated", value: reportsGenerated },
  ];
}

async function getAdministratorStatistics(): Promise<ProfileStatistic[]> {
  // Platform-wide, not per-admin: nothing in the schema ties a City or an
  // approved Authority account to the specific administrator who manages
  // it (no `managedBy`/`approvedBy` field), so — same as the existing
  // Executive Dashboard's platform stats — these are counted across the
  // whole platform rather than scoped to one admin.
  const [authoritiesManaged, citiesManaged, pendingApprovals, totalComplaints] = await Promise.all([
    User.countDocuments({ role: "authority", approvalStatus: "approved" }),
    City.countDocuments({ isActive: true }),
    User.countDocuments({ role: "authority", approvalStatus: "pending" }),
    Complaint.countDocuments(),
  ]);

  return [
    { key: "authoritiesManaged", label: "Authorities Managed", value: authoritiesManaged },
    { key: "citiesManaged", label: "Cities Managed", value: citiesManaged },
    { key: "pendingApprovals", label: "Pending Approvals", value: pendingApprovals },
    { key: "totalComplaints", label: "Total Complaints", value: totalComplaints },
  ];
}
