// Automation 2 — Smart Routing + Automated Assignment + Lifecycle Backend.
//
// Centralized, controlled configuration for the Smart Routing Engine.
// Mirrors the pattern already established by constants/complaintIntelligence.ts
// for Automation 1: nothing outside this module should hardcode a routing
// confidence threshold, an "active workload" status list, or the routing
// engine version — read them from here.
//
// This module does NOT introduce a second department/category/severity
// definition. It reuses COMPLAINT_DEPARTMENTS / DEPARTMENT_LABELS from
// constants/complaintIntelligence.ts (the single shared department
// definition established by Automation 1).

import type { ComplaintStatus } from "../models/Complaint";
import { COMPLAINT_DEPARTMENTS, DEPARTMENT_LABELS, type ComplaintDepartment } from "./complaintIntelligence";

// ─── Routing engine version ─────────────────────────────────────────────────
// Analogous to OWN_ML_MODEL_VERSION — bump this when the routing/scoring
// logic changes, so persisted RoutingResult records remain auditable against
// the logic version that produced them.
export const SMART_ROUTING_ENGINE_VERSION = process.env.SMART_ROUTING_ENGINE_VERSION?.trim() || "1.0";

// ─── Confidence thresholds ───────────────────────────────────────────────────
// Own ML confidence is stored as a 0.0–1.0 fraction (see
// constants/complaintIntelligence.ts CONFIDENCE_MIN/MAX). These thresholds
// use the same scale — NOT a percentage.
//
//   confidence >= AUTO_ASSIGN_MIN   → high confidence   → automatic assignment
//   MONITORED_MIN <= confidence <   → moderate confidence → automatic assignment,
//     AUTO_ASSIGN_MIN                                       flagged as monitored
//   confidence < MONITORED_MIN     → low confidence    → no automatic assignment
function readConfidenceEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

export const SMART_ROUTING_AUTO_ASSIGN_MIN_CONFIDENCE = readConfidenceEnv(
  "SMART_ROUTING_AUTO_ASSIGN_MIN_CONFIDENCE",
  0.7,
);
export const SMART_ROUTING_MONITORED_MIN_CONFIDENCE = readConfidenceEnv(
  "SMART_ROUTING_MONITORED_MIN_CONFIDENCE",
  0.4,
);

export type RoutingConfidenceTier = "high" | "moderate" | "low";

export function getConfidenceTier(confidence: number): RoutingConfidenceTier {
  if (confidence >= SMART_ROUTING_AUTO_ASSIGN_MIN_CONFIDENCE) return "high";
  if (confidence >= SMART_ROUTING_MONITORED_MIN_CONFIDENCE) return "moderate";
  return "low";
}

// ─── Active workload statuses ────────────────────────────────────────────────
// Which existing Complaint.status values count as "active" work for an
// authority when calculating workload for routing. Inspected the real
// ComplaintStatus enum (models/Complaint.ts) — there is no separate
// "assigned" status in this project (assignment is tracked via the
// `assignedTo` field, independent of `status`), so "pending" already covers
// an assigned-but-not-yet-started complaint. "rework" is included because it
// represents live, unfinished work sent back to the same authority. This is
// the single definition — do not re-derive elsewhere.
export const ROUTING_ACTIVE_WORKLOAD_STATUSES: ComplaintStatus[] = ["pending", "in-progress", "rework"];

// ─── Assignment source ───────────────────────────────────────────────────────
export type AssignmentSource = "automatic" | "manual";

// ─── Routing result status ───────────────────────────────────────────────────
export type RoutingStatus = "assigned" | "pending" | "failed";

// ─── Department compatibility (minimal Automation 2 change) ─────────────────
// User.department (Phase 4 — Authority Enterprise Fields) is a free-text
// profile field with no existing controlled enum — there is nowhere in the
// current authority registration/admin-edit flow that constrains it to
// COMPLAINT_DEPARTMENTS. Redesigning authority registration/admin UI is
// explicitly out of scope for Automation 2. Per the blueprint's "minimum
// necessary compatible change" instruction, this normalizer is the
// compatibility layer: it accepts either the exact department slug
// ("pollution_control") or its human-readable label ("Pollution Control")
// and resolves it to a controlled ComplaintDepartment, without altering the
// User schema or the authority admin UI.
export function normalizeAuthorityDepartment(raw?: string | null): ComplaintDepartment | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const slugified = trimmed.toLowerCase().replace(/[\s\-/]+/g, "_");
  if ((COMPLAINT_DEPARTMENTS as readonly string[]).includes(slugified)) {
    return slugified as ComplaintDepartment;
  }

  const lowered = trimmed.toLowerCase();
  const byLabel = (Object.entries(DEPARTMENT_LABELS) as [ComplaintDepartment, string][]).find(
    ([, label]) => label.toLowerCase() === lowered,
  );
  return byLabel ? byLabel[0] : null;
}
