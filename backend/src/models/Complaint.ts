import mongoose, { Document, Schema } from "mongoose";

export type ComplaintStatus =
  | "pending" // submitted, not yet assigned
  | "in-progress" // authority investigating
  | "resolved" // authority submitted resolution — awaiting admin verification
  | "rejected" // admin or system rejected
  | "rework" // admin returned to authority for rework
  | "closed"; // admin verified and closed — terminal

export type ComplaintPriority = "low" | "medium" | "high" | "critical";
export type IssueType =
  | "air_pollution"
  | "water_contamination"
  | "open_burning"
  | "noise"
  | "waste_dumping"
  | "chemical_spill"
  | "other";

export type ComplaintEventType =
  | "created"
  | "assigned"
  | "reassigned"
  | "status_change"
  | "image_added"
  | "image_removed"
  | "note_updated"
  | "resolved"
  | "rejected"
  | "verified"
  | "closed" // Phase 3C — admin approved
  | "rework_requested"
  | "resubmitted"; // Phase 3C — admin rejected / authority resubmitted

export interface IComplaintEvent {
  type: ComplaintEventType;
  message: string;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  timestamp: Date;
}

export interface IComplaint extends Document {
  title: string;
  description: string;
  issueType: IssueType;
  severity: ComplaintPriority;
  status: ComplaintStatus;
  cityId: string;
  location: { address?: string; lat?: number; lng?: number };
  images: string[];
  submittedBy: mongoose.Types.ObjectId;

  // ─── Assignment (Phase 3B) ────────────────────────────────────────────────
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  assignedByName?: string;

  resolution?: string;
  resolvedAt?: Date;
  internalNotes?: string;

  // ─── Verification (Phase 3C) ──────────────────────────────────────────────
  // Verification fields — set when admin approves the authority's resolution.
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verifiedByName?: string;

  // Rework fields — set when admin rejects the resolution for rework.
  // reworkCount tracks how many times this has happened.
  reworkReason?: string;
  reworkComments?: string;
  reworkCount?: number;

  events: IComplaintEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintEventSchema = new Schema<IComplaintEvent>(
  {
    type: { type: String, required: true },
    message: { type: String, required: true, maxlength: 600 },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, maxlength: 100 },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const ComplaintSchema = new Schema<IComplaint>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    issueType: {
      type: String,
      enum: [
        "air_pollution",
        "water_contamination",
        "open_burning",
        "noise",
        "waste_dumping",
        "chemical_spill",
        "other",
      ],
      required: true,
    },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected", "rework", "closed"],
      default: "pending",
    },
    cityId: { type: String, required: true, lowercase: true, index: true },
    location: { address: String, lat: Number, lng: Number },
    images: [{ type: String }],

    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    assignedByName: { type: String, maxlength: 100 },

    resolution: { type: String, trim: true },
    resolvedAt: { type: Date },
    internalNotes: { type: String, trim: true, maxlength: 5000 },

    // Verification
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    verifiedByName: { type: String, maxlength: 100 },

    // Rework
    reworkReason: { type: String, trim: true, maxlength: 1000 },
    reworkComments: { type: String, trim: true, maxlength: 2000 },
    reworkCount: { type: Number, default: 0, min: 0 },

    events: { type: [ComplaintEventSchema], default: [] },
  },
  { timestamps: true },
);

ComplaintSchema.index({ cityId: 1, status: 1 });
ComplaintSchema.index({ submittedBy: 1 });
ComplaintSchema.index({ assignedTo: 1, status: 1 });
ComplaintSchema.index({ status: 1, resolvedAt: -1 }); // verification queue
ComplaintSchema.index({ createdAt: -1 });

export const Complaint = mongoose.model<IComplaint>("Complaint", ComplaintSchema);
