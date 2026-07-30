import { Router } from "express";
import {
  getPlatformOverview,
  listUsersEnhanced,
  updateUserEnhanced,
  lockUser,
  unlockUser,
  getSystemHealth,
  getAuditLog,
  getPlatformConfig,
  getPlatformAnalytics,
} from "../controllers/platform-admin.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All routes: administrator only
router.use(authenticate, authorize("administrator"));

router.get("/overview", getPlatformOverview);
router.get("/users", listUsersEnhanced);
router.patch("/users/:id", updateUserEnhanced);
router.post("/users/:id/lock", lockUser);
router.post("/users/:id/unlock", unlockUser);
router.get("/system-health", getSystemHealth);
router.get("/audit", getAuditLog);
router.get("/config", getPlatformConfig);
router.get("/analytics", getPlatformAnalytics);

export default router;
