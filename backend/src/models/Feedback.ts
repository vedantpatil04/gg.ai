import mongoose, { Document, Schema } from "mongoose";

export interface IFeedback extends Document {
  rating:         number;
  category:       string;
  comment:        string;
  nps:            number;
  uiSatisfaction: number;
  aiSatisfaction: number;
  submittedBy:    mongoose.Types.ObjectId;
  createdAt:      Date;
  updatedAt:      Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    rating:         { type: Number, required: true, min: 1, max: 5 },
    category:       { type: String, required: true, trim: true, maxlength: 100 },
    comment:        { type: String, trim: true, maxlength: 3000, default: "" },
    nps:            { type: Number, min: 0, max: 10, default: -1 },
    uiSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    aiSatisfaction: { type: Number, min: 0, max: 5, default: 0 },
    submittedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

FeedbackSchema.index({ submittedBy: 1 });
FeedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
