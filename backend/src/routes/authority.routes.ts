import { Router } from "express";
import {
  listAuthorities,
  getAuthorityDetail,
  updateAuthorityProfile,
  assignCities,
  removeCities,
  setPrimaryCity,
  performLifecycleAction,
  getLifecycleHistory,
  getAuthorityDashboard,
  bulkOperation,
} from "../controllers/authority.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All authority management routes are administrator-only
router.use(authenticate, authorize("administrator"));

// Dashboard / intelligence
router.get("/dashboard", getAuthorityDashboard);

// Bulk operations
router.post("/bulk", bulkOperation);

// Directory listing
router.get("/", listAuthorities);

// Individual authority
router.get("/:id", getAuthorityDetail);
router.patch("/:id", updateAuthorityProfile);

// City assignment
router.post("/:id/cities", assignCities);
router.delete("/:id/cities", removeCities);
router.patch("/:id/primary-city", setPrimaryCity);

// Lifecycle management
router.post("/:id/lifecycle", performLifecycleAction);
router.get("/:id/lifecycle", getLifecycleHistory);

export default router;
