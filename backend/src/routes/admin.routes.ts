import { Router } from "express";
import {
  getPlatformStats,
  getAISummary,
  getUsers,
  updateUser,
  deleteUser,
  listCities,
  addCity,
  updateCity,
  toggleCityActive,
  triggerIngestion,
  listAuthorityRequests,
  getAuthorityRequestDetails,
  approveAuthorityRequest,
  rejectAuthorityRequest,
  // Phase 3B
  getAuthorityWorkload,
  // Automation 6 — Governance & ML Analytics
  getGovernanceExceptions,
  getMLAnalytics,
  getRoutingAnalytics,
  getReworkAnalytics,
  getGovernanceOverview,
} from "../controllers/admin.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate, authorize("administrator"));

router.get("/stats", getPlatformStats);
router.get("/ai-summary", getAISummary);
router.get("/users", getUsers);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/cities", listCities);
router.post("/cities", addCity);
router.patch("/cities/:id", updateCity);
router.patch("/cities/:id/toggle", toggleCityActive);

router.post("/ingestion/trigger", triggerIngestion);

router.get("/authority-requests", listAuthorityRequests);
router.get("/authority-requests/:id", getAuthorityRequestDetails);
router.patch("/authority-requests/:id/approve", approveAuthorityRequest);
router.patch("/authority-requests/:id/reject", rejectAuthorityRequest);

// ─── Phase 3B: assignment workload ───────────────────────────────────────────
router.get("/workload", getAuthorityWorkload);

// ─── Automation 6: Admin Governance + ML Analytics ────────────────────────────
router.get("/governance/exceptions", getGovernanceExceptions);
router.get("/governance/ml-analytics", getMLAnalytics);
router.get("/governance/routing-analytics", getRoutingAnalytics);
router.get("/governance/rework-analytics", getReworkAnalytics);
router.get("/governance/overview", getGovernanceOverview);

export default router;
