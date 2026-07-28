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

export default router;
