import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { logger } from "../utils/logger";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { City } from "../models/City";

// ─── Client singleton ─────────────────────────────────────────────────────────
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set — AI features disabled");
    return null;
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function getModel(systemInstruction: string): GenerativeModel | null {
  const client = getClient();
  if (!client) return null;
  return client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  });
}

const SYSTEM_ENV_ANALYST =
  "You are GreenGuard AI — a professional environmental intelligence analyst. " +
  "Speak with authority. Be data-driven, precise, and actionable. " +
  "Never say 'I' — respond as a system. Use metric units. Keep answers under 120 words unless instructed otherwise.";

const SYSTEM_HEALTH_ADVISOR =
  "You are a public health advisor integrated into GreenGuard AI. " +
  "Provide concise, WHO-aligned health guidance based on environmental conditions. " +
  "Speak plainly for general audiences. Never diagnose. Always recommend consulting a doctor for medical decisions.";

const SYSTEM_REPORT_ANALYST =
  "You are an environmental data analyst writing formal government-grade reports. " +
  "Use precise language, cite metric values, and structure insights clearly. " +
  "Output is professional English suitable for municipal authorities.";

const SYSTEM_POLICY_ANALYST =
  "You are a senior environmental policy strategist advising city governments. " +
  "Quantify impacts where possible. Highlight trade-offs. Recommend phased implementation. " +
  "Reference real-world policy benchmarks where relevant.";

// ─── Core generate helper ─────────────────────────────────────────────────────
async function generate(prompt: string, system = SYSTEM_ENV_ANALYST): Promise<string> {
  const model = getModel(system);
  if (!model) return _fallback("AI service not configured. Set GEMINI_API_KEY to enable.");
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: unknown) {
    console.error("GEMINI FULL ERROR:", err);
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Gemini error: ${msg}`);
    if (msg.includes("quota")) return _fallback("AI quota exceeded. Please try again shortly.");
    if (msg.includes("safety")) return _fallback("Response blocked by safety filters.");
    return _fallback("AI temporarily unavailable.");
  }
}

function _fallback(msg: string): string {
  return msg;
}

// ─── JSON helper — parses Gemini's JSON output robustly ──────────────────────
function parseJSON<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[1] ?? match[0]);
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — AI ENVIRONMENTAL COPILOT
// ══════════════════════════════════════════════════════════════════════════════
export async function generateCopilotResponse(
  question: string,
  cityData: Record<string, unknown>,
  userRole = "citizen"
): Promise<string> {
  const prompt = `
CITY: ${cityData.cityName}, ${cityData.country}
CURRENT CONDITIONS:
  AQI ${cityData.aqi} (PM2.5 ${cityData.pm25} µg/m³ | PM10 ${cityData.pm10} µg/m³)
  NO₂ ${cityData.no2} ppb | O₃ ${cityData.o3} ppb | CO₂ ${cityData.co2} ppm
  Water Quality Index: ${cityData.water}/100
  Temperature: ${cityData.temp}°C | Humidity: ${cityData.humidity}%
  Risk Score: ${cityData.risk}/100 | EcoScore: ${cityData.eco}/100
USER ROLE: ${userRole}

QUESTION: ${question}

Answer in 3–5 sentences. Cite specific metric values. If the question is about health or safety, include a concrete recommendation.`;
  return generate(prompt, SYSTEM_ENV_ANALYST);
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1B — GREENGUARD INTELLIGENCE CENTER (Sustainability, Phase 5)
// ══════════════════════════════════════════════════════════════════════════════
// A dedicated, strictly-grounded system prompt and response function for the
// Sustainability page's "GreenGuard Intelligence Center" — kept separate
// from generateCopilotResponse/SYSTEM_ENV_ANALYST above (Feature 1), which
// is shared by the Dashboard, Map, Forecast, Intelligence, and Copilot
// pages and must not change behavior for any of them.
//
// The context this receives is built entirely by the caller
// (copilot.controller.ts) from the SAME real Phase 1/2/4 data pipeline the
// Sustainability page itself renders from (including the Phase 2
// computeEcoScore() result) — never a separate or independently-fetched
// value — so the AI's answer can never disagree with what's on screen.
const SYSTEM_SUSTAINABILITY_INTELLIGENCE = `
ROLE: You are GreenGuard Intelligence, an environmental sustainability analyst embedded in the GreenGuard Intelligence Center for a specific city's Sustainability page.

DATA RULE: Use ONLY the GreenGuard data supplied to you in this prompt for any quantitative claim (scores, percentages, readings, comparisons). Every number you cite must come from the supplied context.

ACCURACY RULE: Never invent environmental readings, historical values, percentages, confidence scores, probabilities, rankings, regional comparisons, or policy outcomes. Never claim a metric exists or has a value when the supplied context marks it unavailable. Never present an assumption as a measured fact.

COMMUNICATION STYLE: Human, concise, clear, practical. Prefer "EcoScore improved by 5 points" over "environmental intelligence trajectory demonstrates positive momentum." Avoid buzzwords and exaggerated language. Keep answers under 120 words unless the question genuinely needs more.

RECOMMENDATION RULE: Any recommendation must be directly connected to a specific supplied metric or breakdown value. Clearly distinguish stated facts from recommendations/opinions — do not blend them into one unlabeled claim.

LIMITATION RULE: When the supplied context does not contain what's needed to answer (a metric is unavailable, no historical data was supplied, the question is out of scope), say so plainly instead of guessing — for example "GreenGuard does not currently have enough data to answer that reliably." This is expected and correct behavior, not a failure.

PREDICTION RULE: Do not provide future predictions or forecasts (e.g. "EcoScore in 30 days") — GreenGuard does not currently have a validated prediction model. If asked, state that plainly rather than inventing a number.
`.trim();

export interface SustainabilityAIContext {
  cityName: string;
  updatedAt?: string;
  ecoScore: number;
  ecoScoreGrade: string;
  ecoScoreDataComplete: boolean;
  ecoScoreMissingMetrics: string[];
  ecoScoreBreakdown: Array<{ metric: string; normalizedScore: number | null; weight: number; available: boolean }>;
  aqi: number;
  temp?: number;
  humidity?: number;
  co2?: number;
  greenCover?: number;
  renewableShare?: number;
  water: number;
  carbon?: number;
  /** Compact 7-day summary built from the same real history pipeline as
   *  Phase 4 (fetchCityHistoryDays) — omitted entirely when there isn't
   *  enough real history to summarize honestly. */
  historicalSummary?: {
    rangeDays: number;
    daysWithData: number;
    ecoScore?: { previous: number; current: number };
    aqi?: { previous: number; current: number };
    water?: { previous: number; current: number };
    renewableShare?: { previous: number; current: number };
  };
}

function formatContextForPrompt(ctx: SustainabilityAIContext): string {
  const lines: string[] = [
    `CITY: ${ctx.cityName}`,
    ctx.updatedAt ? `DATA AS OF: ${ctx.updatedAt}` : `DATA FRESHNESS: unavailable`,
    `ECOSCORE: ${ctx.ecoScore}/100 (Grade ${ctx.ecoScoreGrade})`,
  ];

  if (!ctx.ecoScoreDataComplete && ctx.ecoScoreMissingMetrics.length) {
    lines.push(`ECOSCORE NOTE: not all methodology inputs are available yet — missing: ${ctx.ecoScoreMissingMetrics.join(", ")}. The score above already accounts for this (remaining weights were proportionally redistributed); do not describe it as incomplete or wrong, just note the missing input(s) if relevant to the question.`);
  }

  lines.push("ECOSCORE BREAKDOWN (normalized 0-100, higher = better contribution):");
  for (const m of ctx.ecoScoreBreakdown) {
    lines.push(
      m.available
        ? `  - ${m.metric}: ${m.normalizedScore}/100 (weight ${(m.weight * 100).toFixed(0)}%)`
        : `  - ${m.metric}: unavailable (no supported data source yet)`,
    );
  }

  lines.push("CURRENT CONDITIONS:");
  lines.push(`  AQI: ${ctx.aqi}`);
  if (ctx.temp != null) lines.push(`  Temperature: ${ctx.temp}°C`);
  if (ctx.humidity != null) lines.push(`  Humidity: ${ctx.humidity}%`);
  if (ctx.co2 != null) lines.push(`  CO2: ${ctx.co2} ppm`);
  lines.push(`  Water Quality: ${ctx.water}%`);
  if (ctx.greenCover != null) lines.push(`  Green Cover: ${ctx.greenCover}%`);
  if (ctx.renewableShare != null) lines.push(`  Renewable Energy Share: ${ctx.renewableShare}%`);
  if (ctx.carbon != null) lines.push(`  Carbon Intensity: ${ctx.carbon} tCO2/capita`);

  if (ctx.historicalSummary) {
    const h = ctx.historicalSummary;
    lines.push(`HISTORICAL DATA (last ${h.rangeDays} days, ${h.daysWithData} of ${h.rangeDays} days have recorded data):`);
    if (h.ecoScore) lines.push(`  EcoScore: ${h.ecoScore.previous} -> ${h.ecoScore.current}`);
    if (h.aqi) lines.push(`  AQI: ${h.aqi.previous} -> ${h.aqi.current}`);
    if (h.water) lines.push(`  Water Quality: ${h.water.previous}% -> ${h.water.current}%`);
    if (h.renewableShare) lines.push(`  Renewable Energy: ${h.renewableShare.previous}% -> ${h.renewableShare.current}%`);
  } else {
    lines.push("HISTORICAL DATA: not supplied for this question — do not make historical/trend claims unless the user's question is only about current conditions.");
  }

  return lines.join("\n");
}

export async function generateSustainabilityIntelligenceResponse(
  question: string,
  context: SustainabilityAIContext,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<string> {
  const recentHistory = history.slice(-6); // last few turns only — enough for "why?"-style follow-ups
  const historyBlock = recentHistory.length
    ? `\nRECENT CONVERSATION (for context on follow-up questions like "why?"):\n${recentHistory
        .map((m) => `${m.role === "user" ? "User" : "GreenGuard Intelligence"}: ${m.content}`)
        .join("\n")}\n`
    : "";

  const prompt = `
${formatContextForPrompt(context)}
${historyBlock}
QUESTION: ${question}

Answer using only the data above. If the question asks for something not covered by the data above (e.g. a future prediction, an external comparison, a metric marked unavailable), say plainly that GreenGuard does not currently have enough data to answer that reliably, rather than guessing.`;

  return generate(prompt, SYSTEM_SUSTAINABILITY_INTELLIGENCE);
}


export interface HealthAdvice {
  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  summary: string;
  outdoor: string;
  exercise: string;
  sensitiveGroups: string;
  masks: string;
  schools: string;
  elderly: string;
  children: string;
  generalPublic: string;
}

export async function generateHealthAdvice(cityData: Record<string, unknown>): Promise<HealthAdvice> {
  const aqi = Number(cityData.aqi);
  const riskLevel: HealthAdvice["riskLevel"] =
    aqi <= 50 ? "Low" : aqi <= 100 ? "Moderate" : aqi <= 200 ? "High" : "Severe";

  const prompt = `
Generate structured health advice for the following environmental conditions.
Return ONLY valid JSON (no markdown, no explanation).

LOCATION: ${cityData.cityName}, ${cityData.country}
AQI: ${aqi} (${riskLevel} risk)
PM2.5: ${cityData.pm25} µg/m³ | PM10: ${cityData.pm10} µg/m³
Temperature: ${cityData.temp}°C | Humidity: ${cityData.humidity}%
Risk Score: ${cityData.risk}/100

Return this exact JSON structure:
{
  "riskLevel": "${riskLevel}",
  "summary": "one sentence overall assessment",
  "outdoor": "outdoor activity guidance",
  "exercise": "exercise recommendations",
  "sensitiveGroups": "advice for asthma/heart patients",
  "masks": "mask recommendation",
  "schools": "school safety guidance",
  "elderly": "elderly care precautions",
  "children": "child-specific advice",
  "generalPublic": "general public guidance"
}`;

  const text = await generate(prompt, SYSTEM_HEALTH_ADVISOR);
  return parseJSON<HealthAdvice>(text, {
    riskLevel,
    summary: `AQI is ${aqi} — ${riskLevel.toLowerCase()} risk conditions in ${cityData.cityName}.`,
    outdoor: aqi > 150 ? "Avoid outdoor activities. Stay indoors with windows closed." : aqi > 100 ? "Limit prolonged outdoor exposure, especially during peak hours." : "Outdoor activities are generally safe.",
    exercise: aqi > 150 ? "Postpone all outdoor exercise." : aqi > 100 ? "Move workouts indoors or reduce intensity." : "Light to moderate outdoor exercise is acceptable.",
    sensitiveGroups: aqi > 100 ? "Asthma and heart patients should avoid outdoor exposure and keep inhalers accessible." : "Sensitive groups should monitor symptoms and limit prolonged outdoor stays.",
    masks: aqi > 150 ? "N95/FFP2 masks strongly recommended outdoors." : aqi > 100 ? "Surgical mask recommended in crowded outdoor areas." : "Masks optional for healthy individuals.",
    schools: aqi > 150 ? "Consider suspending outdoor school activities." : aqi > 100 ? "Limit recess and outdoor PE classes." : "Normal school activities may proceed.",
    elderly: aqi > 100 ? "Elderly persons should remain indoors. Ensure ventilation with air purifiers." : "Elderly may go outdoors briefly in the morning when AQI is lower.",
    children: aqi > 100 ? "Keep children indoors. Avoid playgrounds near roads." : "Children can play outdoors with normal precautions.",
    generalPublic: aqi > 150 ? "Stay indoors. Seal windows. Use air purifiers." : aqi > 100 ? "Reduce time outdoors. Avoid dusty or smoky areas." : "No special precautions needed.",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — AI REPORT GENERATOR
// ══════════════════════════════════════════════════════════════════════════════
export async function generateAIReport(params: {
  type: "Daily" | "Weekly" | "Monthly" | "City" | "Sustainability";
  cityData: Record<string, unknown>;
  trend?: Record<string, unknown>[];
}): Promise<{
  title: string;
  executiveSummary: string;
  aqiAnalysis: string;
  waterQualityAnalysis: string;
  riskAssessment: string;
  keyFindings: string[];
  recommendations: string[];
  outlook: string;
}> {
  const { type, cityData, trend } = params;
  const trendNote = trend?.length
    ? `Recent trend: AQI ranged from ${Math.min(...trend.map((t) => Number(t.aqi ?? 0)))} to ${Math.max(...trend.map((t) => Number(t.aqi ?? 0)))} over the last ${trend.length} hours.`
    : "";

  const prompt = `
Generate a structured ${type} Environmental Report for ${cityData.cityName}, ${cityData.country}.
${trendNote}

Current metrics:
- AQI: ${cityData.aqi} | PM2.5: ${cityData.pm25} | PM10: ${cityData.pm10}
- NO₂: ${cityData.no2} | O₃: ${cityData.o3} | CO₂: ${cityData.co2}
- Water Quality: ${cityData.water}/100
- Temperature: ${cityData.temp}°C | Humidity: ${cityData.humidity}%
- Risk Score: ${cityData.risk}/100 | EcoScore: ${cityData.eco}/100
- Carbon: ${cityData.carbon} tCO₂e/capita

Return ONLY valid JSON:
{
  "title": "formal report title",
  "executiveSummary": "3-sentence executive summary",
  "aqiAnalysis": "2-sentence AQI analysis with specific values",
  "waterQualityAnalysis": "2-sentence water quality analysis",
  "riskAssessment": "2-sentence composite risk assessment",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"],
  "outlook": "1-sentence short-term environmental outlook"
}`;

  const text = await generate(prompt, SYSTEM_REPORT_ANALYST);
  return parseJSON(text, {
    title: `${type} Environmental Intelligence Report — ${cityData.cityName}`,
    executiveSummary: `${cityData.cityName} recorded an AQI of ${cityData.aqi} during the reporting period. Water quality index stands at ${cityData.water}/100, indicating ${Number(cityData.water) > 75 ? "satisfactory" : "concerning"} conditions. Overall risk composite is ${cityData.risk}/100.`,
    aqiAnalysis: `Current AQI of ${cityData.aqi} places ${cityData.cityName} in the ${Number(cityData.aqi) > 150 ? "unhealthy" : Number(cityData.aqi) > 100 ? "moderate" : "good"} category. PM2.5 at ${cityData.pm25} µg/m³ is the primary contributor.`,
    waterQualityAnalysis: `Water Quality Index of ${cityData.water}/100 reflects ${Number(cityData.water) > 75 ? "acceptable treatment and distribution" : "potential concerns in distribution or treatment"}. Regular monitoring recommended.`,
    riskAssessment: `Composite risk score of ${cityData.risk}/100 indicates ${Number(cityData.risk) > 60 ? "elevated" : "manageable"} environmental exposure. Vulnerable populations require targeted advisories.`,
    keyFindings: [
      `AQI ${cityData.aqi} — ${Number(cityData.aqi) > 100 ? "exceeds" : "within"} WHO 24-hour guideline`,
      `PM2.5 at ${cityData.pm25} µg/m³ (safe limit: 25 µg/m³)`,
      `EcoScore ${cityData.eco}/100 — sustainability performance`,
      `Carbon intensity: ${cityData.carbon} tCO₂e per capita`,
    ],
    recommendations: [
      "Strengthen vehicle emission inspection at entry points",
      "Issue public health advisory for sensitive groups",
      "Deploy additional ambient monitoring near industrial zones",
      "Review water treatment protocols at flagged intake sites",
    ],
    outlook: `Environmental conditions in ${cityData.cityName} are expected to ${Number(cityData.risk) > 60 ? "remain elevated pending meteorological changes" : "remain stable over the short term"}.`,
  });
}

export async function generateReportSummary(
  reportTitle: string,
  cityId: string,
  metrics: Record<string, unknown>
): Promise<string> {
  const prompt = `Write a 3-sentence professional executive summary for an environmental report titled "${reportTitle}" covering ${cityId}. Key metrics: ${JSON.stringify(metrics)}. Be specific and data-driven.`;
  return generate(prompt, SYSTEM_REPORT_ANALYST);
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — AI CITY INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════
export interface CityInsightSet {
  environmentalSummary: string;
  riskAnalysis: string;
  aqiInsights: string;
  sustainabilityInsights: string;
  topActions: string[];
}

export async function generateCityInsights(cityData: Record<string, unknown>): Promise<CityInsightSet> {
  const prompt = `
Generate environmental intelligence insights for ${cityData.cityName}, ${cityData.country}.

Metrics: AQI ${cityData.aqi} | PM2.5 ${cityData.pm25} | Water ${cityData.water}/100 | Risk ${cityData.risk}/100 | Eco ${cityData.eco}/100 | Carbon ${cityData.carbon} tCO₂e

Return ONLY valid JSON:
{
  "environmentalSummary": "2-sentence environmental status summary",
  "riskAnalysis": "2-sentence risk breakdown",
  "aqiInsights": "2-sentence AQI-focused insight with primary drivers",
  "sustainabilityInsights": "2-sentence sustainability and carbon performance insight",
  "topActions": ["priority action 1", "priority action 2", "priority action 3"]
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  return parseJSON<CityInsightSet>(text, {
    environmentalSummary: `${cityData.cityName} currently records an AQI of ${cityData.aqi} with a Water Quality Index of ${cityData.water}/100. The city's environmental composite places it in the ${Number(cityData.eco) > 70 ? "above-average" : "below-average"} sustainability tier.`,
    riskAnalysis: `Composite risk score of ${cityData.risk}/100 indicates ${Number(cityData.risk) > 60 ? "elevated exposure across multiple pollutant vectors" : "manageable risk with targeted monitoring recommended"}.`,
    aqiInsights: `AQI ${cityData.aqi} is primarily driven by PM2.5 (${cityData.pm25} µg/m³) and NO₂ (${cityData.no2} ppb). ${Number(cityData.aqi) > 100 ? "Industrial and vehicular sources are the dominant contributors." : "Conditions are within acceptable range for most population groups."}`,
    sustainabilityInsights: `EcoScore of ${cityData.eco}/100 reflects the city's sustainability trajectory. Carbon intensity of ${cityData.carbon} tCO₂e/capita indicates ${Number(cityData.carbon) > 7 ? "high dependence on fossil fuels" : "moderate carbon footprint"}.`,
    topActions: [
      `${Number(cityData.aqi) > 150 ? "Issue Tier-2 public health advisory immediately" : "Monitor AQI trend for advisory threshold"}`,
      `${Number(cityData.water) < 70 ? "Audit municipal water treatment at flagged intake points" : "Maintain water quality monitoring cadence"}`,
      "Publish monthly environmental bulletin for authorities",
    ],
  });
}

export async function getInsightsFromData(
  cityData: Record<string, unknown>
): Promise<Array<{ icon: string; title: string; body: string; tag: string }>> {
  const insights = await generateCityInsights(cityData);
  return [
    { icon: "trend", title: `AQI ${cityData.aqi} — ${Number(cityData.aqi) > 150 ? "Unhealthy" : Number(cityData.aqi) > 100 ? "Moderate" : "Good"}`, body: insights.aqiInsights, tag: "Air Quality" },
    { icon: "drop",  title: `Water Quality Index: ${cityData.water}/100`, body: insights.environmentalSummary, tag: "Water" },
    { icon: "alert", title: `Risk Score: ${cityData.risk}/100`, body: insights.riskAnalysis, tag: "Risk" },
    { icon: "leaf",  title: `EcoScore: ${cityData.eco}/100`, body: insights.sustainabilityInsights, tag: "Sustainability" },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — AI ALERT EXPLANATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════
export interface AlertExplanation {
  reason: string;
  riskExplanation: string;
  healthImpact: string;
  recommendedActions: string[];
  authorityRecommendations: string[];
}

export async function generateAlertExplanation(alert: {
  title: string;
  severity: string;
  category: string;
  area: string;
  cityName: string;
  aqi?: number;
  pm25?: number;
}): Promise<AlertExplanation> {
  const prompt = `
A ${alert.severity} environmental alert has been triggered.

Alert: "${alert.title}"
Location: ${alert.area}, ${alert.cityName}
Category: ${alert.category}
${alert.aqi ? `Current AQI: ${alert.aqi}` : ""}
${alert.pm25 ? `PM2.5: ${alert.pm25} µg/m³` : ""}

Return ONLY valid JSON:
{
  "reason": "1-sentence scientific explanation of why this alert was triggered",
  "riskExplanation": "1-sentence risk context",
  "healthImpact": "1-sentence health impact for residents",
  "recommendedActions": ["citizen action 1", "citizen action 2", "citizen action 3"],
  "authorityRecommendations": ["authority action 1", "authority action 2", "authority action 3"]
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  return parseJSON<AlertExplanation>(text, {
    reason: `${alert.title} detected due to elevated ${alert.category === "air" ? "pollutant concentration" : alert.category} levels in ${alert.area}.`,
    riskExplanation: `${alert.severity === "critical" ? "Immediate action required" : "Situation requires monitoring"}. Conditions may worsen without intervention.`,
    healthImpact: `${alert.severity === "critical" ? "High health risk for all residents" : "Sensitive groups most affected"}. Respiratory and cardiovascular stress possible.`,
    recommendedActions: ["Stay indoors with windows closed", "Wear N95 mask if going outside", "Check GreenGuard AI for updates"],
    authorityRecommendations: ["Deploy mobile monitoring units to affected zone", "Issue public advisory via emergency broadcast", "Coordinate with industrial units for emission reduction"],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 6 — AI POLICY SIMULATOR INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════
export interface PolicyAnalysis {
  summary: string;
  environmentalImpact: string;
  sustainabilityAnalysis: string;
  healthImpactAnalysis: string;
  longTermRecommendations: string[];
  governmentPolicyRecommendations: string[];
  estimatedTimeline: string;
  costBenefit: string;
}

export async function generatePolicyInsight(
  cityData: Record<string, unknown>,
  levers: Record<string, number>,
  results: Record<string, unknown>
): Promise<string> {
  const analysis = await generateFullPolicyAnalysis(cityData, levers, results);
  return analysis.summary + " " + analysis.environmentalImpact;
}

export async function generateFullPolicyAnalysis(
  cityData: Record<string, unknown>,
  levers: Record<string, number>,
  results: Record<string, unknown>
): Promise<PolicyAnalysis> {
  // Phase 5: levers may include 4 extra optional fields. Render only the ones present
  // so this function stays backward compatible with legacy 4-lever callers.
  const extraLeverLines = [
    levers.renewable !== undefined ? `  Renewable Energy Adoption: ${levers.renewable}%` : null,
    levers.publicTransport !== undefined ? `  Public Transport Usage: ${levers.publicTransport}%` : null,
    levers.wasteManagement !== undefined ? `  Waste Management Efficiency: ${levers.wasteManagement}%` : null,
    levers.greenArea !== undefined ? `  Green Area Expansion: ${levers.greenArea}%` : null,
  ].filter(Boolean).join("\n");

  const extraResultLines = [
    results.projectedPm25 !== undefined ? `  PM2.5: ${results.projectedPm25} µg/m³` : null,
    results.projectedPm10 !== undefined ? `  PM10: ${results.projectedPm10} µg/m³` : null,
    results.projectedRiskScore !== undefined ? `  Environmental Risk Score: ${results.projectedRiskScore}/100` : null,
    results.projectedWaterQuality !== undefined ? `  Water Quality Index: ${results.projectedWaterQuality}/100` : null,
    results.sustainabilityIndex !== undefined ? `  Sustainability Index: ${results.sustainabilityIndex}/100` : null,
  ].filter(Boolean).join("\n");

  const prompt = `
Policy simulation for ${cityData.cityName}, ${cityData.country}.

BASELINE:
  AQI: ${cityData.aqi} | EcoScore: ${cityData.eco}/100 | Carbon: ${cityData.carbon} tCO₂e

POLICY LEVERS APPLIED:
  EV Adoption: ${levers.ev}%
  Traffic Reduction: ${levers.traffic}%
  Tree Plantation: ${levers.trees}k trees/year
  Industrial Growth: ${levers.industry}%
${extraLeverLines}

PROJECTED OUTCOMES:
  AQI: ${results.projectedAqi} (Δ ${results.aqiDelta})
  Health Score: ${results.healthScore}/100
  EcoScore: ${results.ecoScore}/100
  Sustainability: ${results.sustainabilityScore}/100
  Carbon Reduction: ${results.carbonReduction} tCO₂e
${extraResultLines}

Return ONLY valid JSON:
{
  "summary": "2-sentence summary of this policy combination's effectiveness",
  "environmentalImpact": "2-sentence environmental impact analysis",
  "sustainabilityAnalysis": "2-sentence sustainability trajectory analysis",
  "healthImpactAnalysis": "2-sentence public health impact",
  "longTermRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "governmentPolicyRecommendations": ["policy rec 1", "policy rec 2", "policy rec 3"],
  "estimatedTimeline": "estimated time to see measurable impact",
  "costBenefit": "1-sentence cost-benefit assessment"
}`;

  const text = await generate(prompt, SYSTEM_POLICY_ANALYST);
  return parseJSON<PolicyAnalysis>(text, {
    summary: `This policy combination projects an AQI reduction from ${cityData.aqi} to ${results.projectedAqi} — a ${Math.abs(Number(results.aqiDelta))} point improvement. EV adoption and traffic reduction are the highest-leverage interventions.`,
    environmentalImpact: `Carbon emissions are projected to reduce by ${results.carbonReduction} tCO₂e. Industrial growth at ${levers.industry}% partially offsets gains from green transport measures.`,
    sustainabilityAnalysis: `EcoScore improves to ${results.ecoScore}/100 with this policy mix. Tree plantation contributes to long-term carbon sequestration and urban heat island reduction.`,
    healthImpactAnalysis: `Health Impact Index reaches ${results.healthScore}/100, indicating meaningful improvement in respiratory exposure. Sensitive groups will benefit most from PM2.5 reduction.`,
    longTermRecommendations: [
      "Expand EV charging infrastructure before mandating adoption targets",
      "Combine tree plantation with urban greenbelt zoning for maximum impact",
      "Phase industrial growth with mandatory emission offset credits",
    ],
    governmentPolicyRecommendations: [
      `Set binding AQI target of ${Math.round(Number(results.projectedAqi) * 0.9)} by next fiscal year`,
      "Introduce carbon pricing for high-emission industrial units",
      "Launch public transport subsidy to support traffic reduction",
    ],
    estimatedTimeline: "Measurable AQI improvement within 6–18 months; full carbon reduction realised over 3–5 years.",
    costBenefit: `Estimated net benefit: ${Number(results.aqiDelta) < -20 ? "strong positive ROI" : "moderate ROI"} considering reduced healthcare costs and productivity gains.`,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 7 — ADMIN AI ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════
export interface AdminAISummary {
  weeklyTrends: string;
  mostPollutedCities: string;
  complaintAnalysis: string;
  riskSummary: string;
  executiveBulletin: string;
  priorityActions: string[];
}

export async function generateAdminSummary(stats: {
  totalUsers: number;
  activeAlerts: number;
  totalComplaints: number;
  cities: Array<{ cityName: string; aqi: number; risk: number }>;
}): Promise<AdminAISummary> {
  const ranked = [...stats.cities].sort((a, b) => b.aqi - a.aqi);
  const top3 = ranked.slice(0, 3).map((c) => `${c.cityName} (AQI ${c.aqi})`).join(", ");
  const avgAqi = Math.round(stats.cities.reduce((s, c) => s + c.aqi, 0) / stats.cities.length);

  const prompt = `
Generate an executive AI summary for the GreenGuard AI administrator dashboard.

PLATFORM SNAPSHOT:
  Total users: ${stats.totalUsers}
  Active alerts: ${stats.activeAlerts}
  Total complaints: ${stats.totalComplaints}
  Cities monitored: ${stats.cities.length}
  Network avg AQI: ${avgAqi}
  Most polluted: ${top3}

Return ONLY valid JSON:
{
  "weeklyTrends": "2-sentence weekly environmental trend summary across the network",
  "mostPollutedCities": "1-sentence identification and context for top polluted cities",
  "complaintAnalysis": "1-sentence complaint volume analysis",
  "riskSummary": "1-sentence network-wide risk assessment",
  "executiveBulletin": "3-sentence executive bulletin suitable for a minister's briefing",
  "priorityActions": ["action 1", "action 2", "action 3"]
}`;

  const text = await generate(prompt, SYSTEM_REPORT_ANALYST);
  return parseJSON<AdminAISummary>(text, {
    weeklyTrends: `Network average AQI stands at ${avgAqi} across ${stats.cities.length} monitored cities. ${stats.activeAlerts} active alerts indicate elevated environmental stress in multiple zones.`,
    mostPollutedCities: `${top3} are the highest-pollution cities requiring priority intervention this period.`,
    complaintAnalysis: `${stats.totalComplaints} citizen complaints logged; open burning and air pollution are the primary issue categories.`,
    riskSummary: `Network-wide risk composite is ${avgAqi > 150 ? "high" : avgAqi > 100 ? "moderate" : "low"} — ${stats.activeAlerts} cities require immediate authority attention.`,
    executiveBulletin: `GreenGuard AI is monitoring ${stats.cities.length} cities with ${stats.totalUsers} registered users. Network AQI averages ${avgAqi}, with ${top3} flagged for immediate intervention. ${stats.activeAlerts} critical alerts are active requiring coordinated authority response.`,
    priorityActions: [
      `Deploy emergency response units to ${ranked[0]?.cityName ?? "highest-AQI city"}`,
      "Escalate industrial emission audit in top-3 polluted zones",
      "Brief municipal authorities on active alert status",
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// EXISTING FEATURE — RECOMMENDATIONS (enhanced)
// ══════════════════════════════════════════════════════════════════════════════
export async function generateRecommendations(
  cityData: Record<string, unknown>
): Promise<Array<{ title: string; impact: string; effort: string; confidence: number }>> {
  const prompt = `
For ${cityData.cityName}: AQI ${cityData.aqi}, PM2.5 ${cityData.pm25} µg/m³, Water QI ${cityData.water}/100, Risk ${cityData.risk}/100.
Generate exactly 4 high-priority environmental action recommendations.
Return ONLY a JSON array:
[{"title":"specific action","impact":"metric improvement e.g. −18 AQI","effort":"Low|Medium|High","confidence":0.0-1.0}]`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  const parsed = parseJSON<Array<{ title: string; impact: string; effort: string; confidence: number }>>(text, []);
  if (Array.isArray(parsed) && parsed.length >= 1) return parsed.slice(0, 4);
  return [
    { title: "Restrict heavy vehicles 06:00–10:00 in urban core", impact: "−18 AQI", effort: "Low", confidence: 0.86 },
    { title: "Activate misting stations in high-pollution zones", impact: "−9 PM10", effort: "Medium", confidence: 0.74 },
    { title: "Issue public advisory for sensitive groups", impact: "Health risk ↓15%", effort: "Low", confidence: 0.92 },
    { title: "Audit industrial cluster emissions", impact: "−24 PM2.5", effort: "High", confidence: 0.68 },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — ENVIRONMENTAL INTELLIGENCE FUNCTIONS
// All functions query MongoDB data first, then pass real values to Gemini.
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. AQI Trend Interpretation ─────────────────────────────────────────────
export interface AQITrendInsight {
  summary: string;
  direction: string;
  primaryDrivers: string[];
  forecast: string;
  healthAlert: string;
}

export async function analyzeAQITrend(cityId: string, days: number = 7): Promise<AQITrendInsight> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await EnvironmentalData.aggregate([
    { $match: { cityId: cityId.toLowerCase(), timestamp: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        avgAqi:  { $avg: "$aqi" },
        avgPm25: { $avg: "$pm25" },
        avgNo2:  { $avg: "$no2" },
        avgO3:   { $avg: "$o3" },
        maxAqi:  { $max: "$aqi" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const latest = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({ timestamp: -1 }).lean();
  const cityName = latest?.cityName ?? cityId;

  const fallback: AQITrendInsight = {
    summary: `${cityName} AQI trend data is being collected. Current AQI: ${latest?.aqi ?? "N/A"}.`,
    direction: latest?.aqi ?? 0 > 100 ? "elevated" : "moderate",
    primaryDrivers: ["PM2.5 particulates", "Traffic emissions"],
    forecast: "Conditions expected to remain similar over the next 24 hours.",
    healthAlert: latest?.aqi ?? 0 > 150 ? "Sensitive groups should limit outdoor exposure." : "Air quality is acceptable for most individuals.",
  };

  if (!history.length || !latest) return fallback;

  const dataTable = history.map(d =>
    `${d._id}: AQI ${Math.round(d.avgAqi)}, PM2.5 ${Math.round(d.avgPm25)}, NO2 ${Math.round(d.avgNo2)}, O3 ${Math.round(d.avgO3)}, Peak ${Math.round(d.maxAqi)}`
  ).join("\n");

  const prompt = `
You are an environmental data analyst. Analyze this ${days}-day AQI trend for ${cityName}:

${dataTable}

Current reading: AQI ${latest.aqi}, PM2.5 ${latest.pm25} µg/m³, Temp ${latest.temp}°C, Humidity ${latest.humidity}%

Return ONLY valid JSON:
{
  "summary": "2-sentence factual trend summary using the actual numbers",
  "direction": "improving|worsening|stable",
  "primaryDrivers": ["driver 1 based on data", "driver 2", "driver 3"],
  "forecast": "1-sentence 24-48 hour forecast based on trend",
  "healthAlert": "1-sentence health guidance based on current AQI level"
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  return parseJSON<AQITrendInsight>(text, fallback);
}

// ─── 2. Pollution Hotspot Analysis ───────────────────────────────────────────
export interface HotspotAnalysis {
  overallRisk: string;
  worstPollutant: string;
  hotspotZones: Array<{ zone: string; concern: string; recommendation: string }>;
  immediateActions: string[];
}

export async function analyzePollutionHotspots(cityId: string): Promise<HotspotAnalysis> {
  const latest = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({ timestamp: -1 }).lean();

  const fallback: HotspotAnalysis = {
    overallRisk: "moderate",
    worstPollutant: "PM2.5",
    hotspotZones: [
      { zone: "Industrial Corridor", concern: "High particulate matter from manufacturing", recommendation: "Enforce emission limits during peak hours" },
      { zone: "Transport Hub", concern: "NO2 from diesel vehicles", recommendation: "Promote electric vehicle transition" },
    ],
    immediateActions: ["Issue advisory for sensitive groups", "Increase monitoring frequency in industrial zones"],
  };

  if (!latest) return fallback;

  const pollutants = {
    PM25: latest.pm25 ?? 0,
    PM10: latest.pm10 ?? 0,
    NO2: latest.no2 ?? 0,
    O3: latest.o3 ?? 0,
    SO2: latest.so2 ?? 0,
    CO: latest.co ?? 0,
  };
  const worstEntry = Object.entries(pollutants).sort((a, b) => {
    // Normalize against WHO limits: PM2.5=15, PM10=45, NO2=25, O3=100, SO2=40, CO=4
    const limits: Record<string, number> = { PM25: 15, PM10: 45, NO2: 25, O3: 100, SO2: 40, CO: 4 };
    return (b[1] / (limits[b[0]] ?? 1)) - (a[1] / (limits[a[0]] ?? 1));
  })[0];

  const prompt = `
Environmental hotspot analysis for ${latest.cityName}:

Current readings:
- AQI: ${latest.aqi}
- PM2.5: ${latest.pm25} µg/m³ (WHO limit: 15)
- PM10: ${latest.pm10} µg/m³ (WHO limit: 45)
- NO2: ${latest.no2} µg/m³ (WHO limit: 25)
- O3: ${latest.o3} µg/m³
- SO2: ${latest.so2} µg/m³
- CO: ${latest.co} mg/m³
- Risk Score: ${latest.risk}/100

Identify realistic pollution hotspot zones for this city type and AQI level.
Return ONLY valid JSON:
{
  "overallRisk": "low|moderate|high|critical",
  "worstPollutant": "name of the pollutant most exceeding WHO limits",
  "hotspotZones": [
    { "zone": "zone name", "concern": "specific pollution concern", "recommendation": "specific action" }
  ],
  "immediateActions": ["action 1", "action 2", "action 3"]
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  const result = parseJSON<HotspotAnalysis>(text, fallback);
  // Inject data-derived worst pollutant if Gemini response is generic
  if (!result.worstPollutant || result.worstPollutant === "PM2.5") {
    result.worstPollutant = worstEntry[0].replace("PM25", "PM2.5");
  }
  return result;
}

// ─── 3. Health Impact Analysis ───────────────────────────────────────────────
export interface HealthImpactAnalysis {
  riskLevel: string;
  affectedGroups: string[];
  symptoms: string[];
  recommendations: string[];
  hospitalAdvisory: string;
  outdoorGuidance: string;
}

export async function generateHealthImpactAnalysis(cityId: string): Promise<HealthImpactAnalysis> {
  const latest = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({ timestamp: -1 }).lean();

  const aqi = latest?.aqi ?? 80;
  const fallback: HealthImpactAnalysis = {
    riskLevel: aqi > 200 ? "Very Unhealthy" : aqi > 150 ? "Unhealthy" : aqi > 100 ? "Unhealthy for Sensitive Groups" : aqi > 50 ? "Moderate" : "Good",
    affectedGroups: aqi > 100 ? ["Elderly", "Children under 12", "Asthma patients", "Heart disease patients"] : ["General public unaffected"],
    symptoms: aqi > 100 ? ["Respiratory irritation", "Eye irritation", "Aggravated asthma"] : ["Minimal symptoms expected"],
    recommendations: ["Monitor air quality updates", "Keep windows closed during peak pollution hours"],
    hospitalAdvisory: aqi > 150 ? "Hospitals should expect increased respiratory admissions." : "No unusual hospital preparation needed.",
    outdoorGuidance: aqi > 150 ? "Avoid outdoor activities. Use N95 masks if going outside." : "Light outdoor activity acceptable. Avoid prolonged strenuous exercise.",
  };

  if (!latest) return fallback;

  const prompt = `
Health impact analysis for ${latest.cityName}:
AQI: ${latest.aqi} | PM2.5: ${latest.pm25} µg/m³ | PM10: ${latest.pm10} µg/m³
NO2: ${latest.no2} µg/m³ | O3: ${latest.o3} µg/m³ | Temp: ${latest.temp}°C | Humidity: ${latest.humidity}%

Generate a medically-informed health impact assessment.
Return ONLY valid JSON:
{
  "riskLevel": "Good|Moderate|Unhealthy for Sensitive Groups|Unhealthy|Very Unhealthy|Hazardous",
  "affectedGroups": ["group 1", "group 2", "group 3"],
  "symptoms": ["symptom 1", "symptom 2", "symptom 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "hospitalAdvisory": "1-sentence guidance for healthcare facilities",
  "outdoorGuidance": "1-sentence guidance for public outdoor activities"
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  return parseJSON<HealthImpactAnalysis>(text, fallback);
}

// ─── 4. Environmental Risk Score Analysis ────────────────────────────────────
export interface RiskAnalysis {
  compositeScore: number;
  airQualityRisk: string;
  climateRisk: string;
  waterRisk: string;
  carbonRisk: string;
  riskFactors: string[];
  mitigationPriority: string;
}

export async function generateEnvironmentalRiskAnalysis(cityId: string): Promise<RiskAnalysis> {
  const latest = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({ timestamp: -1 }).lean();

  const fallback: RiskAnalysis = {
    compositeScore: latest?.risk ?? 50,
    airQualityRisk: "moderate",
    climateRisk: "moderate",
    waterRisk: "low",
    carbonRisk: "moderate",
    riskFactors: ["PM2.5 above WHO guidelines", "Seasonal temperature variation"],
    mitigationPriority: "Focus on reducing particulate matter from transport and industry.",
  };

  if (!latest) return fallback;

  const prompt = `
Environmental risk analysis for ${latest.cityName}:
- Composite Risk Score: ${latest.risk}/100
- AQI: ${latest.aqi} | PM2.5: ${latest.pm25} µg/m³
- Water Quality Index: ${latest.water}/100
- Carbon Footprint: ${latest.carbon} tonnes/capita
- Eco Score: ${latest.eco}/100
- Temperature: ${latest.temp}°C | Humidity: ${latest.humidity}%
- Green Cover: ${latest.greenCover}%
- Renewable Energy Share: ${latest.renewableShare}%

Return ONLY valid JSON:
{
  "compositeScore": ${latest.risk},
  "airQualityRisk": "low|moderate|high|critical",
  "climateRisk": "low|moderate|high|critical",
  "waterRisk": "low|moderate|high|critical",
  "carbonRisk": "low|moderate|high|critical",
  "riskFactors": ["factor 1", "factor 2", "factor 3"],
  "mitigationPriority": "1-sentence highest-priority mitigation action"
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  const result = parseJSON<RiskAnalysis>(text, fallback);
  result.compositeScore = latest.risk ?? result.compositeScore; // always use real score
  return result;
}

// ─── 5. City Comparison Analysis ─────────────────────────────────────────────
export interface CityComparisonAnalysis {
  summary: string;
  bestPerformer: string;
  worstPerformer: string;
  keyDifferences: string[];
  networkRecommendation: string;
}

export async function compareCities(cityIds: string[]): Promise<CityComparisonAnalysis> {
  const ids = cityIds.map(id => id.toLowerCase());
  const cities = await EnvironmentalData.aggregate([
    { $match: { cityId: { $in: ids } } },
    { $sort: { cityId: 1, timestamp: -1 } },
    { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { aqi: 1 } },
  ]);

  const fallback: CityComparisonAnalysis = {
    summary: "Comparison across monitored cities shows varying pollution levels.",
    bestPerformer: cities[0]?.cityName ?? "N/A",
    worstPerformer: cities[cities.length - 1]?.cityName ?? "N/A",
    keyDifferences: ["AQI variance across network", "PM2.5 concentration differences"],
    networkRecommendation: "Share pollution mitigation strategies from lower-AQI cities to higher-AQI cities.",
  };

  if (cities.length < 2) return fallback;

  const table = cities.map(c =>
    `${c.cityName}: AQI ${c.aqi}, PM2.5 ${c.pm25}, Risk ${c.risk}, Eco ${c.eco}, Water ${c.water}, Carbon ${c.carbon}`
  ).join("\n");

  const prompt = `
Compare these cities environmental performance using real data:

${table}

Return ONLY valid JSON:
{
  "summary": "2-sentence comparative summary using actual city names and numbers",
  "bestPerformer": "city name with best overall environmental metrics",
  "worstPerformer": "city name with worst overall environmental metrics",
  "keyDifferences": ["specific difference 1 with numbers", "specific difference 2", "specific difference 3"],
  "networkRecommendation": "1-sentence cross-city policy recommendation"
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  return parseJSON<CityComparisonAnalysis>(text, fallback);
}

// ─── 6. Sustainability Recommendations ───────────────────────────────────────
export interface SustainabilityRecommendations {
  overallScore: number;
  trend: string;
  quickWins: string[];
  mediumTermActions: string[];
  longTermGoals: string[];
  benchmarkVsNetwork: string;
}

export async function generateSustainabilityRecommendations(cityId: string): Promise<SustainabilityRecommendations> {
  const id = cityId.toLowerCase();
  const latest = await EnvironmentalData.findOne({ cityId: id }).sort({ timestamp: -1 }).lean();

  // Get 30-day avg for trend
  const avg30 = await EnvironmentalData.aggregate([
    { $match: { cityId: id, timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: null, avgEco: { $avg: "$eco" }, avgRisk: { $avg: "$risk" } } },
  ]);

  // Network avg eco score for benchmarking
  const networkAvg = await EnvironmentalData.aggregate([
    { $sort: { cityId: 1, timestamp: -1 } },
    { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
    { $group: { _id: null, avgEco: { $avg: "$doc.eco" } } },
  ]);

  const currentEco    = latest?.eco    ?? 50;
  const avg30Eco      = avg30[0]?.avgEco ?? currentEco;
  const networkEco    = networkAvg[0]?.avgEco ?? 50;
  const trendDir      = currentEco >= avg30Eco ? "improving" : "declining";

  const fallback: SustainabilityRecommendations = {
    overallScore: currentEco,
    trend: trendDir,
    quickWins: ["Expand public transport routes", "Launch citizen tree-planting initiative", "Install solar panels on government buildings"],
    mediumTermActions: ["Phase out coal-based power plants", "Introduce EV charging infrastructure", "Upgrade industrial emission filters"],
    longTermGoals: ["Achieve 40% renewable energy mix by 2030", "Restore 15% green cover", "Reduce carbon footprint by 30%"],
    benchmarkVsNetwork: `${latest?.cityName ?? cityId} eco score of ${currentEco} is ${currentEco >= networkEco ? "above" : "below"} the network average of ${Math.round(networkEco)}.`,
  };

  if (!latest) return fallback;

  const prompt = `
Sustainability analysis for ${latest.cityName}:
- Current Eco Score: ${latest.eco}/100 (30-day avg: ${Math.round(avg30Eco)})
- Network Average Eco Score: ${Math.round(networkEco)}/100
- AQI: ${latest.aqi} | PM2.5: ${latest.pm25}
- Green Cover: ${latest.greenCover}%
- Renewable Energy Share: ${latest.renewableShare}%
- Water Quality: ${latest.water}/100
- Carbon Footprint: ${latest.carbon} tonnes/capita
- Trend: ${trendDir}

Generate actionable sustainability recommendations grounded in these metrics.
Return ONLY valid JSON:
{
  "overallScore": ${latest.eco},
  "trend": "${trendDir}",
  "quickWins": ["action achievable within 3 months", "action 2", "action 3"],
  "mediumTermActions": ["action achievable in 6-18 months", "action 2", "action 3"],
  "longTermGoals": ["goal achievable in 2-5 years", "goal 2", "goal 3"],
  "benchmarkVsNetwork": "1-sentence comparison vs network average using exact numbers"
}`;

  const text = await generate(prompt, SYSTEM_ENV_ANALYST);
  const result = parseJSON<SustainabilityRecommendations>(text, fallback);
  result.overallScore = currentEco;
  result.trend        = trendDir;
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — EXECUTIVE POLICY SIMULATOR INTELLIGENCE
// Government/judge-ready briefing generation for the simulator's executive
// decision-support dashboard, plus scenario-comparison narrative.
// ══════════════════════════════════════════════════════════════════════════════
export interface ExecutiveBriefing {
  executiveSummary: string;
  keyFindings: string[];
  predictedEnvironmentalBenefits: string[];
  healthImpactSummary: string;
  sustainabilityImprovements: string;
  governmentRecommendations: string[];
}

export async function generateExecutiveBriefing(
  cityData: Record<string, unknown>,
  levers: Record<string, number>,
  results: Record<string, unknown>,
  executiveScores: Record<string, unknown>
): Promise<ExecutiveBriefing> {
  const prompt = `
Produce a government/judge-ready executive briefing for an environmental policy simulation.

CITY: ${cityData.cityName}, ${cityData.country}
BASELINE AQI: ${cityData.aqi} | BASELINE ECO SCORE: ${cityData.eco}/100

POLICY LEVERS:
  EV Adoption ${levers.ev}% · Traffic Reduction ${levers.traffic}% · Tree Plantation ${levers.trees}k/yr · Industrial Growth ${levers.industry}%
  Renewable Energy ${levers.renewable}% · Public Transport ${levers.publicTransport}% · Waste Mgmt Efficiency ${levers.wasteManagement}% · Green Area Expansion ${levers.greenArea}%

PROJECTED RESULTS:
  AQI ${results.projectedAqi} (Δ${results.aqiDelta}) · PM2.5 ${results.projectedPm25} · PM10 ${results.projectedPm10}
  EcoScore ${results.projectedEcoScore} · Risk ${results.projectedRiskScore} · Sustainability Index ${results.sustainabilityIndex}
  Carbon Reduction ${results.carbonReductionTons} tCO2e · Health Score ${results.healthScore}

EXECUTIVE SCORES:
  Environmental Impact ${executiveScores.environmentalImpactScore}/100 · Sustainability ${executiveScores.sustainabilityScore}/100
  Policy Effectiveness ${executiveScores.policyEffectivenessScore}/100 · Public Health ${executiveScores.publicHealthImprovementScore}/100
  Long-Term Benefit ${executiveScores.longTermBenefitScore}/100 · Overall ${executiveScores.overallScore}/100 (${executiveScores.verdict})

Write in a formal, data-driven, presentation-ready register suitable for government officials and judges.
Return ONLY valid JSON:
{
  "executiveSummary": "3-sentence top-level summary of the policy package and its verdict",
  "keyFindings": ["finding 1 with numbers", "finding 2 with numbers", "finding 3 with numbers"],
  "predictedEnvironmentalBenefits": ["benefit 1", "benefit 2", "benefit 3"],
  "healthImpactSummary": "2-sentence public health impact summary",
  "sustainabilityImprovements": "2-sentence sustainability trajectory summary",
  "governmentRecommendations": ["policy action 1", "policy action 2", "policy action 3"]
}`;

  const text = await generate(prompt, SYSTEM_POLICY_ANALYST);
  return parseJSON<ExecutiveBriefing>(text, {
    executiveSummary: `This policy package is projected to move ${String(cityData.cityName)} from AQI ${cityData.aqi} to ${results.projectedAqi}, an overall score of ${executiveScores.overallScore}/100 (${executiveScores.verdict}). The combination shows ${Number(executiveScores.overallScore) >= 55 ? "strong" : "moderate"} alignment between environmental, health, and sustainability objectives.`,
    keyFindings: [
      `AQI projected to shift from ${cityData.aqi} to ${results.projectedAqi} (Δ${results.aqiDelta})`,
      `EcoScore projected at ${results.projectedEcoScore}/100, a change of ${results.ecoScoreDelta ?? ""} points`,
      `Estimated carbon reduction of ${results.carbonReductionTons} tCO2e through combined levers`,
    ],
    predictedEnvironmentalBenefits: [
      `PM2.5 projected to reach ${results.projectedPm25} µg/m³`,
      `PM10 projected to reach ${results.projectedPm10} µg/m³`,
      `Environmental risk score projected at ${results.projectedRiskScore}/100`,
    ],
    healthImpactSummary: `Public health score reaches ${results.healthScore}/100 under this scenario, primarily driven by AQI and PM2.5 reduction. Sensitive populations are expected to see the largest relative benefit.`,
    sustainabilityImprovements: `Sustainability index reaches ${results.sustainabilityIndex}/100, reflecting combined gains from green cover, waste efficiency, and renewable adoption. Long-term benefit score stands at ${executiveScores.longTermBenefitScore}/100.`,
    governmentRecommendations: [
      "Phase implementation starting with highest-leverage levers identified in this simulation",
      "Establish quarterly monitoring checkpoints against the projected AQI and EcoScore targets",
      "Pair infrastructure investment (EV charging, transit) with the adoption targets modeled here",
    ],
  });
}

export interface ScenarioComparisonNarrative {
  headline: string;
  recommendation: string;
  tradeoffs: string;
}

export async function generateComparisonNarrative(
  cityName: string,
  scenarioAName: string,
  scenarioBName: string,
  diff: Record<string, unknown>
): Promise<ScenarioComparisonNarrative> {
  const prompt = `
Compare two environmental policy scenarios for ${cityName}.

SCENARIO A: ${scenarioAName}
SCENARIO B: ${scenarioBName}

DIFFERENCE (B minus A):
  AQI difference: ${diff.aqiDifference}
  EcoScore difference: ${diff.ecoScoreDifference}
  Sustainability difference: ${diff.sustainabilityDifference}
  Carbon impact difference: ${diff.carbonImpactDifference}
  Health impact difference: ${diff.healthImpactDifference}
  Risk score difference: ${diff.riskScoreDifference}

Return ONLY valid JSON:
{
  "headline": "1-sentence headline naming which scenario performs better and by how much",
  "recommendation": "1-2 sentence recommendation on which scenario to pursue and why",
  "tradeoffs": "1-2 sentence note on any trade-offs between the scenarios"
}`;

  const text = await generate(prompt, SYSTEM_POLICY_ANALYST);
  return parseJSON<ScenarioComparisonNarrative>(text, {
    headline: `${Number(diff.aqiDifference) < 0 ? scenarioBName : scenarioAName} achieves a lower projected AQI, a difference of ${Math.abs(Number(diff.aqiDifference))} points.`,
    recommendation: `Based on combined AQI, EcoScore, and sustainability differences, the scenario with the larger positive sustainability difference (${diff.sustainabilityDifference}) is the stronger long-term choice.`,
    tradeoffs: `Carbon impact differs by ${diff.carbonImpactDifference} tCO2e and health impact by ${diff.healthImpactDifference} points between the two scenarios — weigh these against implementation cost and timeline.`,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — COMMAND CENTER INTELLIGENCE FUNCTIONS
// Two new functions for capabilities that have no existing equivalent.
// All other Phase 6 Gemini calls reuse existing functions above.
// ══════════════════════════════════════════════════════════════════════════════

const SYSTEM_EXECUTIVE_ANALYST =
  "You are a senior environmental intelligence officer producing government-grade assessments " +
  "for municipal corporations, smart city boards, and pollution control bodies. " +
  "Responses must be executive-level, data-driven, and presentation-ready. " +
  "Use formal English. Never use first person. Cite metric values precisely.";

// ─── Phase 6 — 1. Network Executive Summary ───────────────────────────────────
// Framed for government/board audience — distinct from generateAdminSummary
// which is framed for platform operators.
export interface NetworkExecutiveSummary {
  overallHealthRating: "Critical" | "Poor" | "Moderate" | "Good" | "Excellent";
  headline: string;
  networkAssessment: string;
  topConcerns: string[];
  priorityInterventions: string[];
  outlook: string;
}

export async function generateNetworkExecutiveSummary(params: {
  cities: Array<{ cityName: string; aqi: number; risk: number; eco: number }>;
  activeAlerts: number;
  totalComplaints: number;
}): Promise<NetworkExecutiveSummary> {
  const { cities, activeAlerts, totalComplaints } = params;
  const avgAqi  = cities.reduce((s, c) => s + c.aqi, 0) / cities.length;
  const avgRisk = cities.reduce((s, c) => s + (c.risk ?? 0), 0) / cities.length;
  const avgEco  = cities.reduce((s, c) => s + (c.eco ?? 0), 0) / cities.length;

  const rating: NetworkExecutiveSummary["overallHealthRating"] =
    avgAqi > 200 ? "Critical" :
    avgAqi > 150 ? "Poor" :
    avgAqi > 100 ? "Moderate" :
    avgAqi > 50  ? "Good" : "Excellent";

  const cityTable = cities.slice(0, 8).map(c =>
    `${c.cityName}: AQI ${c.aqi}, Risk ${c.risk}/100, EcoScore ${c.eco}/100`
  ).join("\n");

  const prompt = `
Produce a government-board-ready Environmental Network Assessment.

MONITORED CITIES (${cities.length} total):
${cityTable}

NETWORK AVERAGES:
  Average AQI: ${Math.round(avgAqi)} | Average Risk Score: ${Math.round(avgRisk)}/100 | Average EcoScore: ${Math.round(avgEco)}/100
  Active Alerts: ${activeAlerts} | Total Complaints Logged: ${totalComplaints}

OVERALL HEALTH RATING: ${rating}

Return ONLY valid JSON:
{
  "overallHealthRating": "${rating}",
  "headline": "1-sentence executive headline summarising network environmental health",
  "networkAssessment": "2-3 sentence formal assessment of the current network-wide environmental status",
  "topConcerns": ["concern 1 with city name and metric", "concern 2", "concern 3"],
  "priorityInterventions": ["intervention 1 with expected impact", "intervention 2", "intervention 3"],
  "outlook": "1-2 sentence short-term outlook based on current data"
}`;

  const text = await generate(prompt, SYSTEM_EXECUTIVE_ANALYST);
  return parseJSON<NetworkExecutiveSummary>(text, {
    overallHealthRating: rating,
    headline: `The monitored network of ${cities.length} cities shows an average AQI of ${Math.round(avgAqi)} with ${activeAlerts} active environmental alerts requiring immediate attention.`,
    networkAssessment: `Network-wide environmental health is rated ${rating} based on an average AQI of ${Math.round(avgAqi)} and risk score of ${Math.round(avgRisk)}/100. ${activeAlerts} active alerts indicate elevated environmental stress across monitored jurisdictions.`,
    topConcerns: [
      `Elevated AQI in high-pollution cities exceeding WHO safe limits`,
      `${activeAlerts} active environmental alerts requiring authority response`,
      `Average risk score of ${Math.round(avgRisk)}/100 indicating moderate-to-high environmental risk`,
    ],
    priorityInterventions: [
      "Deploy emergency air quality monitoring in highest-AQI cities",
      "Activate inter-agency response protocols for active critical alerts",
      "Initiate compliance audits in cities with risk scores above 65/100",
    ],
    outlook: `Without targeted interventions, current trends project continued environmental stress. Immediate authority action on the highest-priority cities is recommended.`,
  });
}

// ─── Phase 6 — 2. Authority Action Plan ──────────────────────────────────────
// Combines live AQI + complaint breakdown + active alerts into a structured
// per-city action plan. Distinct from generateSustainabilityRecommendations
// (eco-only) and generateRecommendations (generic 4-item list).
export interface AuthorityActionPlan {
  urgencyLevel: "Immediate" | "High" | "Moderate" | "Routine";
  treePlantationTarget: string;
  trafficOptimization: string[];
  wasteManagement: string[];
  inspectionSchedule: string[];
  emergencyInterventions: string[];
  estimatedAqiImprovement: string;
  timeframe: string;
}

export async function generateAuthorityActionPlan(
  cityData: { cityName: string; country: string; aqi: number; risk: number; eco: number; pm25: number; pm10: number; carbon: number },
  complaints: { total: number; pending: number },
  alerts: { total: number; critical: number }
): Promise<AuthorityActionPlan> {
  const urgency: AuthorityActionPlan["urgencyLevel"] =
    cityData.aqi > 200 || alerts.critical > 0 ? "Immediate" :
    cityData.aqi > 150 || complaints.pending > 10 ? "High" :
    cityData.aqi > 100 ? "Moderate" : "Routine";

  const prompt = `
Generate a structured authority action plan for municipal officers.

CITY: ${cityData.cityName}, ${cityData.country}
CURRENT CONDITIONS:
  AQI: ${cityData.aqi} | PM2.5: ${cityData.pm25} µg/m³ | PM10: ${cityData.pm10} µg/m³
  Risk Score: ${cityData.risk}/100 | EcoScore: ${cityData.eco}/100 | Carbon: ${cityData.carbon} tCO2e/capita
OPERATIONAL STATUS:
  Active Alerts: ${alerts.total} (Critical: ${alerts.critical})
  Pending Complaints: ${complaints.pending} of ${complaints.total} total
URGENCY LEVEL: ${urgency}

Return ONLY valid JSON:
{
  "urgencyLevel": "${urgency}",
  "treePlantationTarget": "specific number and location type, e.g. 12,000 trees in industrial buffer zones",
  "trafficOptimization": ["specific action 1", "specific action 2", "specific action 3"],
  "wasteManagement": ["specific action 1", "specific action 2"],
  "inspectionSchedule": ["specific inspection target 1 with frequency", "target 2"],
  "emergencyInterventions": ${cityData.aqi > 150 || alerts.critical > 0 ? '["intervention 1", "intervention 2"]' : '[]'},
  "estimatedAqiImprovement": "e.g. −15 to −25 AQI within 3 months",
  "timeframe": "e.g. Immediate: 0–2 weeks | Short-term: 1–3 months | Long-term: 6–12 months"
}`;

  const text = await generate(prompt, SYSTEM_EXECUTIVE_ANALYST);
  return parseJSON<AuthorityActionPlan>(text, {
    urgencyLevel: urgency,
    treePlantationTarget: `${Math.round(cityData.aqi * 50)} trees in high-density and industrial zones to reduce particulate matter`,
    trafficOptimization: [
      `Restrict heavy goods vehicles from urban core 06:00–10:00 and 17:00–20:00`,
      `Expand odd-even vehicle scheme on arterial roads during high-AQI days`,
      `Deploy mobile anti-smog guns at major traffic junctions`,
    ],
    wasteManagement: [
      `Eliminate open waste burning within city limits — issue notices within 48 hours`,
      `Increase waste collection frequency in high-complaint zones by 40%`,
    ],
    inspectionSchedule: [
      `Industrial cluster emissions audit — weekly for facilities in risk zones`,
      `Construction site dust control inspection — bi-weekly`,
    ],
    emergencyInterventions: cityData.aqi > 150
      ? [`Issue public health advisory for AQI ${cityData.aqi}`, `Activate emergency response protocol — suspend outdoor school activities`]
      : [],
    estimatedAqiImprovement: `−12 to −20 AQI within 6–8 weeks with consistent enforcement`,
    timeframe: `Immediate: 0–2 weeks | Short-term: 1–3 months | Long-term: 6–12 months`,
  });
}

// ─── Phase 6 — 3. Executive Report Generator ─────────────────────────────────
// Network-wide report with formal structure for government presentation.
export interface ExecutiveReportOutput {
  title: string;
  period: string;
  executiveSummary: string;
  networkHealthAssessment: string;
  keyFindings: string[];
  cityPerformanceHighlights: string[];
  actionItems: string[];
  recommendations: string[];
  conclusion: string;
}

export async function generateExecutiveReport(
  networkStats: {
    type: string;
    cityCount: number;
    avgAqi: number;
    avgRisk: number;
    avgEco: number;
    activeAlerts: number;
    totalComplaints: number;
    resolvedComplaints: number;
    resolutionRate: number;
    worstCity: { name: string; aqi: number } | null;
    bestCity:  { name: string; aqi: number } | null;
  },
  reportType: string
): Promise<ExecutiveReportOutput> {
  const now = new Date();
  const period = reportType === "Weekly"
    ? `Week of ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`
    : reportType === "Monthly"
    ? now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : `As of ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`;

  const prompt = `
Generate a formal ${reportType} Environmental Intelligence Report for government authorities.

REPORTING PERIOD: ${period}
NETWORK SCOPE: ${networkStats.cityCount} monitored cities

KEY METRICS:
  Average AQI: ${networkStats.avgAqi} | Average Risk Score: ${networkStats.avgRisk}/100 | Average EcoScore: ${networkStats.avgEco}/100
  Active Alerts: ${networkStats.activeAlerts}
  Total Complaints: ${networkStats.totalComplaints} | Resolved: ${networkStats.resolvedComplaints} (${networkStats.resolutionRate}% resolution rate)
  Highest Pollution: ${networkStats.worstCity?.name ?? "N/A"} (AQI ${networkStats.worstCity?.aqi ?? "N/A"})
  Best Performance: ${networkStats.bestCity?.name ?? "N/A"} (AQI ${networkStats.bestCity?.aqi ?? "N/A"})

Write in formal, government-grade English. Be specific with numbers.
Return ONLY valid JSON:
{
  "title": "formal report title including report type and period",
  "period": "${period}",
  "executiveSummary": "3-sentence executive summary citing specific metrics",
  "networkHealthAssessment": "2-3 sentence formal assessment of overall network environmental health",
  "keyFindings": ["finding 1 with data", "finding 2 with data", "finding 3 with data", "finding 4 with data"],
  "cityPerformanceHighlights": ["highlight 1", "highlight 2", "highlight 3"],
  "actionItems": ["action 1 with responsible authority", "action 2", "action 3"],
  "recommendations": ["recommendation 1 with expected outcome", "recommendation 2", "recommendation 3"],
  "conclusion": "2-sentence formal conclusion"
}`;

  const text = await generate(prompt, SYSTEM_EXECUTIVE_ANALYST);
  return parseJSON<ExecutiveReportOutput>(text, {
    title: `${reportType} Environmental Intelligence Report — ${period}`,
    period,
    executiveSummary: `This ${reportType.toLowerCase()} report covers ${networkStats.cityCount} monitored cities with an average AQI of ${networkStats.avgAqi} and ${networkStats.activeAlerts} active environmental alerts. The network's average risk score stands at ${networkStats.avgRisk}/100, indicating ${networkStats.avgRisk > 60 ? "elevated" : "moderate"} environmental stress. Complaint resolution rate is ${networkStats.resolutionRate}%.`,
    networkHealthAssessment: `Network-wide environmental health reflects an average AQI of ${networkStats.avgAqi} across ${networkStats.cityCount} cities, with ${networkStats.activeAlerts} active alerts requiring authority action. EcoScore averaging ${networkStats.avgEco}/100 indicates opportunities for environmental improvement.`,
    keyFindings: [
      `Average AQI of ${networkStats.avgAqi} across the monitored network`,
      `${networkStats.activeAlerts} environmental alerts currently active`,
      `${networkStats.resolvedComplaints} of ${networkStats.totalComplaints} complaints resolved (${networkStats.resolutionRate}% rate)`,
      networkStats.worstCity ? `Highest pollution recorded in ${networkStats.worstCity.name} with AQI ${networkStats.worstCity.aqi}` : "Data being collected",
    ],
    cityPerformanceHighlights: [
      networkStats.bestCity ? `${networkStats.bestCity.name} leads network performance with AQI ${networkStats.bestCity.aqi}` : "Performance data updating",
      networkStats.worstCity ? `${networkStats.worstCity.name} requires immediate environmental intervention` : "Monitoring active",
      `Overall network EcoScore of ${networkStats.avgEco}/100 reflects current sustainability posture`,
    ],
    actionItems: [
      "Pollution Control Board to investigate high-AQI cities and issue compliance notices",
      "Municipal bodies to increase complaint resolution capacity to improve the current resolution rate",
      "Emergency protocols to be reviewed for cities with active critical alerts",
    ],
    recommendations: [
      "Establish 48-hour complaint resolution SLA for high-severity environmental reports",
      "Deploy additional air quality monitoring infrastructure in highest-risk cities",
      "Convene inter-agency task force for cities with AQI consistently above 150",
    ],
    conclusion: `The ${reportType.toLowerCase()} report indicates ${networkStats.avgAqi > 150 ? "urgent action is required" : "continued monitoring is recommended"} across the monitored network. Authorities are advised to prioritise the identified high-risk areas and implement the recommended interventions within the specified timeframes.`,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — HELP CENTER AI INTELLIGENCE
// Reuses existing generate() / parseJSON() helpers and SYSTEM_* personas.
// All functions are additive — zero changes to existing functions above.
// ══════════════════════════════════════════════════════════════════════════════

const SYSTEM_HELP_ASSISTANT =
  "You are GreenGuard Help AI — a friendly, knowledgeable support assistant for the GreenGuard AI platform. " +
  "Answer questions about platform features, troubleshooting, and environmental monitoring clearly and concisely. " +
  "If a question is urgent or involves data loss, security, or environmental emergency, flag it. " +
  "Base answers on the GreenGuard platform context provided. Be helpful, accurate, and conversational.";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HelpAIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HelpAIResponse {
  answer: string;
  confidence: "high" | "medium" | "low";
  escalation: boolean;
  escalationReason?: string;
  suggestedQuestions: string[];
  sources: Array<{ type: "kb" | "tutorial" | "support"; title: string; id: string }>;
}

export interface ArticleRecommendation {
  type: "kb" | "tutorial";
  id: string;
  title: string;
  relevanceScore: number;
  reason: string;
}

export interface TicketDraft {
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  department: string;
  description: string;
  expectedResult: string;
  environment: string;
  stepsToReproduce: string;
  possibleCause: string;
}

export interface ArticleSummary {
  summary: string;
  keyTakeaways: string[];
  estimatedReadingTime: string;
  difficulty: string;
  prerequisites: string[];
}

export interface TextExplanation {
  explanation: string;
  simplified: string;
  expanded: string;
}

export interface TroubleshootingStep {
  question: string;
  options: string[];
}

export interface TroubleshootingResult {
  resolved: boolean;
  recommendation: string;
  action: "open_kb" | "open_tutorial" | "create_ticket" | "contact_support";
  articleId?: string;
}

// ─── 1. Help Assistant — conversational Q&A ───────────────────────────────────

export async function generateHelpAnswer(
  question: string,
  history: HelpAIMessage[],
  context: {
    kbTitles: string[];
    tutorialTitles: string[];
    userRole?: string;
  }
): Promise<HelpAIResponse> {
  const historyText = history.slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

  const prompt = `
PLATFORM: GreenGuard AI — environmental monitoring and compliance platform
USER ROLE: ${context.userRole ?? "citizen"}

AVAILABLE KNOWLEDGE BASE (titles only):
${context.kbTitles.slice(0, 15).join("\n")}

AVAILABLE TUTORIALS (titles only):
${context.tutorialTitles.slice(0, 10).join("\n")}

CONVERSATION HISTORY:
${historyText || "(New conversation)"}

USER QUESTION: ${question}

Instructions:
- Answer the question helpfully and concisely (2-4 sentences for simple questions, up to 8 for complex ones)
- Detect if the question indicates urgency/emergency/data loss/security issue
- Suggest 3 follow-up questions the user might have
- Reference up to 3 relevant KB articles or tutorials by their exact title from the lists above
- Set confidence based on how well GreenGuard context covers the question

Return ONLY valid JSON:
{
  "answer": "clear, helpful answer to the question",
  "confidence": "high|medium|low",
  "escalation": false,
  "escalationReason": null,
  "suggestedQuestions": ["question 1?", "question 2?", "question 3?"],
  "sources": [
    {"type": "kb", "id": "matching-article-id-if-known", "title": "exact title from the list above"}
  ]
}`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  const parsed = parseJSON<HelpAIResponse>(text, {
    answer: `I can help you with that. ${question.toLowerCase().includes("complaint") ? "For complaint-related issues, please check the Citizen Portal or submit a new complaint from the sidebar." : "Please check our Knowledge Base or contact our support team for further assistance."}`,
    confidence: "medium",
    escalation: false,
    suggestedQuestions: [
      "How do I submit a complaint?",
      "Where can I view my ticket status?",
      "How do I contact an authority directly?",
    ],
    sources: [],
  });

  // Escalation detection — override if keywords detected
  const q = question.toLowerCase();
  if (!parsed.escalation && (
    q.includes("emergency") || q.includes("urgent") || q.includes("data loss") ||
    q.includes("security") || q.includes("breach") || q.includes("hack") ||
    q.includes("critical") || q.includes("disaster")
  )) {
    parsed.escalation = true;
    parsed.escalationReason = "Question may involve urgency, security, or emergency conditions.";
  }

  return parsed;
}

// ─── 2. Article Recommendations while typing ──────────────────────────────────

export async function getArticleRecommendations(
  query: string,
  kbArticles: Array<{ id: string; title: string; tags: string[] }>,
  tutorials: Array<{ id: string; title: string; tags: string[] }>
): Promise<ArticleRecommendation[]> {
  if (!query.trim() || query.length < 3) return [];

  const kbList  = kbArticles.slice(0, 20).map(a => `KB:${a.id}|${a.title}|${a.tags.join(",")}`).join("\n");
  const tutList = tutorials.slice(0, 15).map(t => `TUT:${t.id}|${t.title}|${t.tags.join(",")}`).join("\n");

  const prompt = `
User is typing: "${query}"

KNOWLEDGE BASE ARTICLES:
${kbList}

TUTORIALS:
${tutList}

Find the 4 most relevant items based on semantic meaning, not just keywords.
Return ONLY a JSON array (max 4 items):
[{
  "type": "kb|tutorial",
  "id": "exact id from list",
  "title": "exact title from list",
  "relevanceScore": 0.0-1.0,
  "reason": "one sentence why this is relevant"
}]`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  const results = parseJSON<ArticleRecommendation[]>(text, []);
  return Array.isArray(results) ? results.slice(0, 4) : [];
}

// ─── 3. AI Ticket Draft Generator ────────────────────────────────────────────

export async function generateTicketDraft(userDescription: string): Promise<TicketDraft> {
  const prompt = `
A user typed this support request: "${userDescription}"

Generate a professional support ticket based on their description.
Infer all fields from context. Be specific and helpful.

Return ONLY valid JSON:
{
  "subject": "clear one-line summary (max 100 chars)",
  "category": "Technical Issue|Bug Report|Access Request|Data Issue|Account & Billing|Feature Request|Other",
  "priority": "low|medium|high|critical",
  "department": "Environmental Monitoring|Smart Maps|AI Copilot|Reports & Exports|Platform Administration|Authority Portal|Citizen Portal|Security & Access|Sensor Network|Other",
  "description": "professional description based on what the user said (2-3 sentences)",
  "expectedResult": "what the user expects the system to do",
  "environment": "Production",
  "stepsToReproduce": "steps to reproduce based on user description",
  "possibleCause": "likely root cause based on the description"
}`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  return parseJSON<TicketDraft>(text, {
    subject:           userDescription.slice(0, 100),
    category:          "Technical Issue",
    priority:          "medium",
    department:        "Other",
    description:       userDescription,
    expectedResult:    "The platform should function as described in the documentation.",
    environment:       "Production",
    stepsToReproduce:  "Please describe the steps to reproduce the issue.",
    possibleCause:     "Unknown — further investigation required.",
  });
}

// ─── 4. Duplicate Ticket Detection ───────────────────────────────────────────

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  message: string;
  existingCount: number;
}

export async function checkDuplicateTicket(
  newSubject: string,
  existingTickets: Array<{ subject: string; status: string; category: string }>
): Promise<DuplicateCheckResult> {
  if (!existingTickets.length) {
    return { isDuplicate: false, confidence: 0, message: "", existingCount: 0 };
  }

  const ticketList = existingTickets.slice(0, 10)
    .map((t, i) => `${i + 1}. [${t.status}] ${t.subject} (${t.category})`)
    .join("\n");

  const prompt = `
New ticket subject: "${newSubject}"

Existing tickets:
${ticketList}

Is the new ticket a semantic duplicate of any existing ticket?
Return ONLY valid JSON:
{
  "isDuplicate": true|false,
  "confidence": 0.0-1.0,
  "message": "brief message if duplicate (e.g. 'Similar issue already reported by other users') or empty string if not",
  "existingCount": number_of_similar_tickets
}`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  return parseJSON<DuplicateCheckResult>(text, {
    isDuplicate: false, confidence: 0, message: "", existingCount: 0,
  });
}

// ─── 5. AI Article Summary ────────────────────────────────────────────────────

export async function generateArticleSummary(
  title: string,
  content: string
): Promise<ArticleSummary> {
  const prompt = `
Summarize this GreenGuard Help Center article.

TITLE: ${title}
CONTENT: ${content.slice(0, 2000)}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence plain-language summary",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "estimatedReadingTime": "e.g. 3 min read",
  "difficulty": "Beginner|Intermediate|Advanced",
  "prerequisites": ["prerequisite 1 if any"]
}`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  return parseJSON<ArticleSummary>(text, {
    summary:             `This article covers ${title}.`,
    keyTakeaways:        ["Read the full article for details."],
    estimatedReadingTime: "3 min read",
    difficulty:          "Beginner",
    prerequisites:       [],
  });
}

// ─── 6. AI Explain Selection ──────────────────────────────────────────────────

export async function explainSelection(
  selectedText: string,
  mode: "explain" | "simplify" | "expand"
): Promise<string> {
  const instruction = {
    explain:  "Explain this term or concept clearly for a non-expert user in 2-3 sentences.",
    simplify: "Rewrite this in the simplest possible language (ELI5 style) in 1-2 sentences.",
    expand:   "Expand on this concept with more detail, context, and examples in 3-4 sentences.",
  }[mode];

  const prompt = `${instruction}\n\nTEXT: "${selectedText}"`;
  return generate(prompt, SYSTEM_HELP_ASSISTANT);
}

// ─── 7. Smart Search — semantic expansion ────────────────────────────────────

export async function expandSearchQuery(query: string): Promise<string[]> {
  const prompt = `
For the search query: "${query}"

Generate 6 semantically related alternative search terms that mean the same thing or are closely related.
Return ONLY a JSON array of strings: ["term1", "term2", "term3", "term4", "term5", "term6"]`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  const results = parseJSON<string[]>(text, []);
  return Array.isArray(results) ? results.slice(0, 6) : [];
}

// ─── 8. AI Insights for Support Dashboard ────────────────────────────────────

export interface HelpInsights {
  topQuestions: string[];
  trendingIssues: string[];
  aiGeneratedInsight: string;
}

export async function generateHelpInsights(
  recentQuestions: string[],
  ticketCategories: string[]
): Promise<HelpInsights> {
  const prompt = `
Based on recent support activity:

RECENT QUESTIONS:
${recentQuestions.slice(0, 10).join("\n")}

TICKET CATEGORIES (frequency):
${ticketCategories.slice(0, 8).join(", ")}

Generate support intelligence insights.
Return ONLY valid JSON:
{
  "topQuestions": ["common question 1", "common question 2", "common question 3"],
  "trendingIssues": ["trending issue 1", "trending issue 2"],
  "aiGeneratedInsight": "1-2 sentence insight about current support patterns and recommendations"
}`;

  const text = await generate(prompt, SYSTEM_HELP_ASSISTANT);
  return parseJSON<HelpInsights>(text, {
    topQuestions:      ["How do I submit a complaint?", "Why is AQI not updating?", "How do I reset my password?"],
    trendingIssues:    ["Dashboard loading issues", "Sensor data gaps"],
    aiGeneratedInsight: "Support volume is within normal range. Dashboard and sensor-related queries are the most common this period.",
  });
}
