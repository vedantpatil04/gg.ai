// Automation 2 — Smart Routing + Automated Assignment + Lifecycle Backend.
//
// SmartRoutingService is the single entry point the rest of the application
// talks to for automatic complaint routing. It is deliberately independent
// from the Own ML provider — it only ever *consumes* an already-persisted
// ComplaintPrediction (see services/complaintIntelligence.service.ts) and
// never calls Own ML, Gemini, or any other classifier itself:
//
//     Own ML → Prediction → Smart Routing Engine → Assignment
//
// Like generateComplaintPrediction (Automation 1), routeComplaint() never
// throws — a routing failure must never corrupt the complaint or be mistaken
// for a successful assignment. Every routing attempt, successful or not, is
// persisted to RoutingResult for explainability and audit (blueprint
// sections 11, 12, 20, 23).

import mongoose from "mongoose";
import { Complaint, type IComplaint } from "../models/Complaint";
import { User, type IUser } from "../models/User";
import { RoutingResult, type IRoutingResult } from "../models/RoutingResult";
import type { IComplaintPrediction } from "../models/ComplaintPrediction";
import { DEPARTMENT_LABELS } from "../constants/complaintIntelligence";
import {
  SMART_ROUTING_ENGINE_VERSION,
  SMART_ROUTING_MONITORED_MIN_CONFIDENCE,
  ROUTING_ACTIVE_WORKLOAD_STATUSES,
  getConfidenceTier,
  normalizeAuthorityDepartment,
  type RoutingConfidenceTier,
} from "../constants/smartRouting";
import { logger } from "../utils/logger";

// ─── Eligible candidate shape ────────────────────────────────────────────────
interface EligibleCandidate {
  user: IUser;
  workload: number;
}

// ─── Eligibility ──────────────────────────────────────────────────────────────
// Only approved + active + available + department-compatible +
// jurisdiction-compatible authorities may ever be considered. This query is
// entirely server-side — nothing here is influenced by client input.
async function findEligibleAuthorities(
  complaint: IComplaint,
  department: string,
): Promise<{ candidates: IUser[]; jurisdictionCandidateCount: number }> {
  if (!complaint.cityId) {
    return { candidates: [], jurisdictionCandidateCount: 0 };
  }

  // Jurisdiction + base eligibility filters that Mongo can apply directly.
  const jurisdictionCandidates = await User.find({
    role: "authority",
    approvalStatus: "approved",
    isActive: true,
    availability: "available",
    assignedCities: complaint.cityId,
  });

  // Department compatibility uses the normalization compatibility layer
  // (User.department is free text — see constants/smartRouting.ts) so it is
  // applied in application code rather than as a Mongo query operator.
  const candidates = jurisdictionCandidates.filter(
    (authority) => normalizeAuthorityDepartment(authority.department) === department,
  );

  return { candidates, jurisdictionCandidateCount: jurisdictionCandidates.length };
}

// ─── Workload ─────────────────────────────────────────────────────────────────
// Derived live from current Complaint data immediately before selection —
// never a stale/persisted counter (blueprint section 25).
async function getActiveWorkload(authorityId: mongoose.Types.ObjectId): Promise<number> {
  return Complaint.countDocuments({
    assignedTo: authorityId,
    status: { $in: ROUTING_ACTIVE_WORKLOAD_STATUSES },
  });
}

// ─── Selection ────────────────────────────────────────────────────────────────
// Deterministic, explainable scoring: workload is the primary differentiator
// among otherwise-eligible authorities (department/jurisdiction/availability
// are eligibility gates, already satisfied by this point). A specialization
// match against the complaint's issue type is used only as a secondary,
// fully deterministic tie-breaker, followed by authority id as a final
// tie-breaker — no randomness, no opaque AI/LLM decision.
function selectBestCandidate(
  candidates: EligibleCandidate[],
  complaint: IComplaint,
): EligibleCandidate {
  const sorted = [...candidates].sort((a, b) => {
    if (a.workload !== b.workload) return a.workload - b.workload;

    const aSpecialized = a.user.specializations?.includes(complaint.issueType) ? 1 : 0;
    const bSpecialized = b.user.specializations?.includes(complaint.issueType) ? 1 : 0;
    if (aSpecialized !== bSpecialized) return bSpecialized - aSpecialized;

    return a.user._id.toString().localeCompare(b.user._id.toString());
  });
  return sorted[0];
}

// ─── Persistence helpers ─────────────────────────────────────────────────────
async function persistRoutingResult(input: {
  complaintId: mongoose.Types.ObjectId;
  status: "assigned" | "pending" | "failed";
  authorityId?: mongoose.Types.ObjectId;
  confidence?: number;
  confidenceTier?: RoutingConfidenceTier;
  reasons: string[];
  failureReason?: string;
}): Promise<IRoutingResult | null> {
  try {
    return await RoutingResult.create({
      complaint: input.complaintId,
      status: input.status,
      authority: input.authorityId,
      confidence: input.confidence,
      confidenceTier: input.confidenceTier,
      reasons: input.reasons,
      failureReason: input.failureReason,
      routedAt: new Date(),
      routingVersion: SMART_ROUTING_ENGINE_VERSION,
    });
  } catch (persistErr) {
    // Mirrors generateComplaintPrediction's failure handling: even if the
    // audit record itself can't be persisted, never let that take down the
    // complaint or the routing attempt.
    logger.error("Failed to persist Smart Routing result", {
      complaintId: input.complaintId.toString(),
      error: persistErr instanceof Error ? persistErr.message : String(persistErr),
    });
    return null;
  }
}

async function assignComplaint(complaint: IComplaint, authority: IUser, reasons: string[]): Promise<void> {
  complaint.assignedTo = authority._id;
  complaint.assignedBy = undefined;
  complaint.assignedByName = "Smart Routing Engine";
  complaint.assignedAt = new Date();
  complaint.assignmentSource = "automatic";
  complaint.events.push({
    type: "assigned",
    message: `Automatically assigned to ${authority.name} by the Smart Routing Engine (${reasons[reasons.length - 1] ?? "eligibility criteria met"})`,
    timestamp: new Date(),
  });
  await complaint.save();
}

// ─── Main entry point ────────────────────────────────────────────────────────
/**
 * Routes a complaint using its already-persisted Own ML prediction.
 *
 * Must be called only after both the complaint and its Own ML prediction
 * (success or failure) have been persisted (blueprint section 22). Never
 * throws — on any unexpected failure, records a "failed" RoutingResult and
 * leaves the complaint exactly as it was (still recoverable by an admin).
 */
export async function routeComplaint(
  complaint: IComplaint,
  prediction: IComplaintPrediction | null,
): Promise<IRoutingResult | null> {
  try {
    // ── No usable prediction ──────────────────────────────────────────────
    // Distinguished from a routing engine error: the engine ran fine, it
    // simply had nothing safe to route on.
    if (!prediction || prediction.status !== "success" || prediction.confidence === undefined || !prediction.department) {
      return persistRoutingResult({
        complaintId: complaint._id,
        status: "pending",
        reasons: [
          prediction?.status === "failed"
            ? `Own ML prediction failed (${prediction.failureReason ?? "unknown error"}) — no automatic assignment`
            : "No Own ML prediction available yet — no automatic assignment",
        ],
      });
    }

    const { confidence, department } = prediction;
    const tier = getConfidenceTier(confidence);
    const departmentLabel = DEPARTMENT_LABELS[department] ?? department;

    // ── Low confidence — never auto-assign merely because an authority is
    //    available (blueprint section 14) ───────────────────────────────
    if (tier === "low") {
      return persistRoutingResult({
        complaintId: complaint._id,
        status: "pending",
        confidence,
        confidenceTier: tier,
        reasons: [
          `ML confidence ${(confidence * 100).toFixed(0)}% is below the monitored threshold (${(SMART_ROUTING_MONITORED_MIN_CONFIDENCE * 100).toFixed(0)}%) — routed to Admin for manual assignment`,
        ],
      });
    }

    // ── Eligibility ────────────────────────────────────────────────────────
    const { candidates, jurisdictionCandidateCount } = await findEligibleAuthorities(complaint, department);

    if (candidates.length === 0) {
      const reason =
        jurisdictionCandidateCount === 0
          ? `No approved, active, available authority found covering jurisdiction "${complaint.cityId}"`
          : `${jurisdictionCandidateCount} available authorit${jurisdictionCandidateCount === 1 ? "y" : "ies"} found for jurisdiction "${complaint.cityId}", but none in department "${departmentLabel}"`;
      return persistRoutingResult({
        complaintId: complaint._id,
        status: "pending",
        confidence,
        confidenceTier: tier,
        reasons: [`ML department: ${departmentLabel}`, reason],
      });
    }

    // ── Workload — computed live, immediately before selection ────────────
    const withWorkload: EligibleCandidate[] = await Promise.all(
      candidates.map(async (user) => ({ user, workload: await getActiveWorkload(user._id) })),
    );

    const best = selectBestCandidate(withWorkload, complaint);
    const workloadSummary = withWorkload
      .map((c) => `${c.user.name}: ${c.workload}`)
      .join(", ");

    const reasons = [
      `ML department: ${departmentLabel}`,
      `Authority department matches (${departmentLabel})`,
      `Complaint jurisdiction "${complaint.cityId}" matches authority coverage`,
      "Authority is approved and active",
      "Authority is available",
      `Current workload across eligible authorities — ${workloadSummary}`,
      `Selected ${best.user.name} (lowest active workload: ${best.workload})`,
      tier === "moderate"
        ? `Assigned under moderate confidence (${(confidence * 100).toFixed(0)}%) — flagged for monitoring`
        : `Assigned under high confidence (${(confidence * 100).toFixed(0)}%)`,
    ];

    await assignComplaint(complaint, best.user, reasons);

    return persistRoutingResult({
      complaintId: complaint._id,
      status: "assigned",
      authorityId: best.user._id,
      confidence,
      confidenceTier: tier,
      reasons,
    });
  } catch (err) {
    logger.error("Smart Routing engine failure", {
      complaintId: complaint._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    return persistRoutingResult({
      complaintId: complaint._id,
      status: "failed",
      failureReason: err instanceof Error ? err.message : "Unknown Smart Routing failure",
      reasons: [],
    });
  }
}

/**
 * Retrieves the most recent Smart Routing result for a complaint, if any.
 */
export async function getLatestRoutingResult(complaintId: string): Promise<IRoutingResult | null> {
  return RoutingResult.findOne({ complaint: complaintId }).sort({ routedAt: -1 });
}
