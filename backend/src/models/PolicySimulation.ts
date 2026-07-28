import mongoose, { Document, Schema } from "mongoose";

export interface PolicyLever {
  id: string;
  label: string;
  value: number;
  unit: string;
}

export interface SimulationResult {
  aqiDelta: number;
  projectedAqi: number;
  healthScore: number;
  ecoScore: number;
  sustainabilityScore: number;
  carbonReduction: number;
  estimatedCost?: string;
  timeToEffect?: string;
  // Phase 5 — extended metrics (optional so existing documents remain valid)
  pm25Delta?: number;
  projectedPm25?: number;
  pm10Delta?: number;
  projectedPm10?: number;
  riskScoreDelta?: number;
  projectedRiskScore?: number;
  waterQualityDelta?: number;
  projectedWaterQuality?: number;
  sustainabilityIndex?: number;
}

export interface ExecutiveScoreSnapshot {
  environmentalImpactScore: number;
  sustainabilityScore: number;
  policyEffectivenessScore: number;
  publicHealthImprovementScore: number;
  longTermBenefitScore: number;
  overallScore: number;
  verdict: string;
}

export interface IPolicySimulation extends Document {
  name: string;
  cityId: string;
  baselineAqi: number;
  levers: PolicyLever[];
  results: SimulationResult;
  aiInsight?: string;
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  // Phase 5 — additive fields
  presetId?: string;
  presetName?: string;
  executiveScores?: ExecutiveScoreSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySimulationSchema = new Schema<IPolicySimulation>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    cityId: { type: String, required: true, lowercase: true, index: true },
    baselineAqi: { type: Number, required: true },
    levers: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: Number, required: true },
        unit: { type: String, required: true },
      },
    ],
    results: {
      aqiDelta: { type: Number, required: true },
      projectedAqi: { type: Number, required: true },
      healthScore: { type: Number, required: true },
      ecoScore: { type: Number, required: true },
      sustainabilityScore: { type: Number, required: true },
      carbonReduction: { type: Number, required: true },
      estimatedCost: { type: String },
      timeToEffect: { type: String },
      // Phase 5 — extended metrics
      pm25Delta: { type: Number },
      projectedPm25: { type: Number },
      pm10Delta: { type: Number },
      projectedPm10: { type: Number },
      riskScoreDelta: { type: Number },
      projectedRiskScore: { type: Number },
      waterQualityDelta: { type: Number },
      projectedWaterQuality: { type: Number },
      sustainabilityIndex: { type: Number },
    },
    aiInsight: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublic: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, lowercase: true }],
    // Phase 5 — additive fields
    presetId: { type: String },
    presetName: { type: String },
    executiveScores: {
      environmentalImpactScore: { type: Number },
      sustainabilityScore: { type: Number },
      policyEffectivenessScore: { type: Number },
      publicHealthImprovementScore: { type: Number },
      longTermBenefitScore: { type: Number },
      overallScore: { type: Number },
      verdict: { type: String },
    },
  },
  { timestamps: true },
);

PolicySimulationSchema.index({ cityId: 1, createdAt: -1 });
PolicySimulationSchema.index({ createdBy: 1 });

export const PolicySimulation = mongoose.model<IPolicySimulation>(
  "PolicySimulation",
  PolicySimulationSchema,
);
