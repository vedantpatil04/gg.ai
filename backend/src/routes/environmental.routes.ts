import { Router } from "express";
import {
  getCities,
  getCity,
  getCityTrend,
  getHotspots,
  getCityMapData,
  getDashboardStats,
  // Phase 4
  getCityHistory,
  getCityTrends,
  getPollutionRankings,
  getNetworkSummary,
  // Phase 2 GIS upgrade
  getMapComplaints,
  // Phase 1: Real Forecast Data Foundation
  getCityWeatherForecast,
} from "../controllers/environmental.controller";

const router = Router();

// ─── Existing Phase 3 routes (fully preserved — no frontend changes needed) ──
router.get("/cities", getCities);
router.get("/cities/:cityId", getCity);
router.get("/cities/:cityId/trend", getCityTrend);
router.get("/cities/:cityId/hotspots", getHotspots); // ← now DB-backed
router.get("/cities/:cityId/dashboard", getDashboardStats);

// ─── Phase 1: Real Forecast Data Foundation ──────────────────────────────────
// GET /environmental/cities/:cityId/forecast — real 7-day daily forecast,
// previously expected by the frontend but unimplemented (always 404'd).
router.get("/cities/:cityId/forecast", getCityWeatherForecast);

// ─── Smart Map: rich city data (locations + water bodies + zones) ─────────────
// GET /environmental/cities/:cityId/map-data
// Used by the upgraded Smart Map page; returns everything in one round-trip.
router.get("/cities/:cityId/map-data", getCityMapData);

// ─── Smart Map: geocoded complaints for the Complaints marker layer ──────────
// GET /environmental/cities/:cityId/map-complaints
router.get("/cities/:cityId/map-complaints", getMapComplaints);

// ─── Phase 4: Historical analytics ───────────────────────────────────────────
router.get("/history/:cityId", getCityHistory); // ?days=7|30
router.get("/trends/:cityId", getCityTrends); // 7d + 30d avgs
router.get("/rankings", getPollutionRankings); // all cities ranked
router.get("/network-summary", getNetworkSummary); // platform aggregate

export default router;
