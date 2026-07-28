/**
 * ai-command-data.ts — Phase 8: AI Command Center & Decision Intelligence
 *
 * Assembles data from all previous intelligence modules (City fields,
 * Phase 5 Weather, Phase 6 Air Quality, Phase 7 Hazard, existing
 * ALERTS/INSIGHTS/RECOMMENDATIONS) into a structured AiCommandData
 * record used by AiCommandPanel.tsx.
 *
 * No new backend APIs.  The AI chat itself calls copilotApi.chat (the
 * existing /copilot/chat endpoint already in services.api.ts).
 */

import type { City } from "@/lib/mock-data";
import { ALERTS, INSIGHTS, RECOMMENDATIONS, findAqiBand, CITIES } from "@/lib/mock-data";
import { generateHazardData, levelLabel, scoreToLevel, levelColor } from "@/lib/map/hazard-data";
import { generateAirQualityData } from "@/lib/map/air-quality-data";
import { generateWeatherData } from "@/lib/map/weather-data";

// ─── Operational KPI ──────────────────────────────────────────────────────────
export interface OperationalKpi {
  label: string;
  value: number; // 0–100 score
  unit?: string;
  description: string;
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  color: string;
  trend: "improving" | "stable" | "degrading";
}

function kpiStatus(score: number): OperationalKpi["status"] {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "fair";
  if (score >= 25) return "poor";
  return "critical";
}

function statusColor(s: OperationalKpi["status"]): string {
  return {
    excellent: "var(--color-success)",
    good: "oklch(0.68 0.16 145)",
    fair: "var(--color-warning)",
    poor: "var(--color-destructive)",
    critical: "oklch(0.45 0.22 10)",
  }[s];
}

// ─── Timeline event ───────────────────────────────────────────────────────────
export type TimelineCategory = "air" | "weather" | "hazard" | "sensor" | "alert";
export interface TimelineEvent {
  id: string;
  time: string; // relative label
  category: TimelineCategory;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  color: string;
}

// ─── AI insight ───────────────────────────────────────────────────────────────
export interface AiInsight {
  title: string;
  body: string;
  confidence: number; // 0–1
  category: "air" | "weather" | "hazard" | "operations";
  severity: "positive" | "neutral" | "warning" | "critical";
}

// ─── Decision action ──────────────────────────────────────────────────────────
export interface DecisionAction {
  priority: "immediate" | "soon" | "monitor";
  title: string;
  rationale: string;
  impact: string;
  module: "air" | "weather" | "hazard" | "operations";
}

// ─── Executive summary ────────────────────────────────────────────────────────
export interface ExecutiveSummary {
  overallStatus: "nominal" | "elevated" | "critical";
  statusColor: string;
  headline: string;
  highestConcern: string;
  positiveTrend: string;
  recommendedFocus: string;
  /** 2–3 sentence natural-language SITREP */
  sitrep: string;
}

// ─── Full command record ──────────────────────────────────────────────────────
export interface AiCommandData {
  executive: ExecutiveSummary;
  kpis: OperationalKpi[];
  insights: AiInsight[];
  timeline: TimelineEvent[];
  decisions: DecisionAction[];
  /** Quick-fire prompt suggestions for the embedded copilot chat */
  suggestedPrompts: string[];
  /** City stats for the operational overview */
  cityRank: { label: string; value: string; note: string }[];
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function seeded(seed: string, i: number): number {
  let h = i * 2654435761;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 0x9e3779b9);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateAiCommandData(city: City): AiCommandData {
  const r = (i: number) => seeded(city.id, i + 200);

  const aqBand = findAqiBand(city.aqi);
  const hazard = generateHazardData(city);
  const aq = generateAirQualityData(city, CITIES);
  const wx = generateWeatherData(city);

  // ── Operational KPIs ────────────────────────────────────────────────────────
  const envHealthScore = Math.round(
    (100 - city.aqi / 3) * 0.35 +
      city.water * 0.25 +
      city.eco * 0.2 +
      (100 - hazard.overallScore) * 0.2,
  );
  const hazardReadiness = Math.round(100 - hazard.overallScore * 0.7 + r(1) * 8);
  const sensorOnline = Math.round(65 + r(2) * 30); // % of sensors online
  const coveragePct = Math.round(60 + r(3) * 35);
  const alertScore = Math.max(0, 100 - city.alerts * 7);
  const opHealth = Math.round((envHealthScore + hazardReadiness + sensorOnline) / 3);

  const kpis: OperationalKpi[] = [
    {
      label: "Environmental Health",
      value: envHealthScore,
      description: "Composite AQI, water, and eco-system index",
      status: kpiStatus(envHealthScore),
      color: statusColor(kpiStatus(envHealthScore)),
      trend: city.aqi < 100 ? "improving" : city.aqi < 150 ? "stable" : "degrading",
    },
    {
      label: "Hazard Readiness",
      value: hazardReadiness,
      description: "Inverse composite hazard risk score",
      status: kpiStatus(hazardReadiness),
      color: statusColor(kpiStatus(hazardReadiness)),
      trend:
        hazard.overallScore < 40 ? "improving" : hazard.overallScore < 65 ? "stable" : "degrading",
    },
    {
      label: "Monitoring Coverage",
      value: coveragePct,
      unit: "%",
      description: "Sensor network spatial coverage",
      status: kpiStatus(coveragePct),
      color: statusColor(kpiStatus(coveragePct)),
      trend: "stable",
    },
    {
      label: "Sensor Availability",
      value: sensorOnline,
      unit: "%",
      description: "% of sensor fleet reporting live",
      status: kpiStatus(sensorOnline),
      color: statusColor(kpiStatus(sensorOnline)),
      trend: sensorOnline > 80 ? "improving" : "stable",
    },
    {
      label: "Alert Status",
      value: alertScore,
      description: `${city.alerts} active alert${city.alerts !== 1 ? "s" : ""}`,
      status: kpiStatus(alertScore),
      color: statusColor(kpiStatus(alertScore)),
      trend: city.alerts === 0 ? "improving" : city.alerts < 5 ? "stable" : "degrading",
    },
    {
      label: "Operational Health",
      value: opHealth,
      description: "Overall platform operational index",
      status: kpiStatus(opHealth),
      color: statusColor(kpiStatus(opHealth)),
      trend: opHealth > 65 ? "improving" : "stable",
    },
  ];

  // ── Executive summary ────────────────────────────────────────────────────────
  const overallStatus: ExecutiveSummary["overallStatus"] =
    city.aqi > 200 || hazard.overallLevel === "critical" || hazard.overallLevel === "severe"
      ? "critical"
      : city.aqi > 100 || hazard.overallLevel === "high" || city.alerts > 6
        ? "elevated"
        : "nominal";

  const execColor = {
    nominal: "var(--color-success)",
    elevated: "var(--color-warning)",
    critical: "var(--color-destructive)",
  }[overallStatus];

  const headline =
    overallStatus === "critical"
      ? `Critical environmental conditions in ${city.name} require immediate operational attention`
      : overallStatus === "elevated"
        ? `Elevated risk profile in ${city.name} warrants enhanced monitoring and preparedness`
        : `${city.name} environmental systems are operating within normal parameters`;

  const primaryHazardLabel = hazard.primaryHazard.meta.label.toLowerCase();
  const highestConcern =
    city.aqi > 150
      ? `Air quality (AQI ${city.aqi} — ${aqBand.label}) is the primary health risk; ${aq.dominant.toUpperCase()} is the dominant pollutant`
      : hazard.overallScore > 65
        ? `${hazard.primaryHazard.meta.label} (score ${hazard.primaryHazard.score}/100) is the primary operational risk`
        : city.alerts > 5
          ? `${city.alerts} active alerts across the sensor network require review`
          : `No single critical concern — maintain standard monitoring posture`;

  const positiveTrend =
    city.eco > 65
      ? `Ecosystem health index (${city.eco}/100) is above average for the region`
      : city.water > 70
        ? `Water quality index (${city.water}/100) is within healthy parameters`
        : opHealth > 65
          ? `Overall platform operational health is at ${opHealth}%`
          : `Monitoring coverage at ${coveragePct}% supports adequate situational awareness`;

  const recommendedFocus =
    city.aqi > 150
      ? "Prioritise AQI response — activate health advisories and review emission sources"
      : hazard.overallScore > 60
        ? `Focus on ${primaryHazardLabel} mitigation — review preparedness assets and community alerts`
        : city.alerts > 4
          ? "Clear the active alert backlog — triage by severity and assign response teams"
          : "Conduct routine environmental audit across lower-performing sensor clusters";

  const sitrep =
    `${city.name} is currently operating at ${overallStatus.toUpperCase()} status. ` +
    `Air Quality Index stands at ${city.aqi} (${aqBand.label}) with ${aq.dominant.toUpperCase()} as the dominant pollutant; ` +
    `the multi-hazard score is ${hazard.overallScore}/100 (${levelLabel(hazard.overallLevel)}). ` +
    (hazard.alerts.length > 0
      ? `${hazard.alerts.length} emergency alert${hazard.alerts.length > 1 ? "s are" : " is"} active — the highest severity is ${hazard.alerts[0].severity}. `
      : "No emergency alerts are currently active. ") +
    `Recommended priority: ${recommendedFocus.toLowerCase()}.`;

  const executive: ExecutiveSummary = {
    overallStatus,
    statusColor: execColor,
    headline,
    highestConcern,
    positiveTrend,
    recommendedFocus,
    sitrep,
  };

  // ── AI Insights (synthesised from multi-module data) ────────────────────────
  const insights: AiInsight[] = [];

  if (city.aqi > 150) {
    insights.push({
      title: `Critical AQI in ${city.name}`,
      body: `AQI at ${city.aqi} (${aqBand.label}) — ${aq.dominant.toUpperCase()} concentration is the dominant driver. Sensitive population groups face significant health risk.`,
      confidence: 0.94,
      category: "air",
      severity: "critical",
    });
  } else if (city.aqi > 100) {
    insights.push({
      title: "Elevated Air Pollution",
      body: `AQI ${city.aqi} places ${city.name} in the Moderate-to-Unhealthy range. PM₂.₅ at ${city.pm25} µg/m³ exceeds WHO guidelines.`,
      confidence: 0.91,
      category: "air",
      severity: "warning",
    });
  } else {
    insights.push({
      title: "Air Quality Within Bounds",
      body: `AQI ${city.aqi} — ${aqBand.label}. No public health advisories required based on current readings.`,
      confidence: 0.88,
      category: "air",
      severity: "positive",
    });
  }

  if (hazard.overallScore > 60) {
    insights.push({
      title: `Elevated Hazard Profile`,
      body: `${hazard.primaryHazard.meta.label} is the primary hazard (score ${hazard.primaryHazard.score}/100 — ${levelLabel(hazard.primaryHazard.level)}). ${hazard.primaryHazard.summary}`,
      confidence: 0.87,
      category: "hazard",
      severity: hazard.overallScore > 75 ? "critical" : "warning",
    });
  }

  insights.push({
    title: wx.riskLevel !== "low" ? "Adverse Weather Conditions" : "Weather Conditions Favourable",
    body: `${wx.conditionLabel} — ${city.temp}°C, ${city.humidity}% humidity. ${wx.riskLabel}.`,
    confidence: 0.82,
    category: "weather",
    severity: wx.riskLevel === "severe" || wx.riskLevel === "high" ? "warning" : "neutral",
  });

  if (sensorOnline < 75) {
    insights.push({
      title: "Sensor Coverage Gap Detected",
      body: `${sensorOnline}% of sensors are reporting live. Coverage gaps may reduce situational awareness in affected zones.`,
      confidence: 0.78,
      category: "operations",
      severity: "warning",
    });
  }

  // Append up to 2 from existing INSIGHTS mock data, adapted for the city
  INSIGHTS.slice(0, 2).forEach((ins) => {
    insights.push({
      title: ins.title,
      body: ins.body,
      confidence: 0.7 + r(insights.length) * 0.18,
      category:
        ins.tag === "Air Quality" ? "air" : ins.tag === "Forecast" ? "weather" : "operations",
      severity: "neutral",
    });
  });

  // ── Timeline (chronological multi-source events) ─────────────────────────────
  const timeline: TimelineEvent[] = (
    [
      ...ALERTS.slice(0, 3).map((a, i) => ({
        id: `alert-${i}`,
        time: a.time,
        category: "alert" as const,
        title: a.title,
        detail: a.desc,
        severity: (a.severity === "critical"
          ? "critical"
          : a.severity === "warning"
            ? "warning"
            : "info") as TimelineEvent["severity"],
        color:
          a.severity === "critical"
            ? "var(--color-destructive)"
            : a.severity === "warning"
              ? "var(--color-warning)"
              : "var(--color-info)",
      })),
      ...hazard.alerts.slice(0, 2).map(
        (
          ha: {
            issuedAt: string;
            title: string;
            description: string;
            severity: string;
            color: string;
          },
          i: number,
        ) => ({
          id: `hazard-${i}`,
          time: ha.issuedAt,
          category: "hazard" as const,
          title: ha.title,
          detail: ha.description,
          severity: (ha.severity === "emergency" || ha.severity === "warning"
            ? "critical"
            : "warning") as TimelineEvent["severity"],
          color: ha.color,
        }),
      ),
      {
        id: "wx-now",
        time: "Now",
        category: "weather" as const,
        title: `Weather: ${wx.conditionLabel}`,
        detail: `${city.temp}°C, humidity ${city.humidity}%, wind ${wx.windSpeed} km/h ${wx.windDirectionLabel}`,
        severity: "info" as const,
        color: wx.theme.accent,
      },
      {
        id: "aq-now",
        time: "Now",
        category: "air" as const,
        title: `AQI ${city.aqi} — ${aqBand.label}`,
        detail: `PM₂.₅ ${city.pm25} µg/m³ · NO₂ ${city.no2} ppb · O₃ ${city.o3} ppb`,
        severity: (city.aqi > 150
          ? "critical"
          : city.aqi > 100
            ? "warning"
            : "info") as TimelineEvent["severity"],
        color: aqBand.color,
      },
    ] as TimelineEvent[]
  ).sort((a, b) => {
    // Sort "Now" first, then by time string — simple stable ordering
    if (a.time === "Now") return -1;
    if (b.time === "Now") return 1;
    return 0;
  });

  // ── Decision actions ──────────────────────────────────────────────────────────
  const decisions: DecisionAction[] = [];

  if (city.aqi > 150)
    decisions.push({
      priority: "immediate",
      module: "air",
      title: "Activate Public Health Advisory",
      rationale: `AQI ${city.aqi} exceeds safe thresholds — vulnerable populations are at immediate risk.`,
      impact: "Reduces public health exposure for sensitive groups",
    });

  if (hazard.primaryHazard.level === "severe" || hazard.primaryHazard.level === "critical")
    decisions.push({
      priority: "immediate",
      module: "hazard",
      title: `Deploy ${hazard.primaryHazard.meta.label} Response`,
      rationale: hazard.primaryHazard.summary,
      impact: "Limits cascading environmental and infrastructure damage",
    });

  if (city.alerts > 4)
    decisions.push({
      priority: "soon",
      module: "operations",
      title: "Triage Active Alert Queue",
      rationale: `${city.alerts} active alerts require team review and assignment.`,
      impact: "Clears backlog and ensures no critical events are missed",
    });

  if (sensorOnline < 80)
    decisions.push({
      priority: "soon",
      module: "operations",
      title: "Audit Offline Sensors",
      rationale: `${100 - sensorOnline}% of sensors are unresponsive — coverage gap may miss emerging pollution events.`,
      impact: "Restores full monitoring coverage",
    });

  // Append up to 2 from existing RECOMMENDATIONS
  RECOMMENDATIONS.slice(0, 2).forEach((rec) => {
    decisions.push({
      priority: "monitor",
      module: "air",
      title: rec.title,
      rationale: `Confidence: ${Math.round(rec.confidence * 100)}%`,
      impact: rec.impact,
    });
  });

  // ── Suggested prompts for embedded copilot chat ──────────────────────────────
  const suggestedPrompts = [
    `Summarise current environmental conditions in ${city.name}`,
    `What are the main air quality risks today?`,
    `Which areas have the highest hazard risk right now?`,
    `What health precautions are recommended for today?`,
    `Compare ${city.name} air quality with other cities`,
    `What actions should authorities prioritise?`,
  ];

  // ── City rank stats ───────────────────────────────────────────────────────────
  const sortedByAqi = [...CITIES].sort((a, b) => a.aqi - b.aqi);
  const aqiRank = sortedByAqi.findIndex((c) => c.id === city.id) + 1;

  const cityRank = [
    {
      label: "AQI Rank",
      value: `#${aqiRank} of ${CITIES.length}`,
      note: `${aqiRank <= CITIES.length / 2 ? "Better" : "Worse"} than half of monitored cities`,
    },
    {
      label: "Eco Score",
      value: `${city.eco}/100`,
      note: city.eco > 65 ? "Above regional average" : "Below regional average",
    },
    {
      label: "Water Quality",
      value: `${city.water}/100`,
      note: city.water > 70 ? "Within safe parameters" : "Requires attention",
    },
    {
      label: "Risk Index",
      value: `${city.risk}/100`,
      note: city.risk > 60 ? "Elevated — monitor closely" : "Within acceptable bounds",
    },
  ];

  return { executive, kpis, insights, timeline, decisions, suggestedPrompts, cityRank };
}
