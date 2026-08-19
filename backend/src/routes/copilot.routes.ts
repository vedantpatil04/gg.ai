import { Router } from "express";
import {
  chat,
  askCopilot,
  healthAdvice,
  getRecommendations,
  getInsights,
  getCityAIInsights,
  getConversation,
  sustainabilityChat,
  getAIProviders,
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

// PHASE 2 — Intelligence Center Assistant model selector: metadata for
// whichever providers are actually configured (have an API key set). Only
// used by the /copilot Assistant's "+"-adjacent model dropdown; /chat above
// is unaffected unless a caller explicitly sends a `provider` field.
router.get(
  "/providers",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  getAIProviders,
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

// PHASE 5 — GreenGuard Intelligence Center: Sustainability-page-only chat,
// grounded in the same transparent EcoScore engine and Phase 4 historical
// data the page itself renders from. Same access as the generic /chat
// above; kept as a separate route/handler so the shared /chat endpoint's
// behavior for Dashboard/Map/Forecast/Intelligence/Copilot is untouched.
router.post(
  "/sustainability-chat",
  authenticate,
  authorize("citizen", ...AUTHORITY_ROLES),
  sustainabilityChat,
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
