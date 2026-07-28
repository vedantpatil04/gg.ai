import mongoose, { Document, Schema } from "mongoose";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertCategory = "air" | "water" | "heat" | "flood" | "chemical" | "general";

export interface IAlert extends Document {
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  cityId: string;
  area: string;
  triggeredBy?: string;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  expiresAt?: Date;
  isAutomated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "acknowledged", "resolved"],
      default: "active",
    },
    category: {
      type: String,
      enum: ["air", "water", "heat", "flood", "chemical", "general"],
      default: "general",
    },
    cityId: { type: String, required: true, lowercase: true, index: true },
    area: { type: String, required: true, trim: true },
    triggeredBy: { type: String },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    expiresAt: { type: Date },
    isAutomated: { type: Boolean, default: true },
  },
  { timestamps: true },
);

AlertSchema.index({ cityId: 1, status: 1, createdAt: -1 });
AlertSchema.index({ severity: 1, status: 1 });

export const Alert = mongoose.model<IAlert>("Alert", AlertSchema);
