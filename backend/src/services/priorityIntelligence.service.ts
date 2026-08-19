/**
 * priorityIntelligence.service.ts
 *
 * Automation 7 — Priority Intelligence + Critical Escalation.
 *
 * Final intelligence layer that determines:
 * 1. Operational Priority (low, medium, high, critical)
 * 2. Criticality & Risk scoring (0 to 100)
 * 3. Escalation Level (none, attention, urgent, critical) & Escalation Status
 * 4. Deduplicated, non-blocking critical alerts (In-App + Email + FCM)
 * 5. Explainable, factual reasons synthesized from real data
 *
 * Inputs:
 * - Own ML (ComplaintPrediction)
 * - Citizen Reported Severity (Complaint.severity)
 * - Category Hazard Level (Complaint.issueType)
 * - Environmental Context (Alert model for cityId)
 * - Lifecycle & Rework History (Complaint.reworkCount)
 * - Operational Workforce Coverage (User model / city availability)
 */

import mongoose from "mongoose";
import { Complaint, type IComplaint, type ComplaintPriority } from "../models/Complaint";
import { ComplaintPrediction, type IComplaintPrediction } from "../models/ComplaintPrediction";
import { PriorityAssessment, type IPriorityAssessment, type EscalationLevel, type EscalationStatus } from "../models/PriorityAssessment";
import { Alert } from "../models/Alert";
import { User, type IUser } from "../models/User";
import { notifyCriticalEscalation, notifyEscalationAcknowledged, notifyEscalationResolved } from "./notification.service";
import { logger } from "../utils/logger";

// ─── High Hazard Categories ───────────────────────────────────────────────────

const HIGH_HAZARD_CATEGORIES = new Set(["chemical_spill", "water_contamination", "open_burning"]);

// ─── Main Priority Assessment Function ────────────────────────────────────────

export async function assessComplaintPriority(
  complaintOrId: string | mongoose.Types.ObjectId | IComplaint,
): Promise<IPriorityAssessment | null> {
  try {
    let complaint: IComplaint | null = null;
    if (typeof complaintOrId === "string" || complaintOrId instanceof mongoose.Types.ObjectId) {
      complaint = await Complaint.findById(complaintOrId);
    } else {
      complaint = complaintOrId;
    }

    if (!complaint) {
      logger.warn(`[priority] Cannot assess priority — complaint not found`);
      return null;
    }

    const complaintId = complaint._id;
    const cityId = (complaint.cityId || "belagavi").toLowerCase();

    // 1. Fetch multi-source signals in parallel
    const [latestPrediction, activeAlert, availableOfficersCount] = await Promise.all([
      ComplaintPrediction.findOne({ complaint: complaintId }).sort({ predictionTime: -1 }).lean(),
      Alert.findOne({ cityId, status: "active" }).sort({ createdAt: -1 }).lean(),
      User.countDocuments({
        role: "authority",
        approvalStatus: "approved",
        assignedCities: cityId,
        $or: [{ availability: "available" }, { availability: { $exists: false }, isActive: true }],
      }),
    ]);

    const reasons: string[] = [];
    let score = 0;

    // ── Signal A: Own ML Predicted Severity ───────────────────────────────────
    const mlSev = latestPrediction?.severity;
    const mlConf = latestPrediction?.confidence ?? 0.5;

    if (mlSev === "critical") {
      score += 35;
      reasons.push(`Own ML predicted critical severity (${Math.round(mlConf * 100)}% confidence)`);
    } else if (mlSev === "high") {
      score += 25;
      reasons.push(`Own ML predicted high severity (${Math.round(mlConf * 100)}% confidence)`);
    } else if (mlSev === "medium") {
      score += 15;
    } else if (mlSev === "low") {
      score += 5;
    }

    // ── Signal B: Category Hazard Level ───────────────────────────────────────
    const isHighRiskCategory = HIGH_HAZARD_CATEGORIES.has(complaint.issueType);
    if (isHighRiskCategory) {
      score += 20;
      reasons.push(`High-hazard category: ${complaint.issueType.replace(/_/g, " ")}`);
    } else if (complaint.issueType === "waste_dumping" || complaint.issueType === "air_pollution") {
      score += 10;
    } else {
      score += 5;
    }

    // ── Signal C: ML Confidence Contribution ──────────────────────────────────
    score += Math.round(mlConf * 15);

    // ── Signal D: Citizen Reported Severity ───────────────────────────────────
    if (complaint.severity === "critical") {
      score += 20;
      reasons.push(`Citizen reported critical severity`);
    } else if (complaint.severity === "high") {
      score += 15;
    } else if (complaint.severity === "medium") {
      score += 10;
    } else {
      score += 5;
    }

    // ── Signal E: Contextual Active Environmental Alert ────────────────────────
    let activeAlertTitle: string | undefined;
    if (activeAlert) {
      if (activeAlert.severity === "critical") {
        score += 15;
        activeAlertTitle = activeAlert.title;
        reasons.push(`Active critical environmental alert in ${cityId.toUpperCase()}: "${activeAlert.title}"`);
      } else if (activeAlert.severity === "warning") {
        score += 10;
        activeAlertTitle = activeAlert.title;
        reasons.push(`Active environmental warning alert in ${cityId.toUpperCase()}`);
      }
    }

    // ── Signal F: Lifecycle & Rework History ───────────────────────────────────
    const reworkCount = complaint.reworkCount ?? 0;
    if (reworkCount > 1) {
      score += 15;
      reasons.push(`Repeated investigation rework (${reworkCount} cycles requested)`);
    } else if (reworkCount === 1) {
      score += 10;
      reasons.push(`Citizen requested investigation rework`);
    }

    // ── Signal G: Operational Workforce Coverage ──────────────────────────────
    const jurisdictionGap = availableOfficersCount === 0;
    if (jurisdictionGap) {
      score += 10;
      reasons.push(`Jurisdiction coverage gap: 0 available officers in ${cityId.toUpperCase()}`);
    }

    // ── Score Clamping & Priority Level Resolution ────────────────────────────
    const priorityScore = Math.min(100, Math.max(5, score));
    let priorityLevel: ComplaintPriority = "medium";
    let escalationLevel: EscalationLevel = "none";

    if (priorityScore >= 75 || (mlSev === "critical" && isHighRiskCategory)) {
      priorityLevel = "critical";
      escalationLevel = "critical";
    } else if (priorityScore >= 50) {
      priorityLevel = "high";
      escalationLevel = "urgent";
    } else if (priorityScore >= 30) {
      priorityLevel = "medium";
      escalationLevel = "attention";
    } else {
      priorityLevel = "low";
      escalationLevel = "none";
    }

    if (reasons.length === 0) {
      reasons.push(`Standard ${priorityLevel} priority incident`);
    }

    // ── Escalation State & Lifecycle Transition ───────────────────────────────
    const isCritical = priorityLevel === "critical" || escalationLevel === "critical";
    const previousEscalationStatus = complaint.escalationStatus || "not_escalated";
    let newEscalationStatus: EscalationStatus = previousEscalationStatus;
    let escalatedAt: Date | undefined = complaint.escalatedAt;

    if (isCritical && (previousEscalationStatus === "not_escalated" || !previousEscalationStatus)) {
      newEscalationStatus = "escalated";
      escalatedAt = new Date();
    }

    // Update Complaint document
    complaint.priorityLevel = priorityLevel;
    complaint.priorityScore = priorityScore;
    complaint.escalationLevel = escalationLevel;
    complaint.escalationStatus = newEscalationStatus;
    complaint.escalationReasons = reasons;
    if (escalatedAt) complaint.escalatedAt = escalatedAt;

    // Append timeline events if meaningful transition occurred
    if (isCritical && previousEscalationStatus === "not_escalated") {
      complaint.events.push({
        type: "critical_escalated",
        message: `Critical operational risk detected (Score ${priorityScore}/100): ${reasons.slice(0, 2).join("; ")}`,
        timestamp: new Date(),
      });
    }

    await complaint.save();

    // Persist immutable PriorityAssessment record
    const assessment = await PriorityAssessment.create({
      complaint: complaintId,
      priorityLevel,
      priorityScore,
      escalationLevel,
      escalationStatus: newEscalationStatus,
      reasons,
      signals: {
        mlPredictedSeverity: mlSev,
        mlConfidence: mlConf,
        isHighRiskCategory,
        citizenReportedSeverity: complaint.severity,
        activeEnvironmentalAlert: Boolean(activeAlert),
        activeAlertTitle,
        reworkCount,
        jurisdictionGap,
      },
      escalatedAt,
      engineVersion: "priority-v1.0",
      assessedAt: new Date(),
    });

    // ── Non-blocking Notification Dispatch ────────────────────────────────────
    if (isCritical && previousEscalationStatus === "not_escalated") {
      notifyCriticalEscalation(
        complaintId.toString(),
        complaint.title,
        cityId,
        priorityScore,
        reasons,
        complaint.assignedTo,
        complaint.issueType,
      ).catch((err) => {
        logger.warn(`[priority] notifyCriticalEscalation error: ${(err as Error).message}`);
      });
    }

    return assessment;
  } catch (err) {
    logger.error(`[priority] Priority assessment failed non-blockingly: ${(err as Error).message}`);
    return null;
  }
}

// ─── Query Latest Assessment ──────────────────────────────────────────────────

export async function getLatestPriorityAssessment(
  complaintId: string | mongoose.Types.ObjectId,
): Promise<IPriorityAssessment | null> {
  return PriorityAssessment.findOne({ complaint: complaintId }).sort({ assessedAt: -1 });
}

// ─── Acknowledge Critical Escalation ──────────────────────────────────────────

export async function acknowledgeEscalation(
  complaintId: string,
  user: IUser,
): Promise<IComplaint> {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error("Complaint not found");

  if (complaint.escalationStatus !== "escalated") {
    return complaint;
  }

  complaint.escalationStatus = "acknowledged";
  complaint.escalationAcknowledgedBy = user._id as mongoose.Types.ObjectId;
  complaint.escalationAcknowledgedAt = new Date();

  complaint.events.push({
    type: "escalation_acknowledged",
    message: `Critical escalation acknowledged by ${user.name} (${user.role})`,
    userId: user._id as mongoose.Types.ObjectId,
    userName: user.name,
    timestamp: new Date(),
  });

  await complaint.save();

  // Update latest assessment record if exists
  await PriorityAssessment.findOneAndUpdate(
    { complaint: complaint._id },
    {
      $set: {
        escalationStatus: "acknowledged",
        escalationAcknowledgedBy: user._id,
        escalationAcknowledgedAt: new Date(),
      },
    },
    { sort: { assessedAt: -1 } },
  );

  notifyEscalationAcknowledged(
    complaintId,
    complaint.title,
    user.name,
    complaint.assignedTo,
  ).catch((e) => logger.warn(`[priority] notifyEscalationAcknowledged error: ${e.message}`));

  return complaint;
}

// ─── Resolve Critical Escalation ──────────────────────────────────────────────

export async function resolveEscalation(
  complaintId: string,
  user: IUser,
): Promise<IComplaint> {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) throw new Error("Complaint not found");

  complaint.escalationStatus = "resolved";
  complaint.escalationResolvedAt = new Date();

  complaint.events.push({
    type: "escalation_resolved",
    message: `Critical escalation condition marked resolved by ${user.name} (${user.role})`,
    userId: user._id as mongoose.Types.ObjectId,
    userName: user.name,
    timestamp: new Date(),
  });

  await complaint.save();

  await PriorityAssessment.findOneAndUpdate(
    { complaint: complaint._id },
    {
      $set: {
        escalationStatus: "resolved",
        escalationResolvedAt: new Date(),
      },
    },
    { sort: { assessedAt: -1 } },
  );

  notifyEscalationResolved(
    complaintId,
    complaint.title,
    user.name,
    complaint.assignedTo,
  ).catch((e) => logger.warn(`[priority] notifyEscalationResolved error: ${e.message}`));

  return complaint;
}

// ─── Priority & Escalation Analytics ──────────────────────────────────────────

export interface PriorityAnalyticsData {
  totalAssessed: number;
  priorityDistribution: {
    critical: { count: number; percentage: number };
    high: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    low: { count: number; percentage: number };
  };
  escalationStatusBreakdown: {
    escalated: number;
    acknowledged: number;
    resolved: number;
    not_escalated: number;
  };
  escalationRate: number;
  averagePriorityScore: number;
  criticalByCity: Array<{ cityId: string; count: number }>;
  criticalByCategory: Array<{ category: string; count: number }>;
  recentEscalations: Array<{
    id: string;
    complaintId: string;
    title: string;
    cityId: string;
    priorityLevel: string;
    priorityScore: number;
    escalationStatus: string;
    reasons: string[];
    escalatedAt?: Date;
  }>;
}

export async function getPriorityAnalytics(timeRange?: "7d" | "30d" | "90d" | "all"): Promise<PriorityAnalyticsData> {
  const matchFilter: Record<string, unknown> = {};
  if (timeRange && timeRange !== "all") {
    const d = new Date();
    if (timeRange === "7d") d.setDate(d.getDate() - 7);
    else if (timeRange === "30d") d.setDate(d.getDate() - 30);
    else if (timeRange === "90d") d.setDate(d.getDate() - 90);
    matchFilter.createdAt = { $gte: d };
  }

  const [
    totalAssessed,
    priorityDistAgg,
    escalationStatusAgg,
    avgScoreAgg,
    criticalCityAgg,
    criticalCatAgg,
    recentEscalatedDocs,
  ] = await Promise.all([
    Complaint.countDocuments(matchFilter),
    Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$priorityLevel", count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$escalationStatus", count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchFilter, priorityScore: { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: "$priorityScore" } } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchFilter, priorityLevel: "critical" } },
      { $group: { _id: "$cityId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchFilter, priorityLevel: "critical" } },
      { $group: { _id: "$issueType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.find({ ...matchFilter, priorityLevel: "critical" })
      .sort({ escalatedAt: -1, updatedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const priorityMap: Record<string, number> = {};
  for (const p of priorityDistAgg) {
    if (p._id) priorityMap[p._id] = p.count;
  }

  const statusMap: Record<string, number> = {};
  for (const s of escalationStatusAgg) {
    if (s._id) statusMap[s._id] = s.count;
  }

  const total = totalAssessed || 1;
  const criticalCount = priorityMap.critical || 0;
  const highCount = priorityMap.high || 0;
  const mediumCount = priorityMap.medium || 0;
  const lowCount = priorityMap.low || 0;

  const totalEscalated = (statusMap.escalated || 0) + (statusMap.acknowledged || 0) + (statusMap.resolved || 0);

  return {
    totalAssessed,
    priorityDistribution: {
      critical: { count: criticalCount, percentage: Math.round((criticalCount / total) * 100) },
      high: { count: highCount, percentage: Math.round((highCount / total) * 100) },
      medium: { count: mediumCount, percentage: Math.round((mediumCount / total) * 100) },
      low: { count: lowCount, percentage: Math.round((lowCount / total) * 100) },
    },
    escalationStatusBreakdown: {
      escalated: statusMap.escalated || 0,
      acknowledged: statusMap.acknowledged || 0,
      resolved: statusMap.resolved || 0,
      not_escalated: statusMap.not_escalated || (totalAssessed - totalEscalated),
    },
    escalationRate: totalAssessed > 0 ? Math.round((totalEscalated / totalAssessed) * 100) : 0,
    averagePriorityScore: avgScoreAgg[0]?.avgScore ? Math.round(avgScoreAgg[0].avgScore) : 45,
    criticalByCity: criticalCityAgg.map((c: { _id: string; count: number }) => ({ cityId: c._id, count: c.count })),
    criticalByCategory: criticalCatAgg.map((c: { _id: string; count: number }) => ({ category: c._id, count: c.count })),
    recentEscalations: recentEscalatedDocs.map((d) => ({
      id: d._id.toString(),
      complaintId: d._id.toString(),
      title: d.title,
      cityId: d.cityId,
      priorityLevel: d.priorityLevel || "critical",
      priorityScore: d.priorityScore || 80,
      escalationStatus: d.escalationStatus || "escalated",
      reasons: d.escalationReasons || [],
      escalatedAt: d.escalatedAt,
    })),
  };
}
