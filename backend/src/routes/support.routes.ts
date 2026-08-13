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
  getBugReports,
  getBugReport,
  getFeatureRequests,
  createFeatureRequest,
  toggleFeatureVote,
  createFeedback,
} from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import { validate }     from "../middleware/validate";
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
import { body, param, query } from "express-validator";

const router = Router();

// All support routes require authentication
router.use(authenticate);

// ─── Tickets ──────────────────────────────────────────────────────────────────
router.get("/tickets/stats",         getTicketStats);
router.get("/tickets",               ticketQueryValidator, validate, getMyTickets);
router.post("/tickets",              createTicketValidator, validate, createTicket);
router.get("/tickets/:id",           getTicket);
router.patch("/tickets/:id",         updateTicketValidator, validate, updateTicket);
router.delete("/tickets/:id",        deleteTicket);
router.post("/tickets/:id/comments", addCommentValidator, validate, addComment);

// ─── Bug Reports ──────────────────────────────────────────────────────────────
router.get("/bugs", [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["open", "acknowledged", "fixed", "wontfix"]),
  query("severity").optional().isIn(["minor", "major", "critical", "blocker"]),
], validate, getBugReports);
router.get("/bugs/:id", [
  param("id").isMongoId().withMessage("Invalid bug report ID"),
], validate, getBugReport);
router.post("/bugs", createBugValidator, validate, createBugReport);

// ─── Feature Requests ─────────────────────────────────────────────────────────
router.get("/features",           featureQueryValidator, validate, getFeatureRequests);
router.post("/features",          createFeatureValidator, validate, createFeatureRequest);
router.post("/features/:id/vote", toggleFeatureVote);

// ─── Feedback ─────────────────────────────────────────────────────────────────
router.post("/feedback", createFeedbackValidator, validate, createFeedback);

export default router;
