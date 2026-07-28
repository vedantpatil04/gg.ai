import { body, param, query } from "express-validator";
import mongoose from "mongoose";

const ALL_STATUSES = [
  "pending",
  "in-progress",
  "resolved",
  "rejected",
  "rework",
  "closed",
] as const;
const PATCH_STATUSES = ["pending", "in-progress", "resolved", "rejected"] as const; // rework/closed via dedicated endpoints
const ALL_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const ALL_ISSUES = [
  "air_pollution",
  "water_contamination",
  "open_burning",
  "noise",
  "waste_dumping",
  "chemical_spill",
  "other",
] as const;

export const createComplaintValidator = [
  body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Title must be 5–200 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be 10–2000 characters"),
  body("issueType")
    .isIn([...ALL_ISSUES])
    .withMessage("Invalid issue type"),
  body("severity")
    .optional()
    .isIn([...ALL_SEVERITIES])
    .withMessage("Invalid severity"),
  body("cityId").trim().notEmpty().withMessage("City ID is required"),
  body("location.address").optional().trim(),
  body("location.lat").optional().isFloat({ min: -90, max: 90 }),
  body("location.lng").optional().isFloat({ min: -180, max: 180 }),
];

export const updateComplaintValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
  body("status")
    .optional()
    .isIn([...PATCH_STATUSES])
    .withMessage("Invalid status — use dedicated endpoints for rework/closed"),
  body("resolution").optional().trim().isLength({ max: 2000 }),
  body("assignedTo").optional().isMongoId().withMessage("Invalid user ID"),
];

export const complaintQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("status")
    .optional()
    .isIn([...ALL_STATUSES]),
  query("severity")
    .optional()
    .isIn([...ALL_SEVERITIES]),
  query("cityId").optional().trim(),
  query("issueType")
    .optional()
    .isIn([...ALL_ISSUES]),
  query("assignedTo")
    .optional()
    .custom((value: string) => {
      if (value === "me") return true;
      if (mongoose.isValidObjectId(value)) return true;
      throw new Error("assignedTo must be 'me' or a valid MongoDB ObjectId");
    }),
];

export const updateComplaintNotesValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
  body("notes").optional().trim().isLength({ max: 5000 }),
];

/** Phase 3C — administrator approves a resolved complaint and closes it. */
export const verifyResolutionValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
];

/** Phase 3C — administrator rejects resolution and returns it for rework. */
export const requestReworkValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
  body("reason")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Rejection reason must be 10–1000 characters"),
  body("comments")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comments must be under 2000 characters"),
];
