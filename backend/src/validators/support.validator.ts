import { body, param, query } from "express-validator";

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const createTicketValidator = [
  body("subject").trim().isLength({ min: 5, max: 300 }).withMessage("Subject must be 5–300 characters"),
  body("description").trim().isLength({ min: 10, max: 5000 }).withMessage("Description must be 10–5000 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid priority"),
  body("department").optional().trim().isLength({ max: 100 }),
  body("environment").optional().trim().isLength({ max: 100 }),
  body("browser").optional().trim().isLength({ max: 50 }),
  body("device").optional().trim().isLength({ max: 50 }),
];

export const updateTicketValidator = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("status")
    .optional()
    .isIn(["open", "in_progress", "waiting", "resolved", "closed"])
    .withMessage("Invalid status"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid priority"),
  body("subject").optional().trim().isLength({ min: 5, max: 300 }),
  body("description").optional().trim().isLength({ min: 10, max: 5000 }),
];

export const addCommentValidator = [
  param("id").isMongoId().withMessage("Invalid ticket ID"),
  body("body").trim().isLength({ min: 1, max: 2000 }).withMessage("Comment must be 1–2000 characters"),
];

export const ticketQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["open", "in_progress", "waiting", "resolved", "closed"]),
  query("priority").optional().isIn(["low", "medium", "high", "critical"]),
];

// ─── Bug Reports ──────────────────────────────────────────────────────────────

export const createBugValidator = [
  body("title").trim().isLength({ min: 5, max: 300 }).withMessage("Title must be 5–300 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("severity")
    .isIn(["minor", "major", "critical", "blocker"])
    .withMessage("Invalid severity"),
  body("steps").trim().isLength({ min: 10, max: 3000 }).withMessage("Steps must be 10–3000 characters"),
  body("expected").trim().isLength({ min: 5, max: 1000 }).withMessage("Expected result must be 5–1000 characters"),
  body("actual").trim().isLength({ min: 5, max: 1000 }).withMessage("Actual result must be 5–1000 characters"),
  body("platform").optional().trim().isLength({ max: 100 }),
  body("browser").optional().trim().isLength({ max: 50 }),
  body("device").optional().trim().isLength({ max: 50 }),
];

// ─── Feature Requests ─────────────────────────────────────────────────────────

export const createFeatureValidator = [
  body("title").trim().isLength({ min: 5, max: 300 }).withMessage("Title must be 5–300 characters"),
  body("description").trim().isLength({ min: 10, max: 2000 }).withMessage("Description must be 10–2000 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("tags").optional().isArray({ max: 10 }),
  body("tags.*").optional().trim().isLength({ max: 50 }),
];

export const featureQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["submitted", "planned", "in_progress", "shipped", "declined"]),
];

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const createFeedbackValidator = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1–5"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("comment").optional().trim().isLength({ max: 3000 }),
  body("nps").optional().isInt({ min: 0, max: 10 }),
  body("uiSatisfaction").optional().isInt({ min: 0, max: 5 }),
  body("aiSatisfaction").optional().isInt({ min: 0, max: 5 }),
];
