import { Router } from "express";
import {
  getAQITrend,
  getHotspotAnalysis,
  getHealthImpact,
  getRiskAnalysis,
  getCityComparison,
  getSustainabilityRecommendations,
  getExecutiveInsights,
} from "../controllers/intelligence.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();
router.use(authenticate, authorize("citizen", ...AUTHORITY_ROLES));

// ─── Per-city intelligence ────────────────────────────────────────────────────
router.get("/aqi-trend/:cityId", getAQITrend); // ?days=7|30
router.get("/hotspots/:cityId", getHotspotAnalysis);
router.get("/health-impact/:cityId", getHealthImpact);
router.get("/risk-analysis/:cityId", getRiskAnalysis);
router.get("/sustainability/:cityId", getSustainabilityRecommendations);

// ─── Network-wide intelligence ────────────────────────────────────────────────
router.get("/compare", getCityComparison); // ?cities=id1,id2,...
router.get("/executive-insights", getExecutiveInsights); // authority dashboard

export default router;
