import mongoose, { Document, Schema } from "mongoose";

// Added for the Administrator Communication Hub — Feedback previously had no
// status at all, so it couldn't be tracked as open/resolved/reopened like the
// other three communication types. "open" is the default so existing rows
// (read via .lean() with no status field) still fall back correctly.
export type FeedbackStatus = "open" | "resolved" | "reopened";

export interface IFeedbackComment {
  body:       string;
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  authorRole?: "citizen" | "authority" | "administrator";
  isSystem?:  boolean;
  createdAt:  Date;
}

export interface IFeedback extends Document {
  rating:         number;
  category:       string;
  comment:        string;
  nps:            number;
  uiSatisfaction: number;
  aiSatisfaction: number;
  submittedBy:    mongoose.Types.ObjectId;
  status:         FeedbackStatus;
  comments:       IFeedbackComment[];
  adminRead:      boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

const FeedbackCommentSchema = new Schema<IFeedbackComment>(
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

const FeedbackSchema = new Schema<IFeedback>(
  {
    rating:         { type: Number, required: true, min: 1, max: 5 },
    category:       { type: String, required: true, trim: true, maxlength: 100 },
    comment:        { type: String, trim: true, maxlength: 3000, default: "" },
    nps:            { type: Number, min: 0, max: 10, default: -1 },
    uiSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    aiSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    submittedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["open", "resolved", "reopened"],
      default: "open",
    },
    comments:  { type: [FeedbackCommentSchema], default: [] },
    adminRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

FeedbackSchema.index({ submittedBy: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ adminRead: 1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
