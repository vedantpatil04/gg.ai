import mongoose, { Document, Schema } from "mongoose";

export type BugSeverity = "minor" | "major" | "critical" | "blocker";

export interface IBugReport extends Document {
  title:       string;
  category:    string;
  severity:    BugSeverity;
  platform?:   string;
  browser?:    string;
  device?:     string;
  steps:       string;
  expected:    string;
  actual:      string;
  submittedBy: mongoose.Types.ObjectId;
  status:      "open" | "acknowledged" | "fixed" | "wontfix";
  createdAt:   Date;
  updatedAt:   Date;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    title:    { type: String, required: true, trim: true, maxlength: 300 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    severity: {
      type: String,
      enum: ["minor", "major", "critical", "blocker"],
      required: true,
    },
    platform: { type: String, trim: true, maxlength: 100 },
    browser:  { type: String, trim: true, maxlength: 50 },
    device:   { type: String, trim: true, maxlength: 50 },
    steps:    { type: String, required: true, trim: true, maxlength: 3000 },
    expected: { type: String, required: true, trim: true, maxlength: 1000 },
    actual:   { type: String, required: true, trim: true, maxlength: 1000 },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["open", "acknowledged", "fixed", "wontfix"],
      default: "open",
    },
  },
  { timestamps: true },
);

BugReportSchema.index({ submittedBy: 1 });
BugReportSchema.index({ severity: 1, status: 1 });

export const BugReport = mongoose.model<IBugReport>("BugReport", BugReportSchema);
