import { body } from "express-validator";

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
  body("organization").optional().trim().isLength({ max: 200 }),
  body("phone").optional().trim(),
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
