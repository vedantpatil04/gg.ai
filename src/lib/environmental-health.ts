/**
 * Composite "Environmental Health Score" for the Citizen Dashboard.
 *
 * Phase 1 shipped this as a placeholder that just echoed `city.eco` (the
 * separate eco/sustainability score already shown elsewhere on the page).
 * Phase 2 replaces that with a real, documented composite calculation,
 * encapsulated here so future phases can refine the weighting/inputs
 * without touching every call site.
 */

// ─── Score bands (Excellent → Critical) ───────────────────────────────────────
// Mirrors the pattern already used for AQI_BANDS in mock-data.ts: an ordered,
// descending-threshold table that is the single source of truth for label +
// color, instead of ad-hoc if/else thresholds scattered per component.
export interface EnvHealthBand {
  /** Inclusive lower bound of this band. */
  min: number;
  label: "Excellent" | "Healthy" | "Moderate" | "Poor" | "Critical";
  /** Theme-aware CSS color (var()/oklch()), consistent with AQI_BANDS. */
  color: string;
  colorRaw: string;
}

export const ENV_HEALTH_BANDS: EnvHealthBand[] = [
  { min: 90, label: "Excellent", color: "var(--color-success)", colorRaw: "#16a34a" },
  { min: 70, label: "Healthy", color: "var(--color-success)", colorRaw: "#22c55e" },
  { min: 50, label: "Moderate", color: "var(--color-warning)", colorRaw: "#ca8a04" },
  { min: 30, label: "Poor", color: "oklch(0.65 0.19 45)", colorRaw: "#ea580c" },
  { min: 0, label: "Critical", color: "var(--color-destructive)", colorRaw: "#dc2626" },
];

export function findEnvHealthBand(score: number): EnvHealthBand {
  return (
    ENV_HEALTH_BANDS.find((b) => score >= b.min) ?? ENV_HEALTH_BANDS[ENV_HEALTH_BANDS.length - 1]
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export interface EnvHealthInput {
  /** Air Quality Index, 0–500 (lower is better). */
  aqi: number;
  /** Existing composite risk score, 0–100 (higher is worse). */
  risk: number;
  /** Existing water quality score, 0–100 (higher is better). Optional —
   *  not every data source carries it. */
  water?: number;
}

export interface EnvHealthResult {
  score: number;
  band: EnvHealthBand;
}

/**
 * Weighted composite of three metrics the app already computes/tracks live:
 *  - AQI (50%) — the primary citizen-facing pollution signal, inverted so
 *    lower AQI → higher score. Scaled so AQI 0 → 100 and AQI ≥300 → 0.
 *  - Risk score (30%) — inverted (100 − risk), since `risk` is already
 *    0–100 with higher meaning worse.
 *  - Water quality (20%) — used as-is (already 0–100, higher is better).
 *    When unavailable for a city, its weight is redistributed to AQI/risk
 *    (65/35) rather than silently treating missing water as 0.
 *
 * "Weather" was suggested as a factor in the phase spec but is deliberately
 * left out of the score: there's no existing objective weather-quality
 * metric to weight fairly, and inventing one would mean scoring cities on a
 * fabricated number. Temperature/humidity/wind stay visible as raw
 * highlights instead.
 */
export function computeEnvHealthScore({ aqi, risk, water }: EnvHealthInput): EnvHealthResult {
  const aqiScore = clamp(100 - aqi / 3, 0, 100);
  const riskScore = clamp(100 - risk, 0, 100);
  const hasWater = typeof water === "number" && !Number.isNaN(water);

  const raw = hasWater
    ? aqiScore * 0.5 + riskScore * 0.3 + clamp(water as number, 0, 100) * 0.2
    : aqiScore * 0.65 + riskScore * 0.35;

  const score = Math.round(clamp(raw, 0, 100));
  return { score, band: findEnvHealthBand(score) };
}

// ─── Main pollutant ────────────────────────────────────────────────────────────
// Concentrations across pollutants aren't directly comparable (different
// units/scales), so "main pollutant" is computed as whichever one is
// furthest past its own approximate 24h reference threshold — not just
// whichever raw number is numerically largest.
const POLLUTANT_REFERENCE: Record<string, number> = {
  pm25: 55, // µg/m³, approx. EPA 24h "unhealthy" breakpoint
  pm10: 150, // µg/m³
  no2: 100, // ppb
  o3: 70, // ppb
};

const POLLUTANT_LABEL: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  o3: "O₃",
};

export interface PollutantInput {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
}

export function getMainPollutant(input: PollutantInput): {
  key: string;
  label: string;
  value: number;
} {
  const entries: Array<{ key: keyof PollutantInput; value: number }> = [
    { key: "pm25", value: input.pm25 },
    { key: "pm10", value: input.pm10 },
    { key: "no2", value: input.no2 },
    { key: "o3", value: input.o3 },
  ];

  let best = entries[0];
  let bestRatio = -Infinity;
  for (const e of entries) {
    const ratio = e.value / (POLLUTANT_REFERENCE[e.key] ?? 1);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = e;
    }
  }

  return { key: best.key, label: POLLUTANT_LABEL[best.key], value: best.value };
}
