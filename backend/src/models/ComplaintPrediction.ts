import mongoose, { Document, Schema } from "mongoose";
import { COMPLAINT_DEPARTMENTS, COMPLAINT_SEVERITIES, type ComplaintDepartment } from "../constants/complaintIntelligence";
import type { IssueType, ComplaintPriority } from "./Complaint";

// Automation 1 — Own ML Complaint Intelligence Foundation.
//
// Dedicated persistence for Own ML prediction results. Inspected first:
// `AIInsight` (TTL-expiring, city-level Gemini insight cache — wrong shape
// and wrong lifecycle for a per-complaint, non-expiring, auditable ML
// record) and the `Complaint` model itself (embedding would make the
// authoritative Complaint document's shape depend on the replaceable ML
// layer, and would make future multi-version prediction history awkward).
// A dedicated collection keeps Own ML fully swappable and preserves a full
// prediction history per complaint (never overwritten), as required for
// future model comparison/auditability — without touching the existing
// Complaint schema at all.

export type PredictionStatus = "success" | "failed";

export interface IComplaintPrediction extends Document {
  complaint: mongoose.Types.ObjectId;
  status: PredictionStatus;

  // Populated when status === "success". Left undefined on failure so a
  // system failure can never be mistaken for a real (if low-confidence)
  // prediction of category/department/severity/confidence = 0.
  category?: IssueType;
  department?: ComplaintDepartment;
  severity?: ComplaintPriority;
  confidence?: number;
  reasons: string[];

  // Populated when status === "failed" — kept separate from `reasons` so a
  // failure explanation is never confused with real prediction signals.
  failureReason?: string;

  modelVersion: string;
  predictionTime: Date;

  // Extensibility for Automation 2 (Smart Routing) and Automation 6 (Admin
  // Governance) — deliberately left unpopulated and unused in this phase.
  routingResult?: string;
  override?: boolean;
  overrideReason?: string;

  createdAt: Date;
}

const ComplaintPredictionSchema = new Schema<IComplaintPrediction>(
  {
    complaint: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    status: { type: String, enum: ["success", "failed"], required: true },

    category: {
      type: String,
      enum: ["air_pollution", "water_contamination", "open_burning", "noise", "waste_dumping", "chemical_spill", "other"],
    },
    department: { type: String, enum: COMPLAINT_DEPARTMENTS },
    severity: { type: String, enum: COMPLAINT_SEVERITIES },
    confidence: { type: Number, min: 0, max: 1 },
    reasons: { type: [String], default: [] },

    failureReason: { type: String, maxlength: 1000 },

    modelVersion: { type: String, required: true },
    predictionTime: { type: Date, required: true, default: () => new Date() },

    // Reserved for Automation 2 / Automation 6 — not written to in this phase.
    routingResult: { type: String },
    override: { type: Boolean },
    overrideReason: { type: String, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Prediction history per complaint, newest first — supports future
// multi-version comparison without needing a schema change.
ComplaintPredictionSchema.index({ complaint: 1, predictionTime: -1 });

export const ComplaintPrediction = mongoose.model<IComplaintPrediction>(
  "ComplaintPrediction",
  ComplaintPredictionSchema,
);
