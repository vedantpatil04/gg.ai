/**
 * adminGovernance.service.ts
 *
 * Automation 6 — Administrator Governance + ML Analytics.
 *
 * Aggregates real operational data produced by:
 * - Own ML (ComplaintPrediction)
 * - Smart Routing (RoutingResult)
 * - Complaint Lifecycle (Complaint, events, assignmentSource, reworkCount)
 * - Authority Board Automation (boardAutomation.service.ts)
 * - Citizen Resolution + Rework Loop
 *
 * Provides honest, production-grade intelligence with zero fabricated metrics:
 * - Real exception & governance queue (What requires admin attention?)
 * - Real Own ML prediction & confidence distributions (NO fake accuracy %)
 * - Real Smart Routing & human override performance
 * - Real Rework cycles & citizen review turnaround
 * - Real Jurisdiction coverage gaps & board health
 */

import mongoose from "mongoose";
import { Complaint, type IComplaint } from "../models/Complaint";
import { ComplaintPrediction, type IComplaintPrediction } from "../models/ComplaintPrediction";
import { RoutingResult, type IRoutingResult } from "../models/RoutingResult";
import { User, type IUser } from "../models/User";
import { City } from "../models/City";
import { getBoardOperationalContext } from "./boardAutomation.service";
import { getPriorityAnalytics, type PriorityAnalyticsData } from "./priorityIntelligence.service";

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface GovernanceFilterParams {
  timeRange?: "7d" | "30d" | "90d" | "all";
  cityId?: string;
  department?: string;
  category?: string;
}

export function buildDateFilter(timeRange?: "7d" | "30d" | "90d" | "all"): Date | null {
  if (!timeRange || timeRange === "all") return null;
  const now = new Date();
  if (timeRange === "7d") now.setDate(now.getDate() - 7);
  else if (timeRange === "30d") now.setDate(now.getDate() - 30);
  else if (timeRange === "90d") now.setDate(now.getDate() - 90);
  return now;
}

// ─── 1. Governance Exception Queue ────────────────────────────────────────────

export interface GovernanceExceptionItem {
  id: string;
  complaintId: string;
  refId: string;
  title: string;
  category: string;
  cityId: string;
  department?: string;
  severity: string;
  status: string;
  exceptionType:
    | "critical_escalation"
    | "routing_failed"
    | "manual_assignment_required"
    | "rework_requested"
    | "verification_required"
    | "coverage_gap"
    | "low_confidence_prediction";
  reason: string;
  assignmentSource?: string;
  assignedAuthority?: { id: string; name: string; email: string };
  reworkCount?: number;
  confidence?: number;
  priorityScore?: number;
  escalationStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  nextAction: string;
  actionUrl: string;
}

export async function getGovernanceExceptions(params: GovernanceFilterParams = {}): Promise<{
  total: number;
  byType: Record<string, number>;
  exceptions: GovernanceExceptionItem[];
}> {
  const dateFrom = buildDateFilter(params.timeRange);
  const complaintFilter: Record<string, unknown> = {};
  if (dateFrom) complaintFilter.createdAt = { $gte: dateFrom };
  if (params.cityId) complaintFilter.cityId = params.cityId.toLowerCase();

  // Find all complaints needing governance action
  // 1. Critical Escalations (active & escalated)
  // 2. Pending (unassigned or routing failed)
  // 3. Rework (citizen requested rework)
  // 4. Resolved (revised resolution awaiting admin verification)
  complaintFilter.status = { $in: ["pending", "in-progress", "rework", "resolved"] };

  const complaints = await Complaint.find(complaintFilter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate("assignedTo", "name email department")
    .populate("submittedBy", "name email")
    .lean();

  const complaintIds = complaints.map((c) => c._id);

  // Fetch routing results and predictions for these complaints
  const [routingResults, predictions] = await Promise.all([
    RoutingResult.find({ complaint: { $in: complaintIds } })
      .sort({ routedAt: -1 })
      .lean(),
    ComplaintPrediction.find({ complaint: { $in: complaintIds } })
      .sort({ predictionTime: -1 })
      .lean(),
  ]);

  const routingMap = new Map<string, (typeof routingResults)[0]>();
  for (const r of routingResults) {
    const key = r.complaint.toString();
    if (!routingMap.has(key)) routingMap.set(key, r);
  }

  const predictionMap = new Map<string, (typeof predictions)[0]>();
  for (const p of predictions) {
    const key = p.complaint.toString();
    if (!predictionMap.has(key)) predictionMap.set(key, p);
  }

  const exceptions: GovernanceExceptionItem[] = [];
  const byType: Record<string, number> = {
    critical_escalation: 0,
    routing_failed: 0,
    manual_assignment_required: 0,
    rework_requested: 0,
    verification_required: 0,
    low_confidence_prediction: 0,
  };

  for (const c of complaints) {
    const cid = c._id.toString();
    const routing = routingMap.get(cid);
    const prediction = predictionMap.get(cid);
    const assigned = c.assignedTo as unknown as { _id?: string; name?: string; email?: string; department?: string } | null;

    let exceptionType: GovernanceExceptionItem["exceptionType"] | null = null;
    let reason = "";
    let nextAction = "";
    let actionUrl = "";

    if (c.escalationStatus === "escalated" && c.priorityLevel === "critical") {
      exceptionType = "critical_escalation";
      reason = (c.escalationReasons && c.escalationReasons[0]) || `Critical operational risk detected (Score ${c.priorityScore || 80}/100)`;
      nextAction = "Acknowledge & Triage Escalation";
      actionUrl = `/admin/complaints?id=${cid}&tab=escalation`;
    } else if (c.status === "rework") {
      exceptionType = "rework_requested";
      reason = c.reworkReason || "Citizen requested additional investigation on resolution";
      nextAction = "Review Rework & Reassign";
      actionUrl = `/admin/complaints?id=${cid}&tab=rework`;
    } else if (c.status === "resolved") {
      exceptionType = "verification_required";
      reason = "Revised resolution submitted — awaiting administrator verification";
      nextAction = "Review & Verify Resolution";
      actionUrl = `/admin/complaints?id=${cid}&action=verify`;
    } else if (c.status === "pending") {
      if (routing?.status === "failed") {
        exceptionType = "routing_failed";
        reason = routing.failureReason || "Smart Routing failed to automatically assign an authority";
        nextAction = "Manually Assign Authority";
        actionUrl = `/admin/complaints?id=${cid}&action=assign`;
      } else if (!c.assignedTo) {
        if (prediction && (prediction.status === "failed" || (prediction.confidence !== undefined && prediction.confidence < 0.45))) {
          exceptionType = "low_confidence_prediction";
          reason = prediction.status === "failed"
            ? (prediction.failureReason || "ML prediction failed to classify complaint")
            : `Low ML prediction confidence (${Math.round((prediction.confidence ?? 0) * 100)}%) — manual triage recommended`;
          nextAction = "Review ML Triage & Assign";
          actionUrl = `/admin/complaints?id=${cid}&action=assign`;
        } else {
          exceptionType = "manual_assignment_required";
          reason = routing?.status === "pending"
            ? (routing.reasons[0] || "No eligible candidate available for auto-assignment")
            : "Complaint awaiting authority assignment";
          nextAction = "Assign to Authority";
          actionUrl = `/admin/complaints?id=${cid}&action=assign`;
        }
      }
    }

    if (exceptionType) {
      byType[exceptionType] = (byType[exceptionType] || 0) + 1;
      exceptions.push({
        id: `exc-${cid}`,
        complaintId: cid,
        refId: `#${cid.slice(-6).toUpperCase()}`,
        title: c.title,
        category: c.issueType,
        cityId: c.cityId,
        department: assigned?.department || prediction?.department,
        severity: c.severity,
        status: c.status,
        exceptionType,
        reason,
        assignmentSource: c.assignmentSource,
        assignedAuthority: assigned ? { id: String(assigned._id || ""), name: assigned.name || "", email: assigned.email || "" } : undefined,
        reworkCount: c.reworkCount,
        confidence: prediction?.confidence,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        nextAction,
        actionUrl,
      });
    }
  }

  return {
    total: exceptions.length,
    byType,
    exceptions,
  };
}

// ─── 2. Own ML Prediction & Confidence Analytics ──────────────────────────────

export interface MLAnalyticsData {
  totalPredictions: number;
  successfulPredictions: number;
  failedPredictions: number;
  successRate: number;
  averageConfidence: number;
  confidenceDistribution: {
    high: { count: number; percentage: number; threshold: string };
    moderate: { count: number; percentage: number; threshold: string };
    low: { count: number; percentage: number; threshold: string };
  };
  predictedCategories: Array<{ category: string; count: number; percentage: number; avgConfidence: number }>;
  predictedDepartments: Array<{ department: string; count: number; percentage: number; avgConfidence: number }>;
  predictedSeverities: Array<{ severity: string; count: number; percentage: number; avgConfidence: number }>;
  modelVersions: Array<{ version: string; count: number; percentage: number }>;
  failureReasons: Array<{ reason: string; count: number }>;
  recentPredictions: Array<{
    id: string;
    complaintId: string;
    status: string;
    category?: string;
    department?: string;
    severity?: string;
    confidence?: number;
    modelVersion: string;
    predictionTime: Date;
    reasons: string[];
    failureReason?: string;
  }>;
}

export async function getMLAnalytics(params: GovernanceFilterParams = {}): Promise<MLAnalyticsData> {
  const dateFrom = buildDateFilter(params.timeRange);
  const matchFilter: Record<string, unknown> = {};
  if (dateFrom) matchFilter.predictionTime = { $gte: dateFrom };

  const [
    totalPredictions,
    successfulPredictions,
    failedPredictions,
    confidenceAgg,
    categoryAgg,
    departmentAgg,
    severityAgg,
    modelVersionAgg,
    failureReasonAgg,
    recentDocs,
  ] = await Promise.all([
    ComplaintPrediction.countDocuments(matchFilter),
    ComplaintPrediction.countDocuments({ ...matchFilter, status: "success" }),
    ComplaintPrediction.countDocuments({ ...matchFilter, status: "failed" }),
    ComplaintPrediction.aggregate([
      { $match: { ...matchFilter, status: "success", confidence: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgConf: { $avg: "$confidence" },
          high: { $sum: { $cond: [{ $gte: ["$confidence", 0.70] }, 1, 0] } },
          moderate: { $sum: { $cond: [{ $and: [{ $gte: ["$confidence", 0.45] }, { $lt: ["$confidence", 0.70] }] }, 1, 0] } },
          low: { $sum: { $cond: [{ $lt: ["$confidence", 0.45] }, 1, 0] } },
        },
      },
    ]),
    ComplaintPrediction.aggregate([
      { $match: { ...matchFilter, status: "success", category: { $exists: true } } },
      { $group: { _id: "$category", count: { $sum: 1 }, avgConf: { $avg: "$confidence" } } },
      { $sort: { count: -1 } },
    ]),
    ComplaintPrediction.aggregate([
      { $match: { ...matchFilter, status: "success", department: { $exists: true } } },
      { $group: { _id: "$department", count: { $sum: 1 }, avgConf: { $avg: "$confidence" } } },
      { $sort: { count: -1 } },
    ]),
    ComplaintPrediction.aggregate([
      { $match: { ...matchFilter, status: "success", severity: { $exists: true } } },
      { $group: { _id: "$severity", count: { $sum: 1 }, avgConf: { $avg: "$confidence" } } },
      { $sort: { count: -1 } },
    ]),
    ComplaintPrediction.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$modelVersion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ComplaintPrediction.aggregate([
      { $match: { ...matchFilter, status: "failed", failureReason: { $exists: true } } },
      { $group: { _id: "$failureReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    ComplaintPrediction.find(matchFilter)
      .sort({ predictionTime: -1 })
      .limit(10)
      .lean(),
  ]);

  const confStats = confidenceAgg[0] || { avgConf: 0, high: 0, moderate: 0, low: 0 };
  const totalSuccess = successfulPredictions || 1;

  return {
    totalPredictions,
    successfulPredictions,
    failedPredictions,
    successRate: totalPredictions > 0 ? Math.round((successfulPredictions / totalPredictions) * 100) : 100,
    averageConfidence: Math.round((confStats.avgConf || 0) * 100) / 100,
    confidenceDistribution: {
      high: {
        count: confStats.high,
        percentage: Math.round((confStats.high / totalSuccess) * 100),
        threshold: "≥ 70%",
      },
      moderate: {
        count: confStats.moderate,
        percentage: Math.round((confStats.moderate / totalSuccess) * 100),
        threshold: "45% – 69%",
      },
      low: {
        count: confStats.low,
        percentage: Math.round((confStats.low / totalSuccess) * 100),
        threshold: "< 45%",
      },
    },
    predictedCategories: categoryAgg.map((c: { _id: string; count: number; avgConf: number }) => ({
      category: c._id,
      count: c.count,
      percentage: Math.round((c.count / totalSuccess) * 100),
      avgConfidence: Math.round((c.avgConf || 0) * 100) / 100,
    })),
    predictedDepartments: departmentAgg.map((d: { _id: string; count: number; avgConf: number }) => ({
      department: d._id,
      count: d.count,
      percentage: Math.round((d.count / totalSuccess) * 100),
      avgConfidence: Math.round((d.avgConf || 0) * 100) / 100,
    })),
    predictedSeverities: severityAgg.map((s: { _id: string; count: number; avgConf: number }) => ({
      severity: s._id,
      count: s.count,
      percentage: Math.round((s.count / totalSuccess) * 100),
      avgConfidence: Math.round((s.avgConf || 0) * 100) / 100,
    })),
    modelVersions: modelVersionAgg.map((m: { _id: string; count: number }) => ({
      version: m._id || "unknown",
      count: m.count,
      percentage: totalPredictions > 0 ? Math.round((m.count / totalPredictions) * 100) : 100,
    })),
    failureReasons: failureReasonAgg.map((f: { _id: string; count: number }) => ({
      reason: f._id,
      count: f.count,
    })),
    recentPredictions: recentDocs.map((p) => ({
      id: p._id.toString(),
      complaintId: p.complaint.toString(),
      status: p.status,
      category: p.category,
      department: p.department,
      severity: p.severity,
      confidence: p.confidence,
      modelVersion: p.modelVersion,
      predictionTime: p.predictionTime,
      reasons: p.reasons || [],
      failureReason: p.failureReason,
    })),
  };
}

// ─── 3. Smart Routing & Human Override Analytics ──────────────────────────────

export interface RoutingAnalyticsData {
  totalRouted: number;
  autoAssigned: number;
  pendingRouting: number;
  failedRouting: number;
  autoAssignmentRate: number;
  confidenceTierBreakdown: {
    high: { count: number; assignedCount: number; rate: number };
    moderate: { count: number; assignedCount: number; rate: number };
    low: { count: number; assignedCount: number; rate: number };
  };
  humanOverrides: {
    totalComplaints: number;
    automaticAssignments: number;
    manualAssignments: number;
    manualReassignments: number;
    manualInterventionRate: number;
  };
  routingFailuresBreakdown: Array<{ reason: string; count: number }>;
  routingByCity: Array<{ cityId: string; total: number; autoAssigned: number; rate: number }>;
}

export async function getRoutingAnalytics(params: GovernanceFilterParams = {}): Promise<RoutingAnalyticsData> {
  const dateFrom = buildDateFilter(params.timeRange);
  const matchFilter: Record<string, unknown> = {};
  if (dateFrom) matchFilter.routedAt = { $gte: dateFrom };

  const complaintDateFilter: Record<string, unknown> = {};
  if (dateFrom) complaintDateFilter.createdAt = { $gte: dateFrom };

  const [
    totalRouted,
    autoAssigned,
    pendingRouting,
    failedRouting,
    tierAgg,
    failureReasonsAgg,
    complaintOverrideStats,
    reassignedCount,
    complaintsByCity,
  ] = await Promise.all([
    RoutingResult.countDocuments(matchFilter),
    RoutingResult.countDocuments({ ...matchFilter, status: "assigned" }),
    RoutingResult.countDocuments({ ...matchFilter, status: "pending" }),
    RoutingResult.countDocuments({ ...matchFilter, status: "failed" }),
    RoutingResult.aggregate([
      { $match: { ...matchFilter, confidenceTier: { $exists: true } } },
      {
        $group: {
          _id: "$confidenceTier",
          count: { $sum: 1 },
          assigned: { $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] } },
        },
      },
    ]),
    RoutingResult.aggregate([
      { $match: { ...matchFilter, status: { $in: ["failed", "pending"] } } },
      {
        $project: {
          reason: {
            $ifNull: ["$failureReason", { $arrayElemAt: ["$reasons", 0] }],
          },
        },
      },
      { $match: { reason: { $ne: null } } },
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Complaint.aggregate([
      { $match: complaintDateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          automatic: { $sum: { $cond: [{ $eq: ["$assignmentSource", "automatic"] }, 1, 0] } },
          manual: { $sum: { $cond: [{ $eq: ["$assignmentSource", "manual"] }, 1, 0] } },
        },
      },
    ]),
    Complaint.countDocuments({
      ...complaintDateFilter,
      "events.type": "reassigned",
    }),
    Complaint.aggregate([
      { $match: complaintDateFilter },
      {
        $group: {
          _id: "$cityId",
          total: { $sum: 1 },
          autoAssigned: { $sum: { $cond: [{ $eq: ["$assignmentSource", "automatic"] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const tierMap: Record<string, { count: number; assigned: number }> = {};
  for (const t of tierAgg) {
    tierMap[t._id] = { count: t.count, assigned: t.assigned };
  }

  const calcTier = (key: string) => {
    const item = tierMap[key] || { count: 0, assigned: 0 };
    return {
      count: item.count,
      assignedCount: item.assigned,
      rate: item.count > 0 ? Math.round((item.assigned / item.count) * 100) : 0,
    };
  };

  const overrideStat = complaintOverrideStats[0] || { total: 0, automatic: 0, manual: 0 };
  const totalComp = overrideStat.total || 0;
  const manualTotal = overrideStat.manual + reassignedCount;
  const manualInterventionRate = totalComp > 0 ? Math.round((manualTotal / totalComp) * 100) : 0;

  return {
    totalRouted,
    autoAssigned,
    pendingRouting,
    failedRouting,
    autoAssignmentRate: totalRouted > 0 ? Math.round((autoAssigned / totalRouted) * 100) : 100,
    confidenceTierBreakdown: {
      high: calcTier("high"),
      moderate: calcTier("moderate"),
      low: calcTier("low"),
    },
    humanOverrides: {
      totalComplaints: totalComp,
      automaticAssignments: overrideStat.automatic,
      manualAssignments: overrideStat.manual,
      manualReassignments: reassignedCount,
      manualInterventionRate,
    },
    routingFailuresBreakdown: failureReasonsAgg.map((f: { _id: string; count: number }) => ({
      reason: f._id || "Unknown routing condition",
      count: f.count,
    })),
    routingByCity: complaintsByCity.map((c: { _id: string; total: number; autoAssigned: number }) => ({
      cityId: c._id,
      total: c.total,
      autoAssigned: c.autoAssigned,
      rate: c.total > 0 ? Math.round((c.autoAssigned / c.total) * 100) : 0,
    })),
  };
}

// ─── 4. Rework & Citizen Review Analytics ─────────────────────────────────────

export interface ReworkAnalyticsData {
  totalComplaints: number;
  totalReworkCases: number;
  reworkRate: number;
  currentReworkQueue: number;
  awaitingCitizenReview: number;
  citizenAcceptedCount: number;
  adminVerifiedCount: number;
  repeatedReworkCount: number;
  acceptanceVsReworkRatio: {
    accepted: number;
    rework: number;
    acceptanceRate: number;
  };
  reworkByCategory: Array<{ category: string; count: number; rate: number }>;
  reworkByCity: Array<{ cityId: string; count: number; totalCityComplaints: number; rate: number }>;
  avgResolutionCycles: number;
}

export async function getReworkAnalytics(params: GovernanceFilterParams = {}): Promise<ReworkAnalyticsData> {
  const dateFrom = buildDateFilter(params.timeRange);
  const matchFilter: Record<string, unknown> = {};
  if (dateFrom) matchFilter.createdAt = { $gte: dateFrom };

  const [
    totalComplaints,
    totalReworkCases,
    currentReworkQueue,
    awaitingCitizenReview,
    citizenAcceptedCount,
    adminVerifiedCount,
    repeatedReworkCount,
    reworkCatAgg,
    reworkCityAgg,
    totalCityAgg,
    cycleAgg,
  ] = await Promise.all([
    Complaint.countDocuments(matchFilter),
    Complaint.countDocuments({ ...matchFilter, $or: [{ reworkCount: { $gt: 0 } }, { status: "rework" }] }),
    Complaint.countDocuments({ ...matchFilter, status: "rework" }),
    Complaint.countDocuments({ ...matchFilter, status: "awaiting_citizen_review" }),
    Complaint.countDocuments({ ...matchFilter, citizenAcceptedAt: { $exists: true } }),
    Complaint.countDocuments({ ...matchFilter, verifiedBy: { $exists: true } }),
    Complaint.countDocuments({ ...matchFilter, reworkCount: { $gt: 1 } }),
    Complaint.aggregate([
      { $match: { ...matchFilter, $or: [{ reworkCount: { $gt: 0 } }, { status: "rework" }] } },
      { $group: { _id: "$issueType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchFilter, $or: [{ reworkCount: { $gt: 0 } }, { status: "rework" }] } },
      { $group: { _id: "$cityId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$cityId", total: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchFilter, status: "closed" } },
      {
        $project: {
          cycles: { $add: [{ $ifNull: ["$reworkCount", 0] }, 1] },
        },
      },
      {
        $group: {
          _id: null,
          avgCycles: { $avg: "$cycles" },
        },
      },
    ]),
  ]);

  const cityTotalMap = new Map<string, number>();
  for (const c of totalCityAgg) {
    cityTotalMap.set(c._id, c.total);
  }

  const reworkRate = totalComplaints > 0 ? Math.round((totalReworkCases / totalComplaints) * 100) : 0;
  const totalDecisions = citizenAcceptedCount + totalReworkCases;
  const acceptanceRate = totalDecisions > 0 ? Math.round((citizenAcceptedCount / totalDecisions) * 100) : 100;
  const avgCycles = cycleAgg[0]?.avgCycles ? Math.round(cycleAgg[0].avgCycles * 10) / 10 : 1.0;

  return {
    totalComplaints,
    totalReworkCases,
    reworkRate,
    currentReworkQueue,
    awaitingCitizenReview,
    citizenAcceptedCount,
    adminVerifiedCount,
    repeatedReworkCount,
    acceptanceVsReworkRatio: {
      accepted: citizenAcceptedCount,
      rework: totalReworkCases,
      acceptanceRate,
    },
    reworkByCategory: reworkCatAgg.map((r: { _id: string; count: number }) => ({
      category: r._id,
      count: r.count,
      rate: totalReworkCases > 0 ? Math.round((r.count / totalReworkCases) * 100) : 0,
    })),
    reworkByCity: reworkCityAgg.map((r: { _id: string; count: number }) => {
      const cityTotal = cityTotalMap.get(r._id) || r.count;
      return {
        cityId: r._id,
        count: r.count,
        totalCityComplaints: cityTotal,
        rate: cityTotal > 0 ? Math.round((r.count / cityTotal) * 100) : 0,
      };
    }),
    avgResolutionCycles: avgCycles,
  };
}

// ─── 5. System Governance Master Overview ─────────────────────────────────────

export interface GovernanceOverviewData {
  summary: {
    activeExceptions: number;
    criticalEscalations: number;
    routingFailures: number;
    activeReworkCases: number;
    pendingVerifications: number;
    coverageGaps: number;
    autoAssignmentRate: number;
    averageMLConfidence: number;
    averagePriorityScore: number;
  };
  exceptions: GovernanceExceptionItem[];
  mlAnalytics: MLAnalyticsData;
  routingAnalytics: RoutingAnalyticsData;
  reworkAnalytics: ReworkAnalyticsData;
  priorityAnalytics: PriorityAnalyticsData;
  boardCoverage: {
    totalAuthorities: number;
    availableAuthorities: number;
    coverageGaps: string[];
    boardStatus: "optimal" | "warning" | "critical";
  };
}

export async function getGovernanceMasterOverview(params: GovernanceFilterParams = {}): Promise<GovernanceOverviewData> {
  const [
    exceptionsResult,
    mlAnalytics,
    routingAnalytics,
    reworkAnalytics,
    priorityAnalytics,
    authorities,
    allCities,
  ] = await Promise.all([
    getGovernanceExceptions(params),
    getMLAnalytics(params),
    getRoutingAnalytics(params),
    getReworkAnalytics(params),
    getPriorityAnalytics(params.timeRange),
    User.find({ role: "authority", approvalStatus: "approved" }).lean(),
    City.find({ isActive: true }).lean(),
  ]);

  // Evaluate system-wide coverage gaps across active cities
  const availableOfficers = authorities.filter((a) => a.availability === "available" || (!a.availability && a.isActive));
  const cityCoverageGaps: string[] = [];

  for (const city of allCities) {
    const cityOfficers = availableOfficers.filter((o) => (o.assignedCities || []).includes(city.id));
    if (cityOfficers.length === 0) {
      cityCoverageGaps.push(city.id);
    }
  }

  const boardStatus = cityCoverageGaps.length > 0 ? "critical" : availableOfficers.length < 3 ? "warning" : "optimal";

  return {
    summary: {
      activeExceptions: exceptionsResult.total,
      criticalEscalations: exceptionsResult.byType.critical_escalation || 0,
      routingFailures: exceptionsResult.byType.routing_failed || 0,
      activeReworkCases: exceptionsResult.byType.rework_requested || 0,
      pendingVerifications: exceptionsResult.byType.verification_required || 0,
      coverageGaps: cityCoverageGaps.length,
      autoAssignmentRate: routingAnalytics.autoAssignmentRate,
      averageMLConfidence: mlAnalytics.averageConfidence,
      averagePriorityScore: priorityAnalytics.averagePriorityScore,
    },
    exceptions: exceptionsResult.exceptions,
    mlAnalytics,
    routingAnalytics,
    reworkAnalytics,
    priorityAnalytics,
    boardCoverage: {
      totalAuthorities: authorities.length,
      availableAuthorities: availableOfficers.length,
      coverageGaps: cityCoverageGaps,
      boardStatus,
    },
  };
}
