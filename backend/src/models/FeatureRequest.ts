import mongoose, { Document, Schema } from "mongoose";

export type FeatureStatus =
  | "submitted" | "planned" | "in_progress" | "shipped" | "declined";

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
  createdAt:       Date;
  updatedAt:       Date;
}

const FeatureRequestSchema = new Schema<IFeatureRequest>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category:    { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ["submitted", "planned", "in_progress", "shipped", "declined"],
      default: "submitted",
    },
    votes:            [{ type: Schema.Types.ObjectId, ref: "User" }],
    voteCount:        { type: Number, default: 0 },
    submittedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    estimatedRelease: { type: String, trim: true, maxlength: 50 },
    tags:             [{ type: String, trim: true, maxlength: 50 }],
  },
  { timestamps: true },
);

FeatureRequestSchema.index({ voteCount: -1 });
FeatureRequestSchema.index({ status: 1 });
FeatureRequestSchema.index({ submittedBy: 1 });

export const FeatureRequest = mongoose.model<IFeatureRequest>("FeatureRequest", FeatureRequestSchema);
