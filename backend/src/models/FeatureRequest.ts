import mongoose, { Document, Schema } from "mongoose";

// "resolved" / "reopened" added for the Administrator Communication Hub so
// feature requests follow the same Reply → Resolve → Reopen workflow used
// across the Hub. Existing product-management values are unchanged.
export type FeatureStatus =
  | "submitted" | "planned" | "in_progress" | "shipped" | "declined" | "resolved" | "reopened";

export interface IFeatureComment {
  body:       string;
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  authorRole?: "citizen" | "authority" | "administrator";
  isSystem?:  boolean;
  createdAt:  Date;
}

export interface IFeatureRequest extends Document {
  title:           string;
  description:     string;
  category:        string;
  status:          FeatureStatus;
  votes:           mongoose.Types.ObjectId[];
  voteCount:       number;
  submittedBy:     mongoose.Types.ObjectId;
  estimatedRelease?: string;
  tags:            string[];
  comments:        IFeatureComment[];
  adminRead:       boolean;
  createdAt:       Date;
  updatedAt:       Date;
}

const FeatureCommentSchema = new Schema<IFeatureComment>(
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

const FeatureRequestSchema = new Schema<IFeatureRequest>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category:    { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ["submitted", "planned", "in_progress", "shipped", "declined", "resolved", "reopened"],
      default: "submitted",
    },
    votes:            [{ type: Schema.Types.ObjectId, ref: "User" }],
    voteCount:        { type: Number, default: 0 },
    submittedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    estimatedRelease: { type: String, trim: true, maxlength: 50 },
    tags:             [{ type: String, trim: true, maxlength: 50 }],
    comments:         { type: [FeatureCommentSchema], default: [] },
    adminRead:        { type: Boolean, default: false },
  },
  { timestamps: true },
);

FeatureRequestSchema.index({ voteCount: -1 });
FeatureRequestSchema.index({ status: 1 });
FeatureRequestSchema.index({ submittedBy: 1 });
FeatureRequestSchema.index({ adminRead: 1 });

export const FeatureRequest = mongoose.model<IFeatureRequest>("FeatureRequest", FeatureRequestSchema);
