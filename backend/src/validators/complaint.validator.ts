import { body, param, query } from "express-validator";
import mongoose                from "mongoose";

export const createComplaintValidator = [
  body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Title must be 5–200 characters"),
  body("description").trim().isLength({ min: 10, max: 2000 }).withMessage("Description must be 10–2000 characters"),
  body("issueType")
    .isIn(["air_pollution","water_contamination","open_burning","noise","waste_dumping","chemical_spill","other"])
    .withMessage("Invalid issue type"),
  body("severity").optional().isIn(["low","medium","high","critical"]).withMessage("Invalid severity"),
  body("cityId").trim().notEmpty().withMessage("City ID is required"),
  body("location.address").optional().trim(),
  body("location.lat").optional().isFloat({ min: -90,  max: 90  }),
  body("location.lng").optional().isFloat({ min: -180, max: 180 }),
];

export const updateComplaintValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
  body("status")
    .optional()
    .isIn(["pending","in-progress","resolved","rejected"])
    .withMessage("Invalid status"),
  body("resolution").optional().trim().isLength({ max: 2000 }),
  body("assignedTo").optional().isMongoId().withMessage("Invalid user ID"),
];

export const complaintQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  // Pre-existing gap fixed here: "rework" and "closed" were missing even
  // though the admin governance queue and authority queue already filter by
  // them — those tab queries were failing validation before this fix.
  // "awaiting_citizen_review" added for Citizen Review.
  query("status").optional().isIn([
    "pending","in-progress","awaiting_citizen_review","resolved","rejected","rework","closed",
  ]),
  query("severity").optional().isIn(["low","medium","high","critical"]),
  query("cityId").optional().trim(),
  query("issueType").optional().isIn(["air_pollution","water_contamination","open_burning","noise","waste_dumping","chemical_spill","other"]),
  query("assignedTo").optional().custom((value: string) => {
    if (value === "me") return true;
    if (mongoose.isValidObjectId(value)) return true;
    throw new Error("assignedTo must be 'me' or a valid MongoDB ObjectId");
  }),
];

/** Phase 3A.4 — internal notes update */
export const updateComplaintNotesValidator = [
  param("id").isMongoId().withMessage("Invalid complaint ID"),
  body("notes").optional().trim().isLength({ max: 5000 }).withMessage("Notes must be under 5 000 characters"),
];
