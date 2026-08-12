// Automation 1 — Own ML Complaint Intelligence Foundation.
//
// ComplaintIntelligenceService is the single entry point the rest of the
// application talks to for Own ML complaint classification. It:
//   1. builds the ML input contract from an existing Complaint document,
//   2. calls the currently active OwnMLProvider,
//   3. persists the result (success or failure) to ComplaintPrediction,
//   4. never throws — a prediction failure must never take down complaint
//      submission or corrupt the complaint (see generateComplaintPrediction).
//
// This is the "ComplaintIntelligenceService → OwnMLProvider → Model vX.Y"
// architecture described in the blueprint. Nothing here is the existing
// (Gemini-backed) AI Complaint Assistant, and this service's output is the
// authoritative classification — the AI Assistant's suggestions are not.

import type { IComplaint } from "../models/Complaint";
import { ComplaintPrediction, type IComplaintPrediction } from "../models/ComplaintPrediction";
import { getOwnMLProvider } from "./ownMLProvider.service";
import type { ComplaintMLInput } from "./complaintIntelligence.types";
import { logger } from "../utils/logger";

function buildComplaintMLInput(complaint: IComplaint): ComplaintMLInput {
  return {
    complaintId: complaint._id.toString(),
    title: complaint.title,
    description: complaint.description,
    declaredCategory: complaint.issueType,
    citizenSeveritySignal: complaint.severity,
    location: {
      latitude: complaint.location?.lat,
      longitude: complaint.location?.lng,
      address: complaint.location?.address,
      city: complaint.cityId,
    },
    evidence: { count: complaint.images?.length ?? 0 },
  };
}

/**
 * Runs Own ML prediction for a complaint and persists the result.
 *
 * Deliberately swallow-and-log on failure rather than throwing: Own ML is an
 * intelligence layer, not a gate on complaint submission. A failed
 * prediction is persisted as its own distinguishable record (status:
 * "failed") — it must never be recorded as a low-confidence success, and it
 * must never prevent the complaint itself from existing.
 */
export async function generateComplaintPrediction(complaint: IComplaint): Promise<IComplaintPrediction | null> {
  const provider = getOwnMLProvider();

  try {
    const input = buildComplaintMLInput(complaint);
    const result = await provider.predict(input);

    return await ComplaintPrediction.create({
      complaint: complaint._id,
      status: "success",
      category: result.category,
      department: result.department,
      severity: result.severity,
      confidence: result.confidence,
      reasons: result.reasons,
      modelVersion: result.modelVersion,
      predictionTime: result.predictionTime,
    });
  } catch (err) {
    logger.error("Own ML prediction failed", {
      complaintId: complaint._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });

    try {
      return await ComplaintPrediction.create({
        complaint: complaint._id,
        status: "failed",
        reasons: [],
        failureReason: err instanceof Error ? err.message : "Unknown Own ML prediction failure",
        modelVersion: provider.modelVersion,
        predictionTime: new Date(),
      });
    } catch (persistErr) {
      // Even the failure record couldn't be persisted — log and give up
      // silently. The complaint itself is entirely unaffected either way.
      logger.error("Failed to persist Own ML prediction-failure record", {
        complaintId: complaint._id.toString(),
        error: persistErr instanceof Error ? persistErr.message : String(persistErr),
      });
      return null;
    }
  }
}

/**
 * Retrieves the most recent Own ML prediction for a complaint, if any.
 */
export async function getLatestComplaintPrediction(
  complaintId: string,
): Promise<IComplaintPrediction | null> {
  return ComplaintPrediction.findOne({ complaint: complaintId }).sort({ predictionTime: -1 });
}
