// ════════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE SERVICE — Phase 5
// ────────────────────────────────────────────────────────────────────────────
// Deterministic, explainable environmental-policy simulation engine.
// Same inputs ALWAYS produce the same outputs — no randomness anywhere.
// All weighted-impact formulas live HERE and only here; the controller and
// frontend both call into this module so there is a single source of truth
// for "what does turning lever X by Y% actually do".
// ════════════════════════════════════════════════════════════════════════════

export interface SimulationLevers {
  ev: number; // EV adoption (%)            0–100
  traffic: number; // Traffic reduction (%)      0–60
  trees: number; // Tree plantation (count, thousands/yr) 0–500
  industry: number; // Industrial growth (%)      0–30
  renewable: number; // Renewable energy adoption (%) 0–100
  publicTransport: number; // Public transport usage (%) 0–100
  wasteManagement: number; // Waste management efficiency (%) 0–100
  greenArea: number; // Green area expansion (%)   0–50
}

export const DEFAULT_LEVERS: SimulationLevers = {
  ev: 22,
  traffic: 12,
  trees: 84,
  industry: 8,
  renewable: 20,
  publicTransport: 15,
  wasteManagement: 30,
  greenArea: 10,
};

export const LEVER_BOUNDS: Record<
  keyof SimulationLevers,
  { min: number; max: number; unit: string; label: string }
> = {
  ev: { min: 0, max: 100, unit: "%", label: "EV Adoption" },
  traffic: { min: 0, max: 60, unit: "%", label: "Traffic Reduction" },
  trees: { min: 0, max: 500, unit: "k/yr", label: "Tree Plantation" },
  industry: { min: 0, max: 30, unit: "%", label: "Industrial Growth" },
  renewable: { min: 0, max: 100, unit: "%", label: "Renewable Energy Adoption" },
  publicTransport: { min: 0, max: 100, unit: "%", label: "Public Transport Usage" },
  wasteManagement: { min: 0, max: 100, unit: "%", label: "Waste Management Efficiency" },
  greenArea: { min: 0, max: 50, unit: "%", label: "Green Area Expansion" },
};

export interface CityBaseline {
  cityId: string;
  cityName: string;
  country: string;
  aqi: number;
  pm25: number;
  pm10: number;
  water: number;
  risk: number;
  eco: number;
  carbon: number;
  renewableShare?: number;
  greenCover?: number;
}

export interface SimulationResults {
  // Air quality
  aqiDelta: number;
  projectedAqi: number;
  pm25Delta: number;
  projectedPm25: number;
  pm10Delta: number;
  projectedPm10: number;
  // Scores
  ecoScoreDelta: number;
  projectedEcoScore: number;
  riskScoreDelta: number;
  projectedRiskScore: number;
  sustainabilityIndex: number;
  // Impact metrics
  carbonReductionTons: number;
  waterQualityDelta: number;
  projectedWaterQuality: number;
  healthScore: number;
  // Legacy-compatible aliases (kept for the existing PolicySimulation schema / frontend)
  healthScoreLegacy: number;
  ecoScore: number;
  sustainabilityScore: number;
  carbonReduction: number;
}

export interface ExecutiveScores {
  environmentalImpactScore: number; // 0-100
  sustainabilityScore: number; // 0-100
  policyEffectivenessScore: number; // 0-100
  publicHealthImprovementScore: number; // 0-100
  longTermBenefitScore: number; // 0-100
  overallScore: number; // 0-100, weighted composite
  verdict: "Highly Recommended" | "Recommended" | "Moderate Impact" | "Not Recommended";
}

/**
 * Per-lever weighted coefficients used to compute deltas.
 * These are intentionally explicit and documented so results are explainable —
 * a judge/reviewer can trace exactly why a given AQI delta was produced.
 *
 * Sign convention: negative AQI/PM/risk deltas are improvements (less pollution).
 * Positive EcoScore/sustainability/water deltas are improvements.
 */
const WEIGHTS = {
  aqi: {
    ev: -0.15,
    traffic: -0.25,
    trees: -0.02,
    industry: 0.4,
    renewable: -0.08,
    publicTransport: -0.1,
    wasteManagement: -0.02,
    greenArea: -0.05,
  },
  pm25: {
    ev: -0.28,
    traffic: -0.55,
    trees: -0.05,
    industry: 0.65,
    renewable: -0.14,
    publicTransport: -0.2,
    wasteManagement: -0.06,
    greenArea: -0.08,
  },
  pm10: {
    ev: -0.2,
    traffic: -0.4,
    trees: -0.07,
    industry: 0.55,
    renewable: -0.1,
    publicTransport: -0.16,
    wasteManagement: -0.08,
    greenArea: -0.12,
  },
  eco: {
    ev: 0.18,
    traffic: 0.16,
    trees: 0.022,
    industry: -0.45,
    renewable: 0.22,
    publicTransport: 0.14,
    wasteManagement: 0.12,
    greenArea: 0.2,
  },
  risk: {
    // risk SCORE reduction (lower risk is better) per unit lever
    ev: -0.2,
    traffic: -0.3,
    trees: -0.015,
    industry: 0.55,
    renewable: -0.16,
    publicTransport: -0.12,
    wasteManagement: -0.1,
    greenArea: -0.14,
  },
  water: {
    ev: 0.02,
    traffic: 0.03,
    trees: 0.015,
    industry: -0.2,
    renewable: 0.04,
    publicTransport: 0.02,
    wasteManagement: 0.35,
    greenArea: 0.1,
  },
  carbon: {
    // tCO2e reduced per capita per unit lever (always non-negative contribution to reduction)
    ev: 0.024,
    traffic: 0.018,
    trees: 0.0012,
    industry: -0.05,
    renewable: 0.03,
    publicTransport: 0.016,
    wasteManagement: 0.01,
    greenArea: 0.008,
  },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function weightedSum(
  levers: SimulationLevers,
  weights: Record<keyof SimulationLevers, number>,
): number {
  return (
    levers.ev * weights.ev +
    levers.traffic * weights.traffic +
    levers.trees * weights.trees +
    levers.industry * weights.industry +
    levers.renewable * weights.renewable +
    levers.publicTransport * weights.publicTransport +
    levers.wasteManagement * weights.wasteManagement +
    levers.greenArea * weights.greenArea
  );
}

/**
 * Normalizes raw lever input (fills missing levers with defaults, clamps to bounds).
 * Accepts a partial object so existing callers passing only 4 levers keep working.
 */
export function normalizeLevers(input: Partial<SimulationLevers>): SimulationLevers {
  const merged: SimulationLevers = { ...DEFAULT_LEVERS, ...input };
  const out = {} as SimulationLevers;
  (Object.keys(LEVER_BOUNDS) as Array<keyof SimulationLevers>).forEach((key) => {
    const bound = LEVER_BOUNDS[key];
    const raw = Number(merged[key]);
    out[key] = clamp(Number.isFinite(raw) ? raw : DEFAULT_LEVERS[key], bound.min, bound.max);
  });
  return out;
}

/**
 * Core deterministic calculation. Pure function — no I/O, no randomness,
 * no Date.now(). Given identical (baseline, levers) it always returns the
 * identical SimulationResults object.
 */
export function calculateSimulation(
  baseline: CityBaseline,
  leversInput: Partial<SimulationLevers>,
): SimulationResults {
  const levers = normalizeLevers(leversInput);

  const aqiDelta = weightedSum(levers, WEIGHTS.aqi);
  const maxImprovement = baseline.aqi * 0.6;

  const projectedAqi = clamp(
    Math.round(baseline.aqi - Math.min(Math.abs(aqiDelta), maxImprovement)),
    5,
    500,
  );

  const pm25Delta = weightedSum(levers, WEIGHTS.pm25);
  const projectedPm25 = clamp(Math.round((baseline.pm25 + pm25Delta) * 10) / 10, 2, 500);

  const pm10Delta = weightedSum(levers, WEIGHTS.pm10);
  const projectedPm10 = clamp(Math.round((baseline.pm10 + pm10Delta) * 10) / 10, 4, 600);

  const ecoScoreDelta = weightedSum(levers, WEIGHTS.eco);
  const projectedEcoScore = clamp(Math.round(baseline.eco + ecoScoreDelta), 0, 100);

  const riskScoreDelta = weightedSum(levers, WEIGHTS.risk);
  const projectedRiskScore = clamp(Math.round(baseline.risk + riskScoreDelta), 0, 100);

  const waterQualityDelta = weightedSum(levers, WEIGHTS.water);
  const projectedWaterQuality = clamp(Math.round(baseline.water + waterQualityDelta), 0, 100);

  // Carbon reduction is expressed as a positive "tons reduced" number.
  const carbonRaw = weightedSum(levers, WEIGHTS.carbon);
  const carbonReductionTons = Math.max(0, Math.round(carbonRaw * 10) / 10);

  // Health score: composite of AQI improvement + PM2.5 improvement, scaled 0-100.
  const aqiImprovement = baseline.aqi - projectedAqi;
  const pm25Improvement = baseline.pm25 - projectedPm25;
  const healthScore = clamp(
    Math.round(50 + aqiImprovement * 0.55 + pm25Improvement * 0.35),
    0,
    100,
  );

  // Sustainability index: blends EcoScore, risk reduction, water quality and tree/green-area effort.
  const sustainabilityIndex = clamp(
    Math.round(
      projectedEcoScore * 0.4 +
        (100 - projectedRiskScore) * 0.25 +
        projectedWaterQuality * 0.15 +
        Math.min(100, levers.trees / 5 + levers.greenArea * 1.2) * 0.2,
    ),
    0,
    100,
  );

  return {
    aqiDelta: Math.round(aqiDelta * 10) / 10,
    projectedAqi,
    pm25Delta: Math.round(pm25Delta * 10) / 10,
    projectedPm25,
    pm10Delta: Math.round(pm10Delta * 10) / 10,
    projectedPm10,
    ecoScoreDelta: Math.round(ecoScoreDelta * 10) / 10,
    projectedEcoScore,
    riskScoreDelta: Math.round(riskScoreDelta * 10) / 10,
    projectedRiskScore,
    sustainabilityIndex,
    carbonReductionTons,
    waterQualityDelta: Math.round(waterQualityDelta * 10) / 10,
    projectedWaterQuality,
    healthScore,
    // Legacy-compatible fields (existing model/frontend keys)
    healthScoreLegacy: healthScore,
    ecoScore: projectedEcoScore,
    sustainabilityScore: sustainabilityIndex,
    carbonReduction: carbonReductionTons,
  };
}

/**
 * Executive scoring — translates raw simulation deltas into the five
 * decision-support scores requested by the PRD, plus a categorical verdict.
 * Deterministic and explainable: every component is a clamped linear
 * transform of an existing result field.
 */
export function calculateExecutiveScores(
  baseline: CityBaseline,
  results: SimulationResults,
): ExecutiveScores {
  const aqiImprovementPct =
    baseline.aqi > 0 ? ((baseline.aqi - results.projectedAqi) / baseline.aqi) * 100 : 0;

  const environmentalImpactScore = clamp(
    Math.round(
      50 +
        aqiImprovementPct * 0.8 +
        (results.projectedRiskScore < baseline.risk
          ? (baseline.risk - results.projectedRiskScore) * 0.6
          : 0),
    ),
    0,
    100,
  );

  const sustainabilityScore = results.sustainabilityIndex;

  const policyEffectivenessScore = clamp(
    Math.round(
      environmentalImpactScore * 0.5 + sustainabilityScore * 0.3 + results.healthScore * 0.2,
    ),
    0,
    100,
  );

  const publicHealthImprovementScore = results.healthScore;

  const longTermBenefitScore = clamp(
    Math.round(
      sustainabilityScore * 0.5 +
        Math.min(100, results.carbonReductionTons * 4) * 0.3 +
        environmentalImpactScore * 0.2,
    ),
    0,
    100,
  );

  const overallScore = clamp(
    Math.round(
      environmentalImpactScore * 0.25 +
        sustainabilityScore * 0.2 +
        policyEffectivenessScore * 0.25 +
        publicHealthImprovementScore * 0.15 +
        longTermBenefitScore * 0.15,
    ),
    0,
    100,
  );

  let verdict: ExecutiveScores["verdict"];
  if (overallScore >= 75) verdict = "Highly Recommended";
  else if (overallScore >= 55) verdict = "Recommended";
  else if (overallScore >= 35) verdict = "Moderate Impact";
  else verdict = "Not Recommended";

  return {
    environmentalImpactScore,
    sustainabilityScore,
    policyEffectivenessScore,
    publicHealthImprovementScore,
    longTermBenefitScore,
    overallScore,
    verdict,
  };
}

/** Computes the difference between two simulation results, for comparison mode. */
export function diffResults(a: SimulationResults, b: SimulationResults) {
  return {
    aqiDifference: Math.round((b.projectedAqi - a.projectedAqi) * 10) / 10,
    ecoScoreDifference: Math.round((b.projectedEcoScore - a.projectedEcoScore) * 10) / 10,
    sustainabilityDifference: Math.round((b.sustainabilityIndex - a.sustainabilityIndex) * 10) / 10,
    carbonImpactDifference: Math.round((b.carbonReductionTons - a.carbonReductionTons) * 10) / 10,
    healthImpactDifference: Math.round((b.healthScore - a.healthScore) * 10) / 10,
    riskScoreDifference: Math.round((b.projectedRiskScore - a.projectedRiskScore) * 10) / 10,
  };
}
