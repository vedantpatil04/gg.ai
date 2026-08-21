import client from "./client";

// ─── Types returned by getCityMapData ─────────────────────────────────────────
export type LocationCategory =
  "industrial" | "residential" | "commercial" | "park" | "water" | "landmark";

// ─── Sensor/marker type (device-axis, independent of land-use category) ──────
export type SensorType =
  "environmental" | "weather" | "water" | "industrial" | "traffic" | "complaint" | "alert";

export interface MapLocation {
  /** Stable short ID unique within a city, e.g. "a1" */
  id: string;
  name: string;
  category: LocationCategory;
  /** Real-world latitude */
  latitude: number;
  /** Real-world longitude */
  longitude: number;
  /** SVG canvas X position 0–100 */
  x: number;
  /** SVG canvas Y position 0–100 */
  y: number;
  /** AQI-equivalent pollution level. Phase 2: independently computed per
   *  category (industrial/park/water/traffic all differ realistically) with
   *  deterministic per-location variance — no longer a flat capped-at-100
   *  scalar of the city's single AQI value. Realistic range 0–500. */
  level: number;
  /** Phase 2: category-realistic per-location values (all optional — absent
   *  when using offline-fallback data, which only ever carried `level`). */
  pm25?: number;
  pm10?: number;
  no2?: number;
  co?: number;
  temp?: number;
  humidity?: number;
  /** Approximate ambient noise, dB. */
  noise?: number;
  /** Echoed from the city-wide reading — wind isn't meaningfully hyper-local
   *  at this scale, so it's intentionally the same across every location. */
  windSpeed?: number | null;
  windDirection?: number | null;
  /** null when no physical sensor is deployed here. */
  battery?: number | null;
  health?: "optimal" | "nominal" | "degraded" | "offline";
  /** Whether a physical sensor is deployed */
  sensor: boolean;
  /** Device/event type used for marker styling on the GIS map */
  sensorType: SensorType;
  /** Short contextual blurb */
  description: string;
}

export interface WaterBody {
  id: string;
  name: string;
  /** Legacy SVG canvas X position 0–100. Used by the drawer list. */
  x: number;
  /** Legacy SVG canvas Y position 0–100. Used by the drawer list. */
  y: number;
  /**
   * Real-world coordinates (Phase 1 GIS upgrade). Optional because the
   * offline/fallback data source (city-map-data.ts) does not carry these —
   * the map only renders a water-body marker on the live GIS canvas when
   * both are present.
   */
  latitude?: number;
  longitude?: number;
}

export interface EnvZones {
  residential: number;
  industrial: number;
  commercial: number;
  greenCover: number;
}

export interface CityMapData {
  cityId: string;
  cityName: string;
  center: { lat: number; lng: number };
  zoom: number;
  /** Camera bearing in degrees (0–360). Defaults to 0 when not configured. */
  bearing: number;
  /** Camera pitch/tilt in degrees (0–60). Defaults to 0 when not configured. */
  pitch: number;
  locations: MapLocation[];
  waterBodies: WaterBody[];
  zones: EnvZones;
  baseAqi: number;
  updatedAt: string;
}

// ─── Map complaints (Phase 2 GIS upgrade: Complaints marker layer) ───────────
export interface MapComplaint {
  id: string;
  title: string;
  issueType: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "in-progress" | "awaiting_citizen_review" | "rework" | "resolved" | "closed" | "rejected";
  lat: number;
  lng: number;
  address: string;
  createdAt: string;
  assignedTo?: string;
}

// ─── Phase 3: History day record (returned by /history/:cityId) ──────────────
export interface CityHistoryDay {
  date: string;
  aqi: { avg: number; max: number; min: number };
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  temp: number;
  humidity: number;
  water: number;
  risk: number;
  eco: number;
  readings: number;
}

// ─── Phase 3: Relationships & Trends — verified-only trend summary ───────────
// Returned by /environmental/trends/:cityId. `direction`/`sufficient` reflect
// only genuine ingested readings (source: "api") — seeded/demo data is
// excluded server-side, so a "insufficient-data" direction here is an honest
// signal, not a fabricated fallback.
export interface CityTrendPeriod {
  avgAqi: number | null;
  avgPm25: number | null;
  avgRisk: number | null;
  direction: "improving" | "worsening" | "stable" | "insufficient-data";
  readings: number;
  sufficient: boolean;
}

export interface CityTrendsResponse {
  cityId: string;
  cityName: string;
  current: { aqi: number; pm25: number; risk: number; eco: number; timestamp: string };
  trend7d: CityTrendPeriod;
  trend30d: CityTrendPeriod;
}

export interface DailyForecast {
  date: string;
  icon: string;
  condition: string;
  description?: string;
  high: number;
  low: number;
  pop?: number;
  humidity?: number;
  windSpeed?: number;
  dayName?: string;
  dateStr?: string;
  highTemp?: number;
  lowTemp?: number;
  weatherCondition?: string;
  aqiEstimate?: number;
  precipitationChance?: number;
}

export interface CityTrendPoint {
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  water: number;
  eco: number;
  risk?: number;
  temp?: number;
  humidity?: number;
  renewableShare?: number;
  carbon?: number;
  greenCover?: number;
}

// ─── In-flight client-side request deduplication ────────────────────────────
// Prevents duplicate concurrent HTTP calls when multiple components on the same
// page or hydration cycle request identical forecast resources.
const clientInFlight = new Map<string, Promise<any>>();

function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = clientInFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => {
    clientInFlight.delete(key);
  });
  clientInFlight.set(key, promise);
  return promise;
}

// ─── Existing API surface (unchanged — no breaking changes) ───────────────────
export const environmentalApi = {
  getCities: () => client.get("/environmental/cities").then((r) => r.data),

  getCity: (cityId: string) => client.get(`/environmental/cities/${cityId}`).then((r) => r.data),

  getCityWeatherForecast: (cityId: string) =>
    dedupeRequest(`wx-forecast:${cityId.toLowerCase()}`, () =>
      client.get(`/environmental/cities/${cityId}/forecast`).then((r) => r.data),
    ),

  getCityTrend: (cityId: string, hours = 24) =>
    client.get(`/environmental/cities/${cityId}/trend`, { params: { hours } }).then((r) => r.data),

  getCityTrendTyped: (
    cityId: string,
    hours = 24,
  ): Promise<{ success: boolean; data: { cityId: string; hours: number; trend: CityTrendPoint[] } }> =>
    client.get(`/environmental/cities/${cityId}/trend`, { params: { hours } }).then((r) => r.data),

  getHotspots: (cityId: string) =>
    client.get(`/environmental/cities/${cityId}/hotspots`).then((r) => r.data),

  getDashboard: (cityId: string) =>
    client.get(`/environmental/cities/${cityId}/dashboard`).then((r) => r.data),

  // ── NEW: Rich Smart Map data ─────────────────────────────────────────────────
  // Returns city-specific locations, water bodies, and env-zone breakdown in one
  // round-trip. Falls back gracefully when the API is unavailable.
  getCityMapData: (cityId: string): Promise<{ success: boolean; data: CityMapData }> =>
    client.get(`/environmental/cities/${cityId}/map-data`).then((r) => r.data),

  // ── Phase 2 GIS upgrade: geocoded complaints for the Complaints marker layer ─
  getMapComplaints: (cityId: string): Promise<{ success: boolean; data: MapComplaint[] }> =>
    client.get(`/environmental/cities/${cityId}/map-complaints`).then((r) => r.data),

  // ─── Phase 4: Historical analytics ──────────────────────────────────────────
  getHistory: (cityId: string, days: 7 | 30 = 7) =>
    client.get(`/environmental/history/${cityId}`, { params: { days } }).then((r) => r.data),

  // ── Phase 3 alias: flexible days param for timeline ────────────────────────
  getCityHistory: (
    cityId: string,
    days: number,
  ): Promise<{
    success: boolean;
    data: { cityId: string; days: number; history: CityHistoryDay[] };
  }> => client.get(`/environmental/history/${cityId}`, { params: { days } }).then((r) => r.data),

  getTrends: (cityId: string): Promise<{ success: boolean; data: CityTrendsResponse }> =>
    client.get(`/environmental/trends/${cityId}`).then((r) => r.data),

  getRankings: () => client.get("/environmental/rankings").then((r) => r.data),

  getNetworkSummary: () => client.get("/environmental/network-summary").then((r) => r.data),

  refreshEnvironmentalData: () => client.post("/environmental/refresh").then((r) => r.data),
};

export const forecastApi = {
  getForecast: (cityId: string, hours = 48) =>
    dedupeRequest(`forecast:${cityId.toLowerCase()}:${hours}`, () =>
      client.get(`/forecast/${cityId}`, { params: { hours } }).then((r) => r.data),
    ),

  getWeekly: (cityId: string) =>
    dedupeRequest(`forecast-weekly:${cityId.toLowerCase()}`, () =>
      client.get(`/forecast/${cityId}/weekly`).then((r) => r.data),
    ),
};


// ─── Phase 4: Environmental intelligence API ──────────────────────────────────
export const intelligenceApi = {
  getAQITrend: (cityId: string, days: 7 | 30 = 7) =>
    client.get(`/intelligence/aqi-trend/${cityId}`, { params: { days } }).then((r) => r.data),

  getHotspotAnalysis: (cityId: string) =>
    client.get(`/intelligence/hotspots/${cityId}`).then((r) => r.data),

  getHealthImpact: (cityId: string) =>
    client.get(`/intelligence/health-impact/${cityId}`).then((r) => r.data),

  getRiskAnalysis: (cityId: string) =>
    client.get(`/intelligence/risk-analysis/${cityId}`).then((r) => r.data),

  getSustainabilityRecommendations: (cityId: string) =>
    client.get(`/intelligence/sustainability/${cityId}`).then((r) => r.data),

  getCityComparison: (cityIds?: string[]) =>
    client
      .get("/intelligence/compare", {
        params: cityIds?.length ? { cities: cityIds.join(",") } : {},
      })
      .then((r) => r.data),

  getExecutiveInsights: () => client.get("/intelligence/executive-insights").then((r) => r.data),
};

// ─── Phase 4: Admin city management API ──────────────────────────────────────
export const adminCityApi = {
  listCities: () => client.get("/admin/cities").then((r) => r.data),

  addCity: (payload: {
    cityId: string;
    name: string;
    country: string;
    lat: number;
    lng: number;
    timezone?: string;
  }) => client.post("/admin/cities", payload).then((r) => r.data),

  updateCity: (
    id: string,
    payload: Partial<{
      name: string;
      country: string;
      lat: number;
      lng: number;
      timezone: string;
      active: boolean;
    }>,
  ) => client.patch(`/admin/cities/${id}`, payload).then((r) => r.data),

  toggleActive: (id: string) => client.patch(`/admin/cities/${id}/toggle`).then((r) => r.data),

  triggerIngestion: () => client.post("/admin/ingestion/trigger").then((r) => r.data),
};
