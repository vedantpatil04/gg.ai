import { Router } from "express";
import {
  createTicket,
  getMyTickets,
  getTicket,
  updateTicket,
  deleteTicket,
  addComment,
  getTicketStats,
  createBugReport,
  getFeatureRequests,
  createFeatureRequest,
  toggleFeatureVote,
  createFeedback,
} from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import { validate }                from "../middleware/validate";
import {
  createTicketValidator,
  updateTicketValidator,
  addCommentValidator,
  ticketQueryValidator,
  createBugValidator,
  createFeatureValidator,
  featureQueryValidator,
  createFeedbackValidator,
} from "../validators/support.validator";

const router = Router();

// All support routes require authentication
router.use(authenticate);

// ─── Tickets ──────────────────────────────────────────────────────────────────
router.get("/tickets/stats",          getTicketStats);
router.get("/tickets",                ticketQueryValidator, validate, getMyTickets);
router.post("/tickets",               createTicketValidator, validate, createTicket);
router.get("/tickets/:id",            getTicket);
router.patch("/tickets/:id",          updateTicketValidator, validate, updateTicket);
router.delete("/tickets/:id",         deleteTicket);
router.post("/tickets/:id/comments",  addCommentValidator, validate, addComment);

// ─── Bug Reports ──────────────────────────────────────────────────────────────
router.post("/bugs", createBugValidator, validate, createBugReport);

// ─── Feature Requests ─────────────────────────────────────────────────────────
router.get("/features",           featureQueryValidator, validate, getFeatureRequests);
router.post("/features",          createFeatureValidator, validate, createFeatureRequest);
router.post("/features/:id/vote", toggleFeatureVote);

// ─── Feedback ─────────────────────────────────────────────────────────────────
router.post("/feedback", createFeedbackValidator, validate, createFeedback);

export default router;
