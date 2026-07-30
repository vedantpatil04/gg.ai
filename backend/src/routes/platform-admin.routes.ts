import { Router } from "express";
import {
  getExecutiveDashboard,
  listUsersAdmin,
  updateUserAdmin,
  lockUserAccount,
  unlockUserAccount,
  listCitiesAdmin,
  createCityAdmin,
  updateCityAdmin,
  toggleCityAdmin,
  getAuditLog,
  getSystemHealth,
  getPlatformConfig,
} from "../controllers/platform-admin.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All platform-admin routes: administrator only
router.use(authenticate, authorize("administrator"));

// Executive dashboard
router.get("/executive-dashboard", getExecutiveDashboard);

// User management
router.get("/users", listUsersAdmin);
router.patch("/users/:id", updateUserAdmin);
router.post("/users/:id/lock", lockUserAccount);
router.post("/users/:id/unlock", unlockUserAccount);

// City management
router.get("/cities", listCitiesAdmin);
router.post("/cities", createCityAdmin);
router.patch("/cities/:id", updateCityAdmin);
router.patch("/cities/:id/toggle", toggleCityAdmin);

// Audit
router.get("/audit", getAuditLog);

// System health
router.get("/system-health", getSystemHealth);

// Platform config
router.get("/config", getPlatformConfig);

export default router;
