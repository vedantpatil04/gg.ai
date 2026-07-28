import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { adminCityApi, environmentalApi } from "@/lib/api/environmental.api";
import { alertApi, complaintApi } from "@/lib/api/services.api";

export interface CityReading {
  cityId: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  water: number;
  temp: number;
  humidity: number;
  windSpeed?: number;
  risk: number;
  eco: number;
  carbon: number;
  timestamp: string;
}

export interface DirectoryCityBase {
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DirectoryCity extends DirectoryCityBase {
  /** undefined when this city has never received an ingested reading. */
  reading?: CityReading;
}

export type MonitoringStatus = "online" | "warning" | "offline";

/**
 * Derived, not backend-tracked — there is no "monitoring status" field
 * anywhere in the data model. This is a heuristic off reading recency: the
 * ingestion scheduler (backend/src/jobs/scheduler.ts) runs every 30
 * minutes, so "online" allows a couple of missed cycles before dropping to
 * "warning", and "offline" covers anything stale for a full day or with no
 * reading at all.
 */
export function getMonitoringStatus(reading?: CityReading): MonitoringStatus {
  if (!reading) return "offline";
  const ageMs = Date.now() - new Date(reading.timestamp).getTime();
  const hour = 60 * 60 * 1000;
  if (ageMs <= 1.5 * hour) return "online";
  if (ageMs <= 24 * hour) return "warning";
  return "offline";
}

/**
 * Merges two existing, independent endpoints client-side:
 *  - /admin/cities — the definitive list of monitored cities (unpaginated,
 *    includes cities with no data yet)
 *  - /environmental/cities — latest reading per city that HAS data
 * There's no single existing endpoint that returns both together, and
 * adding one wasn't justified for a read-only directory — this merge is
 * the "reuse existing APIs" version of that join.
 */
export function useCityDirectory() {
  const { isApiConnected } = useCity();

  const citiesQuery = useQuery({
    queryKey: ["admin-city-directory-cities"],
    queryFn: () =>
      adminCityApi
        .listCities()
        .then((r) => r.data as { cities: DirectoryCityBase[]; total: number }),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const envQuery = useQuery({
    queryKey: ["admin-city-directory-env"],
    queryFn: () => environmentalApi.getCities().then((r) => r.data as { cities: CityReading[] }),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const readingsByCity = new Map<string, CityReading>();
  for (const r of envQuery.data?.cities ?? []) {
    readingsByCity.set(r.cityId, r);
  }

  const cities: DirectoryCity[] | undefined = citiesQuery.data?.cities.map((c) => ({
    ...c,
    reading: readingsByCity.get(c.cityId),
  }));

  return {
    cities,
    // The city list is the source of truth for "which cities exist"; a
    // failed environmental fetch just means readings are missing, not that
    // the whole directory is broken, so only the cities query gates isError.
    isLoading: citiesQuery.isLoading || envQuery.isLoading,
    isError: citiesQuery.isError,
    refetch: () => {
      citiesQuery.refetch();
      envQuery.refetch();
    },
  };
}

/** Real per-city alert count — only ever called for the one open city, so
 *  (unlike the dashboard's network-wide feed) this isn't capped/approximate. */
export function useCityActiveAlerts(cityId: string | undefined) {
  return useQuery({
    queryKey: ["admin-city-alerts", cityId],
    queryFn: () =>
      alertApi
        .getActive(cityId)
        .then((r) => r.data.alerts as { _id: string; title: string; severity: string }[]),
    enabled: !!cityId,
    staleTime: 30_000,
    throwOnError: false,
  });
}

/** Real per-city complaint total, via the existing complaints endpoint's
 *  own pagination.total — one call, only while a city's detail panel is open. */
export function useCityComplaintCount(cityId: string | undefined) {
  return useQuery({
    queryKey: ["admin-city-complaint-count", cityId],
    queryFn: () =>
      complaintApi.getAll({ cityId, limit: 1 }).then((r) => r.data.pagination.total as number),
    enabled: !!cityId,
    staleTime: 60_000,
    throwOnError: false,
  });
}
