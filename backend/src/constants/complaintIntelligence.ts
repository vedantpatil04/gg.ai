// Automation 1 — Own ML Complaint Intelligence Foundation.
//
// Centralized, controlled definitions for the Own ML complaint-intelligence
// layer. These constants exist so category/department/severity/model-version
// values are defined exactly once and reused everywhere (service, model,
// controller) instead of being scattered as inline strings.
//
// Category deliberately reuses the existing `IssueType` union already
// defined on the Complaint model (see models/Complaint.ts) rather than
// introducing a parallel category system — the existing complaint domain is
// the source of truth for "what an environmental complaint can be about".
//
// Department has no existing controlled definition anywhere in the project
// (User.department is a free-text profile field, unrelated to complaint
// routing). This module introduces the one shared department definition
// that this phase's ML output — and the future Automation 2 smart-routing
// and Automation 4 authority board — can rely on.

import type { IssueType, ComplaintPriority } from "../models/Complaint";

// ─── Category ──────────────────────────────────────────────────────────────
// Re-exported under an ML-facing name for readability at call sites, but it
// is the exact same type as Complaint.issueType — no duplication.
export type ComplaintCategory = IssueType;

// ─── Department ────────────────────────────────────────────────────────────
export const COMPLAINT_DEPARTMENTS = [
  "environmental_protection",
  "pollution_control",
  "waste_management",
  "water_management",
  "disaster_emergency",
  "forest_ecology",
  "public_health_environment",
  "noise_compliance",
  "other",
] as const;

export type ComplaintDepartment = (typeof COMPLAINT_DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<ComplaintDepartment, string> = {
  environmental_protection: "Environmental Protection",
  pollution_control: "Pollution Control",
  waste_management: "Waste Management",
  water_management: "Water Management",
  disaster_emergency: "Disaster / Emergency",
  forest_ecology: "Forest / Ecology",
  public_health_environment: "Public Health / Environment",
  noise_compliance: "Noise / Compliance",
  other: "Other",
};

// Default category → department routing used by the v1.0 Own ML provider.
// This is the "one controlled shared department definition" required by the
// blueprint — future automations (Smart Routing, Authority Board) should
// read from `COMPLAINT_DEPARTMENTS` / `CATEGORY_DEPARTMENT_MAP` rather than
// re-deriving department strings of their own.
export const CATEGORY_DEPARTMENT_MAP: Record<ComplaintCategory, ComplaintDepartment> = {
  air_pollution: "pollution_control",
  water_contamination: "water_management",
  open_burning: "environmental_protection",
  noise: "noise_compliance",
  waste_dumping: "waste_management",
  chemical_spill: "disaster_emergency",
  other: "other",
};

// ─── Severity ──────────────────────────────────────────────────────────────
// Reuses the existing ComplaintPriority union (low/medium/high/critical) —
// the Own ML severity prediction and the legacy citizen-selected priority
// share the same value space, but ML severity is the authoritative one.
export type ComplaintSeverity = ComplaintPriority;

export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = ["low", "medium", "high", "critical"];

// ─── Model versioning ──────────────────────────────────────────────────────
// The active Own ML model version. Read from configuration/env when present
// so the version can be bumped without a code change; falls back to the
// initial foundation version. Nothing else in the codebase should hardcode
// a model version string — read it from here.
export const OWN_ML_MODEL_VERSION = process.env.OWN_ML_MODEL_VERSION?.trim() || "1.0";

// ─── Confidence ────────────────────────────────────────────────────────────
// Normalized confidence bounds — always store 0.0–1.0, never a percentage
// string or a qualitative label. UI layers convert to a percentage.
export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 1;

export function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return CONFIDENCE_MIN;
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, value));
}
