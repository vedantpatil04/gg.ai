import { body } from "express-validator";
import { normalizeAuthorityDepartment } from "../constants/smartRouting";

export const signupValidator = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and a number"),
  // "administrator" is intentionally excluded — public self-registration as
  // Administrator is not permitted. This is enforced again in the controller
  // so the rule holds even if this validator list is ever changed.
  body("role").optional().isIn(["citizen", "authority"]).withMessage("Invalid role"),
  // Organization/Board stays flexible free text (not a hardcoded dropdown)
  // for every role, but is only mandatory for Authority registration —
  // Citizen accounts have no organization/board and must keep working
  // exactly as before. Two independent chains (rather than one .optional()
  // + .if() chain) avoid ambiguity between "absent" and "conditionally
  // required" on the same field.
  body("organization")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Organization/Board must be under 200 characters"),
  body("organization")
    .if(body("role").equals("authority"))
    .trim()
    .notEmpty()
    .withMessage("Organization/Board is required for Authority registration"),
  body("phone").optional().trim(),
  // Department is the structured classification Smart Routing (Automation 2)
  // matches against — it is REQUIRED for Authority registration and MUST
  // resolve to one of the canonical COMPLAINT_DEPARTMENTS values (accepting
  // either the slug or its human-readable label). It is never required, and
  // is ignored if supplied, for Citizen registration. Never trust the
  // frontend dropdown alone — arbitrary/unsupported strings are rejected
  // here regardless of what the client sends.
  body("department")
    .if(body("role").equals("authority"))
    .notEmpty()
    .withMessage("Department is required for Authority registration")
    .bail()
    .custom((value) => normalizeAuthorityDepartment(value) !== null)
    .withMessage("Invalid department. Please select a department from the list."),
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
  body("portal")
    .notEmpty()
    .withMessage("Portal selection is required")
    .bail()
    .isIn(["citizen", "authority", "admin"])
    .withMessage("Invalid portal selected"),
  body("turnstileToken")
    .notEmpty()
    .withMessage("Security verification is required"),
];

export const forgotPasswordValidator = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
];

export const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and a number"),
];

export const updateProfileValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 100 }),
  body("organization").optional().trim().isLength({ max: 200 }),
  body("phone").optional().trim(),
  body("city").optional().trim(),
];

export const changePasswordValidator = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Must contain uppercase, lowercase, and a number"),
];
