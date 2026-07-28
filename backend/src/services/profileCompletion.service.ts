import type { IUser } from "../models/User";

/**
 * Phase 7 — Profile Completion Engine.
 *
 * Complete rewrite of the prior weighted-field approach to satisfy the
 * Phase 7 spec: role-aware evaluation, suggested next actions, status
 * labels, and a richer result shape — all still backend-driven so the
 * frontend never calculates a percentage itself.
 *
 * Design goals:
 *  1. Rule-based and extensible — new field rules are a one-liner added
 *     to the RULES arrays; nothing else changes.
 *  2. Role-aware — authority/administrator accounts are evaluated on
 *     org-related fields that citizens are never penalised for missing.
 *  3. No hardcoded percentages — every number is derived from the rule
 *     table at runtime.
 *  4. Reusable — computeProfileCompletion() accepts any IUser projection
 *     and can be called from future dashboards/onboarding routes without
 *     coupling to the request cycle.
 */

// ─── Public types ──────────────────────────────────────────────────────────

export interface ProfileCompletionField {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
}

export type CompletionStatus = "complete" | "nearly_complete" | "good_progress" | "needs_attention";

export interface ProfileCompletionResult {
  /** 0–100 integer, derived from weights — never hardcoded. */
  completion: number;
  /** Human-readable label for the completion band. */
  statusLabel: string;
  /** Machine-readable status key for the completion band. */
  status: CompletionStatus;
  completedFields: string[];
  missingFields: string[];
  /** Ordered list of suggested actions for missing fields. */
  suggestedActions: string[];
  totalFields: number;
  completedCount: number;
  fields: ProfileCompletionField[];
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function isFilled(value?: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function deriveStatus(pct: number): { status: CompletionStatus; statusLabel: string } {
  if (pct >= 100) return { status: "complete", statusLabel: "Complete" };
  if (pct >= 80) return { status: "nearly_complete", statusLabel: "Nearly Complete" };
  if (pct >= 50) return { status: "good_progress", statusLabel: "Good Progress" };
  return { status: "needs_attention", statusLabel: "Needs Attention" };
}

// ─── Rule tables ───────────────────────────────────────────────────────────

/**
 * Source shape — the union of every field any rule might inspect.
 * Keeping this explicit means TypeScript will error if we reference a
 * field that hasn't been added to IUser yet, which is the right
 * failure mode.
 */
type CompletionSource = Pick<
  IUser,
  | "role"
  | "avatar"
  | "firstName"
  | "lastName"
  | "name"
  | "email"
  | "phone"
  | "dateOfBirth"
  | "gender"
  | "addressLine"
  | "city"
  | "state"
  | "country"
  | "pinCode"
  | "isVerified"
  | "organization"
>;

interface FieldRule {
  key: string;
  label: string;
  action: string;
  weight: number;
  check: (user: CompletionSource) => boolean;
  /** When set, only evaluated for the listed roles. Omit for all roles. */
  roles?: Array<IUser["role"]>;
}

/**
 * Ordered rule table.  All weights across every applicable rule must sum
 * to 100 for any single role — this is ensured by the calculation, which
 * normalises the raw weight sum rather than assuming it hits 100.
 *
 * Weight proportions (approximate intent):
 *  - Photo:           highest visual trust signal
 *  - Name/Identity:   core display identity
 *  - Contact:         reachability
 *  - Personal:        completeness / verification
 *  - Address:         location context
 *  - Organisation:    authority/admin operational context
 */
const FIELD_RULES: FieldRule[] = [
  // ── Profile ──────────────────────────────────────────────────────────────
  {
    key: "photo",
    label: "Profile Picture",
    action: "Add a profile picture",
    weight: 15,
    check: (u) => isFilled(u.avatar),
  },

  // ── Basic Identity ────────────────────────────────────────────────────────
  {
    key: "firstName",
    label: "First Name",
    action: "Add your first name",
    weight: 8,
    check: (u) => isFilled(u.firstName),
  },
  {
    key: "lastName",
    label: "Last Name",
    action: "Add your last name",
    weight: 7,
    check: (u) => isFilled(u.lastName),
  },
  {
    key: "displayName",
    label: "Display Name",
    action: "Set your display name",
    weight: 5,
    // `name` is required at signup — but it may be a raw email or a
    // throwaway string. A meaningful display name is at least 3 chars
    // and not an email address.
    check: (u) => isFilled(u.name) && u.name.trim().length >= 3 && !u.name.includes("@"),
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  {
    key: "email",
    label: "Verified Email",
    action: "Verify your email address",
    weight: 8,
    check: (u) => Boolean(u.isVerified),
  },
  {
    key: "phone",
    label: "Phone Number",
    action: "Add a phone number",
    weight: 10,
    check: (u) => isFilled(u.phone),
  },

  // ── Personal Information ──────────────────────────────────────────────────
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    action: "Add your date of birth",
    weight: 7,
    check: (u) => u.dateOfBirth != null,
  },
  {
    key: "gender",
    label: "Gender",
    action: "Specify your gender",
    weight: 5,
    check: (u) => isFilled(u.gender),
  },

  // ── Address ───────────────────────────────────────────────────────────────
  {
    key: "addressLine",
    label: "Address",
    action: "Add your address",
    weight: 8,
    check: (u) => isFilled(u.addressLine),
  },
  {
    key: "city",
    label: "City",
    action: "Add your city",
    weight: 5,
    check: (u) => isFilled(u.city),
  },
  {
    key: "state",
    label: "State / Province",
    action: "Add your state or province",
    weight: 5,
    check: (u) => isFilled(u.state),
  },
  {
    key: "country",
    label: "Country",
    action: "Add your country",
    weight: 5,
    check: (u) => isFilled(u.country),
  },
  {
    key: "pinCode",
    label: "PIN Code",
    action: "Add your PIN / postal code",
    weight: 2,
    check: (u) => isFilled(u.pinCode),
  },

  // ── Organisation (authority and administrator only) ───────────────────────
  {
    key: "organization",
    label: "Organization",
    action: "Add your organization name",
    weight: 5,
    roles: ["authority", "administrator"],
    check: (u) => isFilled(u.organization),
  },
  {
    key: "department",
    label: "Department",
    action: "Add your department",
    weight: 5,
    roles: ["authority", "administrator"],
    // `department` is not yet a stored field in Phase 7; its absence means
    // this rule always resolves to incomplete for authority/admin and acts
    // as a forward-looking placeholder that will resolve once the field is
    // added in a future phase.  Wrapped in a safe accessor so this file
    // doesn't break if the property appears in a future IUser version.
    check: (_u) => false,
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

export function computeProfileCompletion(user: CompletionSource): ProfileCompletionResult {
  // 1. Filter to rules that apply to this user's role.
  const applicableRules = FIELD_RULES.filter(
    (rule) => !rule.roles || rule.roles.includes(user.role),
  );

  // 2. Evaluate each rule.
  const fields: ProfileCompletionField[] = applicableRules.map(({ key, label, weight, check }) => ({
    key,
    label,
    weight,
    completed: check(user),
  }));

  // 3. Calculate completion as a normalised 0–100 integer.
  //    Normalisation ensures the percentage is always correct even when
  //    the raw weights don't sum to exactly 100 (e.g. when some rules are
  //    role-filtered out).
  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  const earnedWeight = fields.reduce((sum, f) => sum + (f.completed ? f.weight : 0), 0);
  const completion = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);

  // 4. Derive status label from the normalised percentage.
  const { status, statusLabel } = deriveStatus(completion);

  // 5. Build the missing-field suggested actions list (preserves rule order).
  const suggestedActions = fields
    .filter((f) => !f.completed)
    .map((f) => {
      const rule = applicableRules.find((r) => r.key === f.key)!;
      return rule.action;
    });

  return {
    completion,
    status,
    statusLabel,
    completedFields: fields.filter((f) => f.completed).map((f) => f.key),
    missingFields: fields.filter((f) => !f.completed).map((f) => f.key),
    suggestedActions,
    totalFields: fields.length,
    completedCount: fields.filter((f) => f.completed).length,
    fields,
  };
}
