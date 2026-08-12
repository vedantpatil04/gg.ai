// Automation 1 — Own ML Complaint Intelligence Foundation.
//
// This module owns the *implementation* behind the Own ML prediction. There
// is no trained model or training pipeline anywhere in this repository, so
// `OwnMLProviderV1` is a controlled, deterministic classification strategy
// (keyword/signal based) rather than a fabricated "AI" response. It is
// entirely isolated behind the `OwnMLProvider` interface (see
// complaintIntelligence.types.ts) so that a future trained model can be
// dropped in as `OwnMLProviderV2` without any change to
// ComplaintIntelligenceService or the rest of the complaint architecture —
// only `getOwnMLProvider()` below needs to point at the new implementation.
//
//   ComplaintIntelligenceService
//           |
//           v
//     OwnMLProvider  (interface)
//           |
//           v
//     OwnMLProviderV1  (this file, today)  ──▶  OwnMLProviderV2 (future, trained model)
//
// This is NOT the existing AI Complaint Assistant (Gemini-backed, see
// services/gemini.service.ts) and does not call Gemini or any LLM. Gemini is
// not, and must not be presented as, an ML model owned by GreenGuard.

import { OWN_ML_MODEL_VERSION, CATEGORY_DEPARTMENT_MAP, clampConfidence } from "../constants/complaintIntelligence";
import type { ComplaintCategory, ComplaintSeverity } from "../constants/complaintIntelligence";
import type { ComplaintMLInput, ComplaintMLPredictionResult, OwnMLProvider } from "./complaintIntelligence.types";

// ─── Category keyword signals ──────────────────────────────────────────────
// Deliberately simple, transparent, and reviewable — every match is reported
// back as a prediction reason. No fabricated environmental facts, no
// invented accuracy claims; this is a stand-in classification strategy for
// the foundation phase, clearly labelled as v1.0.
const CATEGORY_KEYWORDS: Record<ComplaintCategory, string[]> = {
  air_pollution: ["smoke", "smog", "fumes", "exhaust", "emission", "air quality", "dust", "chimney", "particulate"],
  water_contamination: ["water", "contaminat", "sewage", "effluent", "discharge", "river", "lake", "pond", "drain", "drinking water", "groundwater"],
  open_burning: ["burning", "burnt", "bonfire", "stubble burning", "garbage burning", "open fire"],
  noise: ["noise", "loud", "honking", "decibel", "blaring", "generator noise", "construction noise"],
  waste_dumping: ["dump", "dumping", "garbage", "trash", "litter", "landfill", "debris pile"],
  chemical_spill: ["chemical", "spill", "toxic", "hazardous material", "acid", "industrial waste", "leak"],
  other: [],
};

// ─── Severity keyword signals ──────────────────────────────────────────────
const CRITICAL_KEYWORDS = ["explosion", "fire", "toxic", "casualt", "death", "collapse", "life-threatening", "hospitaliz", "emergency"];
const HIGH_KEYWORDS = ["severe", "widespread", "hazardous", "large-scale", "health risk", "illegal dumping", "spill"];
const LOW_KEYWORDS = ["minor", "small", "slight"];

function normalize(text: string): string {
  return text.toLowerCase();
}

function scoreCategoryFromText(text: string): { category: ComplaintCategory | null; matched: string[] } {
  let best: ComplaintCategory | null = null;
  let bestCount = 0;
  let bestMatches: string[] = [];

  for (const category of Object.keys(CATEGORY_KEYWORDS) as ComplaintCategory[]) {
    const keywords = CATEGORY_KEYWORDS[category];
    const matches = keywords.filter((kw) => text.includes(kw));
    if (matches.length > bestCount) {
      best = category;
      bestCount = matches.length;
      bestMatches = matches;
    }
  }

  return { category: bestCount > 0 ? best : null, matched: bestMatches };
}

function scoreSeverityFromText(text: string): { severity: ComplaintSeverity | null; matched: string[] } {
  const criticalMatches = CRITICAL_KEYWORDS.filter((kw) => text.includes(kw));
  if (criticalMatches.length > 0) return { severity: "critical", matched: criticalMatches };

  const highMatches = HIGH_KEYWORDS.filter((kw) => text.includes(kw));
  if (highMatches.length > 0) return { severity: "high", matched: highMatches };

  const lowMatches = LOW_KEYWORDS.filter((kw) => text.includes(kw));
  if (lowMatches.length > 0) return { severity: "low", matched: lowMatches };

  return { severity: null, matched: [] };
}

const SEVERITY_RANK: Record<ComplaintSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function higherSeverity(a: ComplaintSeverity, b: ComplaintSeverity): ComplaintSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

// ─── v1.0 provider ──────────────────────────────────────────────────────────
class OwnMLProviderV1 implements OwnMLProvider {
  readonly modelVersion = OWN_ML_MODEL_VERSION;

  async predict(input: ComplaintMLInput): Promise<ComplaintMLPredictionResult> {
    const text = normalize(`${input.title} ${input.description}`);
    const reasons: string[] = [];
    let confidence = 0.5;

    // ── Category ────────────────────────────────────────────────────────────
    const keywordCategory = scoreCategoryFromText(text);
    let category: ComplaintCategory;

    if (keywordCategory.category && keywordCategory.category === input.declaredCategory) {
      category = keywordCategory.category;
      confidence += 0.25;
      reasons.push(
        `Description text matched "${category}" keywords (${keywordCategory.matched.slice(0, 3).join(", ")}), corroborating the declared category`,
      );
    } else if (keywordCategory.category) {
      // Keyword signal disagrees with (or adds to) the declared category —
      // Own ML remains authoritative, so the independently-derived category wins,
      // but the disagreement is recorded for future model evaluation.
      category = keywordCategory.category;
      confidence += 0.1;
      reasons.push(
        `Description text matched "${category}" keywords (${keywordCategory.matched.slice(0, 3).join(", ")})`,
      );
      if (input.declaredCategory && input.declaredCategory !== category) {
        reasons.push(`Independent text signal differs from declared category "${input.declaredCategory}"`);
      }
    } else if (input.declaredCategory) {
      category = input.declaredCategory;
      confidence -= 0.05;
      reasons.push("No strong keyword signal found in text — falling back to declared category");
    } else {
      category = "other";
      confidence -= 0.1;
      reasons.push("No keyword signal and no declared category — defaulted to \"other\"");
    }

    // ── Department ──────────────────────────────────────────────────────────
    const department = CATEGORY_DEPARTMENT_MAP[category];
    reasons.push(`Category "${category}" maps to department "${department}"`);

    // ── Severity ─────────────────────────────────────────────────────────────
    const keywordSeverity = scoreSeverityFromText(text);
    let severity: ComplaintSeverity = keywordSeverity.severity ?? "medium";
    if (keywordSeverity.severity) {
      confidence += 0.1;
      reasons.push(
        `Text contains ${keywordSeverity.severity}-severity indicators (${keywordSeverity.matched.slice(0, 3).join(", ")})`,
      );
    } else {
      reasons.push("No explicit severity indicators found in text — defaulted to medium");
    }

    if (input.citizenSeveritySignal) {
      // Citizen-selected signal is an input, never authoritative — it can
      // only raise the predicted severity, and only when the text itself
      // gave no stronger signal, matching the blueprint's requirement that
      // the citizen signal be a supporting ML input rather than the source
      // of truth.
      severity = higherSeverity(severity, input.citizenSeveritySignal);
      reasons.push(`Citizen-provided priority signal ("${input.citizenSeveritySignal}") considered as supporting input`);
    }

    // ── Supporting signals ─────────────────────────────────────────────────
    if (input.location.latitude !== undefined && input.location.longitude !== undefined) {
      confidence += 0.05;
      reasons.push("Location coordinates present, supporting geospatial classification");
    }
    if (input.evidence.count > 0) {
      confidence += 0.05;
      reasons.push(`${input.evidence.count} evidence item(s) attached, supporting classification confidence`);
    }

    return {
      category,
      department,
      severity,
      confidence: clampConfidence(confidence),
      reasons,
      modelVersion: this.modelVersion,
      predictionTime: new Date(),
    };
  }
}

// Singleton — cheap to construct, but a single shared instance keeps the
// provider stateless and avoids re-allocating the keyword tables per call.
const ownMLProviderV1 = new OwnMLProviderV1();

/**
 * Returns the currently active Own ML provider. This is the single place
 * that decides which model version is live — upgrading to a trained model
 * means adding `OwnMLProviderV2` above and changing the return value here,
 * nothing else in the codebase needs to change.
 */
export function getOwnMLProvider(): OwnMLProvider {
  return ownMLProviderV1;
}
