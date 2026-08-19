import mongoose, { Document, Schema } from "mongoose";

export type BugSeverity = "minor" | "major" | "critical" | "blocker";

// "resolved" / "reopened" added for the Administrator Communication Hub so
// bug reports follow the same Reply → Resolve → Reopen workflow as tickets.
// Existing values (open/acknowledged/fixed/wontfix) are unchanged.
export type BugStatus = "open" | "acknowledged" | "fixed" | "wontfix" | "resolved" | "reopened";

export interface IBugComment {
  body:       string;
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  authorRole?: "citizen" | "authority" | "administrator";
  isSystem?:  boolean;
  createdAt:  Date;
}

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
  status:      BugStatus;
  comments:    IBugComment[];
  adminRead:   boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const BugCommentSchema = new Schema<IBugComment>(
  {
    body:       { type: String, required: true, maxlength: 2000 },
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, maxlength: 100 },
    authorRole: { type: String, enum: ["citizen", "authority", "administrator"] },
    isSystem:   { type: Boolean, default: false },
    createdAt:  { type: Date, default: () => new Date() },
  },
  { _id: true },
);

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
      enum: ["open", "acknowledged", "fixed", "wontfix", "resolved", "reopened"],
      default: "open",
    },
    comments:  { type: [BugCommentSchema], default: [] },
    adminRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BugReportSchema.index({ submittedBy: 1 });
BugReportSchema.index({ severity: 1, status: 1 });
BugReportSchema.index({ adminRead: 1 });

export const BugReport = mongoose.model<IBugReport>("BugReport", BugReportSchema);
