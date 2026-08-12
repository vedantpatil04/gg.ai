/**
 * Data freshness classification — Phase 1 Dashboard Foundation.
 *
 * Single source of truth for "is this reading current, delayed, or
 * unavailable" so Current Conditions and Data Status never disagree with
 * each other. Deliberately conservative: if we're not connected to the
 * live API, or the reading has no timestamp at all, we say so rather than
 * presenting stale/mock data as if it were live.
 */

export type DataFreshness = "current" | "delayed" | "unavailable";

/** Readings within this many minutes are considered current/live. */
const CURRENT_THRESHOLD_MIN = 10;
/** Readings older than this are unavailable rather than merely "delayed". */
const STALE_THRESHOLD_MIN = 60;

export function computeDataFreshness(
  updatedAt: string | undefined,
  isApiConnected: boolean,
): DataFreshness {
  if (!isApiConnected || !updatedAt) return "unavailable";

  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (Number.isNaN(ageMs) || ageMs < 0) return "unavailable";

  const ageMin = ageMs / 60_000;
  if (ageMin <= CURRENT_THRESHOLD_MIN) return "current";
  if (ageMin <= STALE_THRESHOLD_MIN) return "delayed";
  return "unavailable";
}

export function freshnessLabel(f: DataFreshness): string {
  if (f === "current") return "Current";
  if (f === "delayed") return "Delayed";
  return "Unavailable";
}

export function freshnessColor(f: DataFreshness): string {
  if (f === "current") return "var(--color-success)";
  if (f === "delayed") return "var(--color-warning)";
  return "var(--color-muted-foreground)";
}
