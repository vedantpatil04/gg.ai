import mongoose, { Document, Schema } from "mongoose";
import type { ComplaintPriority } from "./Complaint";

// Automation 7 — Priority Intelligence + Critical Escalation
//
// Dedicated persistence for Priority Intelligence assessments, mirroring the
// auditable collection pattern established for ComplaintPrediction (Automation 1)
// and RoutingResult (Automation 2). Preserves full historical record of priority
// evaluations, risk signals, and escalation transitions per complaint.

export type PriorityLevel = ComplaintPriority; // "low" | "medium" | "high" | "critical"
export type EscalationLevel = "none" | "attention" | "urgent" | "critical";
export type EscalationStatus = "not_escalated" | "escalated" | "acknowledged" | "resolved";

export interface IPriorityAssessment extends Document {
  complaint: mongoose.Types.ObjectId;
  priorityLevel: PriorityLevel;
  priorityScore: number; // 0 to 100
  escalationLevel: EscalationLevel;
  escalationStatus: EscalationStatus;
  reasons: string[];

  signals: {
    mlPredictedSeverity?: string;
    mlConfidence?: number;
    isHighRiskCategory?: boolean;
    citizenReportedSeverity?: string;
    activeEnvironmentalAlert?: boolean;
    activeAlertTitle?: string;
    reworkCount?: number;
    jurisdictionGap?: boolean;
  };

  escalatedAt?: Date;
  escalationAcknowledgedBy?: mongoose.Types.ObjectId;
  escalationAcknowledgedAt?: Date;
  escalationResolvedAt?: Date;

  engineVersion: string; // e.g. "priority-v1.0"
  assessedAt: Date;
  createdAt: Date;
}

const PriorityAssessmentSchema = new Schema<IPriorityAssessment>(
  {
    complaint: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    priorityLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    priorityScore: { type: Number, min: 0, max: 100, required: true },
    escalationLevel: {
      type: String,
      enum: ["none", "attention", "urgent", "critical"],
      required: true,
    },
    escalationStatus: {
      type: String,
      enum: ["not_escalated", "escalated", "acknowledged", "resolved"],
      default: "not_escalated",
      required: true,
    },
    reasons: { type: [String], default: [] },

    signals: {
      mlPredictedSeverity: { type: String },
      mlConfidence: { type: Number },
      isHighRiskCategory: { type: Boolean },
      citizenReportedSeverity: { type: String },
      activeEnvironmentalAlert: { type: Boolean },
      activeAlertTitle: { type: String },
      reworkCount: { type: Number },
      jurisdictionGap: { type: Boolean },
    },

    escalatedAt: { type: Date },
    escalationAcknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
    escalationAcknowledgedAt: { type: Date },
    escalationResolvedAt: { type: Date },

    engineVersion: { type: String, required: true, default: "priority-v1.0" },
    assessedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PriorityAssessmentSchema.index({ complaint: 1, assessedAt: -1 });
PriorityAssessmentSchema.index({ priorityLevel: 1, escalationStatus: 1 });

export const PriorityAssessment = mongoose.model<IPriorityAssessment>(
  "PriorityAssessment",
  PriorityAssessmentSchema,
);
