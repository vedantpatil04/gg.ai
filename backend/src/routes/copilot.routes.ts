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

// Chat/analysis endpoints back the Copilot page only (authority-tier, per
// Phase 1.3 route protection).
router.post("/chat", authenticate, authorize(...AUTHORITY_ROLES), chat);
router.post("/health-advice", authenticate, authorize(...AUTHORITY_ROLES), healthAdvice);
router.get(
  "/conversation/:sessionId",
  authenticate,
  authorize(...AUTHORITY_ROLES),
  getConversation,
);

// Public: powers the public Sustainability page — must stay unauthenticated.
router.get("/cities/:city/ai-insights", getCityAIInsights);

// Existing endpoints (backward-compat) — same access as their modern
// equivalents above.
router.post("/ask", authenticate, authorize(...AUTHORITY_ROLES), askCopilot);
router.get("/recommendations", authenticate, authorize(...AUTHORITY_ROLES), getRecommendations);

// Any authenticated role: also embedded on the shared Dashboard, not just
// the authority-only Copilot page.
router.get("/insights", authenticate, getInsights);

export default router;
