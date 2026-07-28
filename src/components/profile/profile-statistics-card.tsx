/**
 * ProfileStatisticsCard — Phase 10 redesign.
 *
 * Statistics are now rendered directly inside ProfileOverview as
 * full-width metric cards (MetricCard). This file re-exports a lightweight
 * shim so any existing import of ProfileStatisticsCard continues to
 * compile without errors.
 */
export function ProfileStatisticsCard() {
  // No-op: statistics are now rendered inline in ProfileOverview.
  // Kept so existing imports don't break.
  return null;
}
