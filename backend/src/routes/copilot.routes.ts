import { Router } from "express";
import {
  chat,
  askCopilot,
  healthAdvice,
  getRecommendations,
  getInsights,
  getCityAIInsights,
  getConversation,
} from "../controllers/copilot.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();

// Chat/analysis endpoints back the Copilot page and Sustainability Copilot panel
// (accessible to citizen, authority, and administrator roles).
router.post(
  "/chat",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  chat,
);
router.post(
  "/health-advice",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  healthAdvice,
);
router.get(
  "/conversation/:sessionId",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  getConversation,
);

// Public: powers the public Sustainability page — must stay unauthenticated.
router.get("/cities/:city/ai-insights", getCityAIInsights);

// Existing endpoints (backward-compat) — same access as their modern
// equivalents above.
router.post(
  "/ask",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  askCopilot,
);
router.get(
  "/recommendations",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  getRecommendations,
);

// Any authenticated role: also embedded on the shared Dashboard, not just
// the Copilot page.
router.get("/insights", authenticate, getInsights);

export default router;
