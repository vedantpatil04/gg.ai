import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { environmentalApi } from "@/lib/api/environmental.api";

export { useSystemHealth, useAdminStats } from "@/components/admin/admin-dashboard-queries";

export interface CityReadingFreshness {
  cityId: string;
  cityName: string;
  timestamp: string;
}

/**
 * Reuses the exact same endpoint (and, deliberately, the exact same query
 * key) as Phase 2.6's City Directory (city-directory-queries.ts
 * "admin-city-directory-env") — an administrator who's visited both pages
 * shares one cached fetch instead of two. Used here only to derive pipeline
 * freshness and a short "recent updates" list, not the full merged
 * directory shape that page needs.
 */
export function useEnvironmentalReadings() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-city-directory-env"],
    queryFn: () =>
      environmentalApi.getCities().then((r) => r.data as { cities: CityReadingFreshness[] }),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export type OverallPlatformStatus = "healthy" | "degraded" | "offline";

/**
 * Deliberately narrow: only backend reachability and database connectivity
 * affect the overall verdict. Scheduler being disabled or AI being
 * unconfigured are NOT counted as "degraded" — the scheduler module itself
 * treats "no ingestion API key" as a normal, supported fallback mode
 * ("Platform uses seeded data", backend/src/jobs/scheduler.ts), so this
 * page doesn't contradict that by flagging it as a platform problem. Those
 * two still show their real state on their own cards — they just don't
 * drag the headline status down.
 */
export function deriveOverallStatus(
  healthIsError: boolean,
  databaseConnected: boolean | undefined,
): OverallPlatformStatus {
  if (healthIsError || databaseConnected === undefined) return "offline";
  if (!databaseConnected) return "degraded";
  return "healthy";
}
