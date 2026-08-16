import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api/client";

/**
 * `AuthUser` now carries every real field the backend returns (Phase 3
 * added firstName/lastName/dateOfBirth/gender/addressLine/state/country/
 * pinCode for real). The one field here that still isn't a stored column
 * is `username` — rather than adding a whole separate identity/uniqueness
 * system for a field this phase marks read-only, it's derived from the
 * account's real email (the part before "@"), which is honest (a
 * deterministic function of real data) without inventing a new schema
 * concept. See `getUsername` below.
 */
export type EnterpriseProfile = AuthUser & {
  username?: string;
};

/** True for any real, non-empty display value. Used everywhere a field is
 *  "shown only if available" — centralizing this keeps every empty state
 *  consistent instead of each card inventing its own blank/"N/A" check. */
export function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Derives a read-only "username" from the account's email local-part
 *  ("j.doe@city.gov" -> "j.doe"). Real, deterministic, never fabricated —
 *  just not a separately-stored field (see EnterpriseProfile above). */
export function getUsername(email: string): string {
  return email.split("@")[0] ?? email;
}

/**
 * The backend stores `avatar` as an app-relative path ("/uploads/avatars/
 * xyz.jpg") rather than baking in its own origin — this resolves it to a
 * renderable URL against the API's current origin. Already-absolute values
 * (an "http(s)://..." URL, e.g. from a future Cloudinary/S3 provider) pass
 * through untouched, so this keeps working across a storage migration
 * without any change here.
 */
export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

/** Up-to-two-letter initials for the avatar fallback, used whenever the
 *  account has no photo on file. */
export function getInitials(name: string): string {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return (initials || "?").slice(0, 2).toUpperCase();
}

/** "administrator" -> "Administrator" */
export function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** "pending" -> "Pending". Real field (`approvalStatus`), meaningful mainly
 *  for Authority accounts (Citizen/Administrator are always "approved") —
 *  see the AuthUser type comment. Governance value only; never editable by
 *  the account itself. */
export function formatApprovalStatus(status?: string | null): string | null {
  if (!status) return null;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Pill color tone matched to role, mirroring the convention already used
 *  for role badges elsewhere in the app. */
export function roleTone(role: AuthUser["role"]): "destructive" | "primary" | "success" {
  if (role === "administrator") return "destructive";
  if (role === "authority") return "primary";
  return "success";
}

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

/** "prefer_not_to_say" -> "Prefer not to say" */
export function formatGender(gender?: string | null): string | null {
  if (!gender) return null;
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? null;
}

/** "12 Jul 2025" — used for date-only fields like Member Since. */
export function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "12 Jul 2025, 6:42 pm" — used for timestamp fields like Last Login. */
export function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Counts from 0 → `to` over `duration` ms using requestAnimationFrame with
 * an ease-out curve. Shared by the Hero's quick-stats strip and the
 * Overview tab's KPI cards so the count-up animation logic lives in one
 * place instead of being duplicated per component (both consume the same
 * `["profile","statistics"]` data, just at different visual scales).
 */
export function useCountUp(to: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (to === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setValue(Math.round(eased * to));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [to, duration]);

  return value;
}

/**
 * Maps a statistics `key` (e.g. "complaintsAssigned", "reportsGenerated")
 * to a semantic icon name understood by the caller's own icon table, via
 * simple keyword matching. Kept here (rather than hardcoding a per-key
 * table in each consumer) so a new backend stat key picks a sensible icon
 * automatically instead of silently falling back to a generic one.
 */
export function guessStatIconKind(
  key: string,
):
  | "submitted"
  | "resolved"
  | "pending"
  | "reports"
  | "managed"
  | "cities"
  | "approvals"
  | "total"
  | "default" {
  const k = key.toLowerCase();
  if (k.includes("submit")) return "submitted";
  if (k.includes("resolved")) return "resolved";
  if (k.includes("pending") || k.includes("approval")) return "pending";
  if (k.includes("report")) return "reports";
  if (k.includes("managed") && k.includes("author")) return "managed";
  if (k.includes("cit")) return "cities";
  if (k.includes("total")) return "total";
  return "default";
}
