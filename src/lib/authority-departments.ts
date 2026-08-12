/**
 * Canonical Authority Department definitions used by the Authority
 * Registration form (Organization/Board vs Department — see signup.tsx).
 *
 * Department is the structured classification Own ML and Smart Routing
 * (Automation 1 / Automation 2) match against. This mirrors the single
 * source of truth defined in
 * backend/src/constants/complaintIntelligence.ts (COMPLAINT_DEPARTMENTS /
 * DEPARTMENT_LABELS) — the frontend and backend are separate build units
 * with no shared package, so this list is kept in sync by hand, following
 * the same established pattern as
 * src/components/admin/complaint-governance/issue-type.ts. Do NOT invent a
 * different department naming system here — if the backend list changes,
 * update this file to match.
 *
 * This is display/selection only. The backend independently validates and
 * normalizes whatever value is submitted (see
 * backend/src/validators/auth.validator.ts and
 * backend/src/constants/smartRouting.ts normalizeAuthorityDepartment) — the
 * client is never trusted to enforce this on its own.
 */
export const AUTHORITY_DEPARTMENTS = [
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

export type AuthorityDepartment = (typeof AUTHORITY_DEPARTMENTS)[number];

export const AUTHORITY_DEPARTMENT_LABELS: Record<AuthorityDepartment, string> = {
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
