import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CITIES, type City, type EcoScoreBreakdown } from "./mock-data";
import { environmentalApi } from "./api/environmental.api";

// ─── Shape mapper: backend → City ─────────────────────────────────────────────
function mapBackendToCity(d: Record<string, unknown>): City {
  return {
    id: (d.cityId as string) ?? (d.id as string),
    name: (d.cityName as string) ?? (d.name as string),
    country: d.country as string,
    aqi: d.aqi as number,
    water: d.water as number,
    risk: d.risk as number,
    eco: d.eco as number,
    temp: d.temp as number,
    humidity: d.humidity as number,
    pm25: d.pm25 as number,
    pm10: d.pm10 as number,
    no2: d.no2 as number,
    o3: d.o3 as number,
    co2: d.co2 as number,
    carbon: d.carbon as number,
    alerts: (d.alerts as number) ?? 0,
    lat: d.lat as number,
    lng: d.lng as number,
    pressure: d.pressure as number | undefined,
    co: d.co as number | undefined,
    so2: d.so2 as number | undefined,
    renewableShare: d.renewableShare as number | undefined,
    greenCover: d.greenCover as number | undefined,
    turbidity: d.turbidity as number | undefined,
    dissolvedOxygen: d.dissolvedOxygen as number | undefined,
    ph: d.ph as number | undefined,
    windSpeed: (d.windSpeed as number | undefined) ?? undefined,
    windDirection: (d.windDirection as number | undefined) ?? undefined,
    updatedAt:
      (d.timestamp as string | undefined) ?? (d.updatedAt as string | undefined) ?? undefined,
    ecoScore: d.ecoScore as EcoScoreBreakdown | undefined,
  };
}

interface CityContextValue {
  city: City;
  setCityId: (id: string) => void;
  cities: City[];
  isApiConnected: boolean;
  refreshCity: () => void;
  isCityListLoading?: boolean;
  isCityError?: boolean;
  cityDataUpdatedAt?: number;
  isCityFetching?: boolean;
}

const CityCtx = createContext<CityContextValue>({
  city: CITIES[0],
  setCityId: () => {},
  cities: CITIES,
  isApiConnected: false,
  refreshCity: () => {},
  isCityListLoading: false,
  isCityError: false,
  cityDataUpdatedAt: 0,
  isCityFetching: false,
});

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityIdState] = useState<string>(CITIES[0].id);
  useEffect(() => {
    const savedCity = localStorage.getItem("gg-city");
    if (savedCity) {
      setCityIdState(savedCity);
    }
  }, []);

  // ─── Fetch all cities from API ─────────────────────────────────────────────
  const {
    data: apiCities,
    isSuccess: citiesLoaded,
    isLoading: isCityListLoading,
    isError: isCityError,
    dataUpdatedAt: cityDataUpdatedAt,
    isFetching: isCityFetching,
    refetch: refreshCity,
  } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const res = await environmentalApi.getCities();
      return (res.data.cities as Record<string, unknown>[]).map(mapBackendToCity);
    },
    staleTime: 2 * 60 * 1000, // 2 min
    retry: 1,
    // Never throw — fall back silently to mock data
    throwOnError: false,
  });

  // ─── Fetch single city (live polling) ─────────────────────────────────────
  const { data: liveCity, refetch: refreshLiveCity } = useQuery({
    queryKey: ["city", cityId],
    queryFn: async () => {
      const res = await environmentalApi.getCity(cityId);
      return mapBackendToCity(res.data.city as Record<string, unknown>);
    },
    refetchInterval: 60_000, // Poll every 60 s
    staleTime: 30_000,
    retry: 1,
    throwOnError: false,
    enabled: citiesLoaded, // Only start once we know the API is alive
  });

  const setCityId = useCallback((id: string) => {
    setCityIdState(id);
    try {
      localStorage.setItem("gg-city", id);
    } catch {}
  }, []);

  // Resolve current city: live API → apiCities list → mock fallback
  const cities = apiCities ?? CITIES;
  const mockCity = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
  const listCity = apiCities?.find((c) => c.id === cityId);
  const city = liveCity ?? listCity ?? mockCity;

  return (
    <CityCtx.Provider
      value={{
        city,
        setCityId,
        cities,
        isApiConnected: citiesLoaded,
        refreshCity: () => {
          refreshCity();
          refreshLiveCity();
        },
        isCityListLoading,
        isCityError,
        cityDataUpdatedAt,
        isCityFetching,
      }}
    >
      {children}
    </CityCtx.Provider>
  );
}

export const useCity = () => useContext(CityCtx);
