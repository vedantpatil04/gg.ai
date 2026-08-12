/**
 * Supporting logic for the AI Daily Brief.
 *
 * The Brief's lead paragraph and supporting lines are genuine Gemini-authored
 * text pulled from the existing `/copilot/insights` response (see
 * getInsightsFromData / generateCityInsights on the backend) — nothing here
 * invents narrative copy.
 *
 * The functions below produce the small categorical badges (Air Quality:
 * Good, Outdoor Activity: Recommended, ...) and the Recommended/Avoid
 * activity list. These are deterministic, threshold-based derivations from
 * real live metrics — mirroring the exact AQI thresholds the backend already
 * uses for its own health-advice guidance (>150 avoid, >100 limit, else
 * fine) — not a second AI call and not fabricated content.
 */

export type OutdoorGuidance = "Recommended" | "Limit" | "Avoid";

export function getOutdoorGuidance(aqi: number): OutdoorGuidance {
  if (aqi > 150) return "Avoid";
  if (aqi > 100) return "Limit";
  return "Recommended";
}

export type PollutionTrend = "Improving" | "Worsening" | "Stable";

/**
 * Compares the mean AQI of the first half of the series against the second
 * half of the *same* trend data already fetched for the Mini AQI Trend card
 * (no duplicate request). "Improving" means AQI is trending down.
 */
export function getPollutionTrend(series: Array<{ aqi: number }>): PollutionTrend {
  if (series.length < 2) return "Stable";

  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid);
  const secondHalf = series.slice(mid);
  const avg = (arr: Array<{ aqi: number }>) => arr.reduce((s, p) => s + p.aqi, 0) / arr.length;

  const before = avg(firstHalf);
  const after = avg(secondHalf);
  if (before === 0) return "Stable";

  const pctChange = ((after - before) / before) * 100;
  if (pctChange <= -5) return "Improving";
  if (pctChange >= 5) return "Worsening";
  return "Stable";
}

export type WeatherImpact = "Favorable" | "Neutral" | "Not Available";

/** Higher wind speed disperses pollutants faster — an established
 *  atmospheric-science relationship, applied to a real reading. */
export function getWeatherImpact(windSpeed?: number): WeatherImpact {
  if (windSpeed == null) return "Not Available";
  return windSpeed >= 10 ? "Favorable" : "Neutral";
}

export type HealthRiskLabel = "Low" | "Moderate" | "High";

export function getHealthRiskLabel(risk: number): HealthRiskLabel {
  if (risk >= 70) return "High";
  if (risk >= 40) return "Moderate";
  return "Low";
}

export interface ActivityGuidance {
  mode: "recommended" | "limit" | "avoid";
  items: string[];
}

/** Same three-tier AQI bands as getOutdoorGuidance, mapped to concrete,
 *  generic activity examples rather than a fabricated specific time window. */
export function getActivityGuidance(aqi: number): ActivityGuidance {
  if (aqi > 150) {
    return {
      mode: "avoid",
      items: ["Long outdoor exercise", "Heavy-traffic areas", "Running outdoors"],
    };
  }
  if (aqi > 100) {
    return {
      mode: "limit",
      items: [
        "Keep outdoor sessions brief",
        "Prefer well-ventilated indoor exercise",
        "Avoid peak-traffic hours outside",
      ],
    };
  }
  return {
    mode: "recommended",
    items: ["Morning walk", "Cycling", "Opening windows for ventilation", "Outdoor sports"],
  };
}

export interface ConfidenceResult {
  pct: number;
  label: "High" | "Medium" | "Low";
}

/**
 * "Confidence" reflects how complete the live data behind this brief is —
 * not a number from the model. Counts how many of the inputs the Brief
 * actually uses are real/live (including whether the city reading itself
 * is live vs. the offline fallback), out of the total checked.
 */
export function computeAIConfidence(input: {
  isApiConnected: boolean;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  water?: number;
  historyPoints: number;
}): ConfidenceResult {
  const checks = [
    input.isApiConnected,
    input.temp != null,
    input.humidity != null,
    input.windSpeed != null,
    input.water != null,
    input.historyPoints >= 3,
  ];
  const present = checks.filter(Boolean).length;
  const pct = Math.round((present / checks.length) * 100);
  const label: ConfidenceResult["label"] = pct >= 85 ? "High" : pct >= 60 ? "Medium" : "Low";
  return { pct, label };
}

// ─── Matching a Gemini insight by tag ─────────────────────────────────────────
// The live API (`Air Quality`/`Water`/`Risk`/`Sustainability`) and the
// offline mock fallback (`Air Quality`/`Sustainability`/`Forecast`/`Water`)
// don't use identical tag sets, so lookups try a short list of acceptable
// tag names in priority order instead of assuming a fixed array position.
export interface TaggedInsight {
  title: string;
  body: string;
  tag: string;
}

export function findInsightByTag(
  insights: TaggedInsight[],
  candidateTags: string[],
): TaggedInsight | undefined {
  for (const tag of candidateTags) {
    const found = insights.find((i) => i.tag.toLowerCase() === tag.toLowerCase());
    if (found) return found;
  }
  return undefined;
}

// ─── Things to Watch ──────────────────────────────────────────────────────────
// Produces up to 3 watch-items from real live metrics.
// These are honest interpretations of trends that already exist in the data —
// not fabricated predictions. Each observation is labelled with its source so
// a future phase can substitute a Gemini-generated version when the API
// exposes it.

export interface WatchItem {
  icon: "trend-up" | "trend-down" | "humidity" | "wind" | "risk" | "water" | "stable";
  label: string;
}

export function deriveThingsToWatch({
  pollutionTrend,
  humidity,
  windSpeed,
  risk,
  water,
  aqi,
}: {
  pollutionTrend: PollutionTrend;
  humidity?: number;
  windSpeed?: number;
  risk: number;
  water?: number;
  aqi: number;
}): WatchItem[] {
  const items: WatchItem[] = [];

  // 1. Pollution trend — the most actionable watch item. Worded without a
  // specific timeframe ("recent readings" rather than "past 7 days"):
  // getPollutionTrend only guarantees >=2 real data points, not a full
  // 7-day span, so claiming an exact number of days would overstate what
  // the data actually supports.
  if (pollutionTrend === "Worsening") {
    items.push({ icon: "trend-up", label: "AQI has been trending upward over recent readings." });
  } else if (pollutionTrend === "Improving") {
    items.push({ icon: "trend-down", label: "AQI has been improving over recent readings." });
  }

  // 2. Humidity — high humidity can trap pollutants near ground level
  if (humidity != null && humidity >= 78) {
    items.push({
      icon: "humidity",
      label: `Humidity is elevated at ${humidity}% — can trap surface-level pollutants.`,
    });
  } else if (humidity != null && humidity <= 30) {
    items.push({
      icon: "humidity",
      label: `Low humidity (${humidity}%) may increase particulate dust dispersion.`,
    });
  }

  // 3. Wind — low wind means slower pollutant dispersal
  if (windSpeed != null && windSpeed < 5 && aqi > 50) {
    items.push({
      icon: "wind",
      label: `Light winds (${windSpeed} km/h) may slow pollutant dispersal today.`,
    });
  }

  // 4. Risk score — show if elevated and no other items filled it yet
  if (items.length < 2 && risk >= 60) {
    items.push({
      icon: "risk",
      label: `Composite risk score is elevated at ${risk}/100 — sensitive groups should take care.`,
    });
  }

  // 5. Water quality — if poor and no other items yet
  if (items.length < 2 && water != null && water < 55) {
    items.push({
      icon: "water",
      label: `Water quality index (${water}) is below the comfortable threshold.`,
    });
  }

  // Always return at least one item
  if (items.length === 0) {
    items.push({ icon: "stable", label: "No significant environmental concerns at this time." });
  }

  return items.slice(0, 3);
}

// ─── What Matters Now (Phase 1: Dashboard Foundation) ─────────────────────────
// Replaces the old AI Daily Brief on the Dashboard. Maximum 3 items, built
// entirely from real/derived metrics already on the page (AQI, its recent
// trend, one live watch-item, and real active-alert count) — no Gemini call,
// no confidence score, no "AI" framing. If there's nothing notable, each slot
// says so plainly rather than being padded with invented content.

export interface MattersItem {
  id: string;
  title: string;
  body: string;
  tone: "success" | "warning" | "destructive" | "muted";
}

function watchItemTitle(icon: WatchItem["icon"]): string {
  switch (icon) {
    case "trend-up":
      return "Air quality is trending upward";
    case "trend-down":
      return "Air quality is improving";
    case "humidity":
      return "Humidity note";
    case "wind":
      return "Wind conditions";
    case "risk":
      return "Risk score is elevated";
    case "water":
      return "Water quality note";
    default:
      return "Environmental note";
  }
}

export function deriveWhatMattersNow({
  aqi,
  band,
  pollutionTrend,
  hasHistory,
  watchItems,
  activeAlertsCount,
}: {
  aqi: number;
  band: { label: string; color: string };
  pollutionTrend: PollutionTrend;
  /** True only when a real multi-point history series backed the trend
   *  calculation. When false, `pollutionTrend` is "Stable" by default
   *  rather than a verified observation, so no trend claim is made. */
  hasHistory: boolean;
  watchItems: WatchItem[];
  activeAlertsCount: number;
}): MattersItem[] {
  const items: MattersItem[] = [];

  // 1. Headline air-quality status — always present, always real. The
  // trend clause is only added when real history data actually backs it;
  // otherwise this is just the current reading, with no implied claim
  // about recent history.
  const trendPhrase = !hasHistory
    ? ""
    : pollutionTrend === "Improving"
      ? " and has been improving over recent readings."
      : pollutionTrend === "Worsening"
        ? " and has been trending upward over recent readings."
        : " and has stayed steady over recent readings.";
  items.push({
    id: "aqi-status",
    title: `Air quality is ${band.label.toLowerCase()}`,
    body: `AQI is ${aqi}${trendPhrase}`,
    tone: aqi > 150 ? "destructive" : aqi > 100 ? "warning" : "success",
  });

  // 2. One real watch item, skipping the generic "nothing to report" filler
  //    (that case is already covered by the alerts line below).
  const watch = watchItems.find((w) => w.icon !== "stable");
  if (watch) {
    items.push({
      id: "watch",
      title: watchItemTitle(watch.icon),
      body: watch.label,
      tone: watch.icon === "trend-up" || watch.icon === "risk" ? "warning" : "muted",
    });
  }

  // 3. Real active-alert status — never fabricated, always the true count.
  items.push(
    activeAlertsCount > 0
      ? {
          id: "alerts",
          title:
            activeAlertsCount === 1
              ? "1 active environmental alert"
              : `${activeAlertsCount} active environmental alerts`,
          body: "See Live Environmental Activity below for details.",
          tone: "warning",
        }
      : {
          id: "alerts",
          title: "No major environmental alerts",
          body: "Nothing currently requires immediate attention.",
          tone: "success",
        },
  );

  return items.slice(0, 3);
}
