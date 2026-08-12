import mongoose, { Document, Schema } from "mongoose";
import type { RoutingStatus, RoutingConfidenceTier } from "../constants/smartRouting";

// Automation 2 — Smart Routing + Automated Assignment + Lifecycle Backend.
//
// Dedicated persistence for Smart Routing Engine decisions, mirroring the
// architecture already established for ComplaintPrediction (Automation 1):
// a separate, non-expiring, auditable collection rather than embedding
// routing state on the Complaint document itself. This keeps:
//   • a full routing history per complaint (a complaint may be routed once
//     automatically; later admin overrides are recorded on Complaint itself
//     via assignedTo/assignedBy/assignmentSource — this collection is never
//     mutated by an override, preserving the original automatic decision
//     for audit, matching blueprint section 20),
//   • the routing engine fully independent from the ML provider and from
//     the Complaint schema,
//   • the data Automation 4 (Authority Board) and Automation 6 (Governance)
//     will need later, without building any UI for them now.

export interface IRoutingResult extends Document {
  complaint: mongoose.Types.ObjectId;
  status: RoutingStatus; // "assigned" | "pending" | "failed"

  // Populated when status === "assigned".
  authority?: mongoose.Types.ObjectId;

  // Copied from the Own ML prediction consumed for this routing decision.
  // Left undefined when no usable prediction existed (e.g. ML prediction
  // failed) so that "no confidence available" is never confused with a real
  // 0-confidence prediction.
  confidence?: number;
  confidenceTier?: RoutingConfidenceTier;

  reasons: string[];

  // Populated when status === "failed" — an unexpected routing engine
  // exception, distinguished from "pending" (engine ran fine but decided
  // not to auto-assign: low confidence, or no eligible authority).
  failureReason?: string;

  routedAt: Date;
  routingVersion: string;

  createdAt: Date;
}

const RoutingResultSchema = new Schema<IRoutingResult>(
  {
    complaint: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    status: { type: String, enum: ["assigned", "pending", "failed"], required: true },

    authority: { type: Schema.Types.ObjectId, ref: "User" },

    confidence: { type: Number, min: 0, max: 1 },
    confidenceTier: { type: String, enum: ["high", "moderate", "low"] },

    reasons: { type: [String], default: [] },

    failureReason: { type: String, maxlength: 1000 },

    routedAt: { type: Date, required: true, default: () => new Date() },
    routingVersion: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Routing history per complaint, newest first.
RoutingResultSchema.index({ complaint: 1, routedAt: -1 });

export const RoutingResult = mongoose.model<IRoutingResult>("RoutingResult", RoutingResultSchema);
