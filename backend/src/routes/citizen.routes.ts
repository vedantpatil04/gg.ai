import { Router } from "express";
import { getCitizenStats } from "../controllers/citizen.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// All citizen hub routes require authentication.
// Citizens only — no authority or admin access to these citizen-specific aggregates.
router.use(authenticate, authorize("citizen"));

router.get("/stats", getCitizenStats);

export default router;
