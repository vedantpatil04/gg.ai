import mongoose, { Document, Schema } from "mongoose";

export interface IAIInsight extends Document {
  cityId: string;
  cityName: string;
  type: "city_insights" | "health_advice" | "alert_explanation" | "admin_summary";
  content: Record<string, unknown>;
  generatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const AIInsightSchema = new Schema<IAIInsight>(
  {
    cityId: { type: String, required: true, lowercase: true },
    cityName: { type: String, required: true },
    type: {
      type: String,
      enum: ["city_insights", "health_advice", "alert_explanation", "admin_summary"],
      required: true,
    },
    content: { type: Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index — auto-delete expired insights
AIInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AIInsightSchema.index({ cityId: 1, type: 1, generatedAt: -1 });

export const AIInsight = mongoose.model<IAIInsight>("AIInsight", AIInsightSchema);
