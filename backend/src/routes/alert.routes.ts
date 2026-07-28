import { Router } from "express";
import {
  getAlerts,
  getActiveAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  explainAlert,
} from "../controllers/alert.controller";
import { authenticate, authorize, optionalAuth, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();

// Static paths MUST come before parameterised ones
router.get("/active", getActiveAlerts);
router.get("/explain/:id", optionalAuth, explainAlert); // Phase 3 — moved before /:cityId

router.get("/:cityId", getAlerts);
router.post("/", authenticate, authorize(...AUTHORITY_ROLES), createAlert);
router.patch("/:id/acknowledge", authenticate, authorize(...AUTHORITY_ROLES), acknowledgeAlert);
router.patch("/:id/resolve", authenticate, authorize(...AUTHORITY_ROLES), resolveAlert);

export default router;
