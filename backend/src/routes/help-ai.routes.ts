import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  helpChat,
  getHelpHistory,
  deleteHelpConversation,
  getRecommendations,
  draftTicket,
  checkDuplicate,
  summarizeArticle,
  explain,
  searchExpand,
  getInsights,
} from "../controllers/help-ai.controller";

const router = Router();

// Public (no auth required — help is open to all)
router.post("/chat",          helpChat);
router.post("/recommend",     getRecommendations);
router.post("/draft-ticket",  draftTicket);
router.post("/summarize",     summarizeArticle);
router.post("/explain",       explain);
router.post("/search-expand", searchExpand);

// Auth required
router.get("/history",                      authenticate, getHelpHistory);
router.delete("/history/:sessionId",        authenticate, deleteHelpConversation);
router.post("/check-duplicate",             authenticate, checkDuplicate);
router.get("/insights",                     authenticate, getInsights);

export default router;
