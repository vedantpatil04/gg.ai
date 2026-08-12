// ─── Transparent EcoScore engine (Phase 2) ────────────────────────────────────
//
// Single, centrally-defined, deterministic methodology for the Sustainability
// module's EcoScore. Replaces the previously opaque per-page score display
// with a documented weighted composite of five environmental dimensions,
// each normalized to a common 0–100 scale before weighting.
//
// This does NOT change the legacy `eco` field stored on EnvironmentalData
// (still written by ingestion.service.ts and consumed unchanged by the
// Dashboard, Gemini prompts, PDF exports and the simulation engine — none of
// that is in scope for Phase 2). This engine computes a *separate*,
// transparent score on demand from the same Phase 1 sustainability data,
// specifically for the Sustainability module.
//
// Deterministic: same input always produces the same output. No randomness,
// no AI/Gemini involvement.

// ─── Methodology: weights ──────────────────────────────────────────────────
// Centrally defined here only — never duplicate these weights in a React
// component. Must sum to 1.
export const ECO_SCORE_WEIGHTS = {
  airQuality: 0.3,
  greenCover: 0.25,
  renewableEnergy: 0.2,
  waterQuality: 0.15,
  wasteDiversion: 0.1,
} as const;

export type EcoScoreMetricKey = keyof typeof ECO_SCORE_WEIGHTS;

// ─── Methodology: normalization targets/bounds ────────────────────────────
// Documented per metric below, right above each normalization function.

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Air Quality (inverse metric — lower AQI is better).
 *
 *   raw AQI (0–500, project scale — see AQI_BANDS in src/lib/mock-data.ts)
 *     ↓
 *   0 = clean air, 300 = the existing "Very Unhealthy"/hazardous ceiling
 *   already used by the project's AQI banding
 *     ↓
 *   normalized 0–100 score, linear, clamped
 *
 * Reuses the exact AQI→score relationship already used to derive the
 * legacy `eco` field at ingestion time (ingestion.service.ts:
 * `100 - aqi / 3`), so this dimension isn't a competing new AQI
 * interpretation — it's the project's existing one, just centralized here.
 */
function normalizeAirQuality(aqi: number): number {
  return clamp(100 - aqi / 3, 0, 100);
}

/**
 * Green Cover (higher is better).
 *
 *   raw green cover % of city area (existing seeded field, 0–100)
 *     ↓
 *   target/bound: 40% treated as the "excellent" ceiling (UN-Habitat
 *   guidance commonly cites ~30–40% urban canopy as a strong benchmark)
 *     ↓
 *   normalized 0–100 score = (raw / 40) × 100, clamped
 */
const GREEN_COVER_TARGET_PCT = 40;
function normalizeGreenCover(greenCoverPct: number): number {
  return clamp((greenCoverPct / GREEN_COVER_TARGET_PCT) * 100, 0, 100);
}

/**
 * Renewable Energy (higher is better).
 *
 *   raw renewable share % of city energy mix (existing seeded field, 0–100)
 *     ↓
 *   target/bound: 60% treated as the "excellent" ceiling for a city-level
 *   renewable mix
 *     ↓
 *   normalized 0–100 score = (raw / 60) × 100, clamped
 */
const RENEWABLE_TARGET_PCT = 60;
function normalizeRenewableEnergy(renewableSharePct: number): number {
  return clamp((renewableSharePct / RENEWABLE_TARGET_PCT) * 100, 0, 100);
}

/**
 * Water Quality (higher is better).
 *
 *   raw water quality index (existing `water` field)
 *     ↓
 *   already expressed on a 0–100 index throughout the project (see e.g.
 *   gemini.service.ts: "Water Quality Index of ${cityData.water}/100")
 *     ↓
 *   normalized 0–100 score = raw, clamped defensively
 */
function normalizeWaterQuality(waterIndex: number): number {
  return clamp(waterIndex, 0, 100);
}

/**
 * Waste Diversion (higher is better).
 *
 * Phase 1's data-foundation audit found no legitimate backend source for
 * this metric — it does not exist on EnvironmentalData, and isn't ingested
 * or seeded anywhere in the project. Per the Phase 2 methodology's own
 * missing-data rule, this engine does NOT fabricate a value for it: when
 * `wasteDiversion` is not supplied, this dimension is excluded and the
 * remaining four weights are proportionally renormalized to sum to 100%
 * (see computeEcoScore below). The score's `dataComplete` /
 * `missingMetrics` fields make this explicit to the frontend rather than
 * silently treating the missing metric as 0 or inventing a plausible one.
 */
function normalizeWasteDiversion(wasteDiversionPct: number): number {
  return clamp(wasteDiversionPct, 0, 100);
}

const NORMALIZERS: Record<EcoScoreMetricKey, (raw: number) => number> = {
  airQuality: normalizeAirQuality,
  greenCover: normalizeGreenCover,
  renewableEnergy: normalizeRenewableEnergy,
  waterQuality: normalizeWaterQuality,
  wasteDiversion: normalizeWasteDiversion,
};

// ─── Methodology: grade mapping ────────────────────────────────────────────
// Reuses the project's existing EcoScore grade terminology (previously
// duplicated client-side as `ecoGrade()` in src/routes/sustainability.tsx —
// now centralized here as the single authoritative definition so the score
// and grade can never disagree).
export function gradeForEcoScore(score: number): string {
  if (score >= 85) return "A+";
  if (score >= 75) return "A";
  if (score >= 65) return "B+";
  if (score >= 55) return "B";
  if (score >= 45) return "C+";
  return "C";
}

// ─── Types ─────────────────────────────────────────────────────────────────
export interface EcoScoreInput {
  aqi: number;
  water: number;
  greenCover?: number;
  renewableShare?: number;
  /** Reserved: no real source exists in the project yet (see
   *  normalizeWasteDiversion above). Always undefined today. */
  wasteDiversion?: number;
}

export interface EcoScoreMetricBreakdown {
  /** Raw metric value as stored, or null when unavailable. */
  rawValue: number | null;
  /** Metric normalized to 0–100, or null when unavailable. */
  normalizedScore: number | null;
  /** Nominal methodology weight (always the value from ECO_SCORE_WEIGHTS). */
  weight: number;
  /** Weight actually applied after renormalizing for any missing metrics. */
  effectiveWeight: number;
  /** normalizedScore × effectiveWeight — this metric's points toward the
   *  composite score. 0 when unavailable. */
  contribution: number;
  available: boolean;
}

export interface EcoScoreResult {
  score: number;
  grade: string;
  /** False when one or more methodology inputs were unavailable — the score
   *  still reflects the available metrics (reweighted), it just isn't based
   *  on all five dimensions yet. */
  dataComplete: boolean;
  missingMetrics: EcoScoreMetricKey[];
  breakdown: Record<EcoScoreMetricKey, EcoScoreMetricBreakdown>;
}

// ─── Composite calculation ─────────────────────────────────────────────────
/**
 * Deterministic weighted composite of the five EcoScore dimensions.
 *
 * Same input → same output, always. Metrics that are `undefined` on the
 * input are treated as genuinely unavailable (not as 0 or any other
 * fabricated value): their weight is excluded from the composite and the
 * remaining available weights are proportionally scaled back up to 100%,
 * so a missing metric never silently drags the score toward "poor" — it's
 * instead reflected honestly via `dataComplete` / `missingMetrics`.
 */
export function computeEcoScore(input: EcoScoreInput): EcoScoreResult {
  const rawByMetric: Record<EcoScoreMetricKey, number | undefined> = {
    airQuality: input.aqi,
    greenCover: input.greenCover,
    renewableEnergy: input.renewableShare,
    waterQuality: input.water,
    wasteDiversion: input.wasteDiversion,
  };

  const keys = Object.keys(ECO_SCORE_WEIGHTS) as EcoScoreMetricKey[];

  const normalizedByMetric: Record<EcoScoreMetricKey, number | null> = keys.reduce(
    (acc, key) => {
      const raw = rawByMetric[key];
      acc[key] = raw == null || Number.isNaN(raw) ? null : NORMALIZERS[key](raw);
      return acc;
    },
    {} as Record<EcoScoreMetricKey, number | null>,
  );

  const missingMetrics = keys.filter((key) => normalizedByMetric[key] == null);
  const availableKeys = keys.filter((key) => normalizedByMetric[key] != null);
  const availableWeightSum =
    availableKeys.reduce((sum, key) => sum + ECO_SCORE_WEIGHTS[key], 0) || 1; // guard ÷0

  const breakdown = {} as Record<EcoScoreMetricKey, EcoScoreMetricBreakdown>;
  let score = 0;

  for (const key of keys) {
    const normalized = normalizedByMetric[key];
    const available = normalized != null;
    const effectiveWeight = available ? ECO_SCORE_WEIGHTS[key] / availableWeightSum : 0;
    const contribution = available ? Math.round(normalized! * effectiveWeight * 100) / 100 : 0;

    breakdown[key] = {
      rawValue: rawByMetric[key] ?? null,
      normalizedScore: available ? Math.round(normalized!) : null,
      weight: ECO_SCORE_WEIGHTS[key],
      effectiveWeight: Math.round(effectiveWeight * 1000) / 1000,
      contribution,
      available,
    };

    score += contribution;
  }

  const roundedScore = clamp(Math.round(score), 0, 100);

  return {
    score: roundedScore,
    grade: gradeForEcoScore(roundedScore),
    dataComplete: missingMetrics.length === 0,
    missingMetrics,
    breakdown,
  };
}
