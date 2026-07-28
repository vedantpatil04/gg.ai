import mongoose, { Document, Schema } from "mongoose";

export type ReportType =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual"
  | "Analytics"
  | "Compliance"
  | "Sustainability"
  | "Operations"
  | "Incident";

export interface IReport extends Document {
  title: string;
  type: ReportType;
  summary: string;
  cityId: string;
  generatedBy: mongoose.Types.ObjectId;
  fileUrl?: string;
  fileSize?: string;
  pages?: number;
  isPublic: boolean;
  tags: string[];
  metrics?: Record<string, number | string>;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    type: {
      type: String,
      enum: [
        "Daily",
        "Weekly",
        "Monthly",
        "Quarterly",
        "Annual",
        "Analytics",
        "Compliance",
        "Sustainability",
        "Operations",
        "Incident",
      ],
      required: true,
    },
    summary: { type: String, required: true, trim: true, maxlength: 5000 },
    cityId: { type: String, required: true, lowercase: true, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String },
    fileSize: { type: String },
    pages: { type: Number, min: 1 },
    isPublic: { type: Boolean, default: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    metrics: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

ReportSchema.index({ cityId: 1, createdAt: -1 });
ReportSchema.index({ type: 1 });

export const Report = mongoose.model<IReport>("Report", ReportSchema);
