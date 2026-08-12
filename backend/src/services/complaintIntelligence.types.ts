// Automation 1 — Own ML Complaint Intelligence Foundation.
//
// Dedicated ML input/output contracts. These are intentionally independent
// from the Mongoose `IComplaint` document shape — the Own ML layer must stay
// replaceable (v1.0 heuristic provider today, a trained model tomorrow)
// without the rest of GreenGuard's complaint architecture having to change.
// Only `buildComplaintMLInput` (in complaintIntelligence.service.ts) knows
// how to translate a Complaint document into this contract.

import type { ComplaintCategory, ComplaintDepartment, ComplaintSeverity } from "../constants/complaintIntelligence";

// ─── ML Input Contract ─────────────────────────────────────────────────────
export interface ComplaintMLLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
}

export interface ComplaintMLEvidenceMeta {
  count: number;
}

export interface ComplaintMLInput {
  complaintId: string;
  title: string;
  description: string;
  /** Existing category info already known to the system, if any (e.g. citizen-selected issue type). */
  declaredCategory?: ComplaintCategory;
  /** Citizen-selected priority, if already supported — treated as an input signal only, never authoritative. */
  citizenSeveritySignal?: ComplaintSeverity;
  location: ComplaintMLLocation;
  evidence: ComplaintMLEvidenceMeta;
}

// ─── ML Output Contract ────────────────────────────────────────────────────
export interface ComplaintMLPredictionResult {
  category: ComplaintCategory;
  department: ComplaintDepartment;
  severity: ComplaintSeverity;
  /** Normalized 0.0–1.0 confidence — never a percentage or a qualitative label. */
  confidence: number;
  /** Explainability signals used to arrive at this prediction. */
  reasons: string[];
  modelVersion: string;
  predictionTime: Date;
}

// ─── Provider abstraction ──────────────────────────────────────────────────
// Every Own ML implementation (the current v1.0 heuristic strategy, and any
// future trained model) implements this interface. ComplaintIntelligenceService
// only ever talks to this interface — swapping the implementation behind
// `getOwnMLProvider()` is the entire upgrade path.
export interface OwnMLProvider {
  readonly modelVersion: string;
  predict(input: ComplaintMLInput): Promise<ComplaintMLPredictionResult>;
}
