import { body, param, query } from "express-validator";

export const paginationQueryValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50"),
];

export const loginHistoryQueryValidator = [
  ...paginationQueryValidator,
  query("filter")
    .optional()
    .isIn(["all", "successful", "failed"])
    .withMessage("filter must be one of: all, successful, failed"),
];

export const sessionIdParamValidator = [
  param("sessionId").trim().notEmpty().withMessage("sessionId is required"),
];

export const sendEmailOtpValidator = [
  body("newEmail").trim().isEmail().normalizeEmail().withMessage("A valid email is required"),
];

export const verifyEmailOtpValidator = [
  body("newEmail").trim().isEmail().normalizeEmail().withMessage("A valid email is required"),
  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Enter the 6-digit verification code"),
];

export const verifyPhoneOtpValidator = [
  body().custom((_, { req }) => {
    const hasOtp =
      typeof req.body?.otp === "string" && req.body.otp.trim().length === 6 && /^\d+$/.test(req.body.otp.trim());
    const hasToken =
      typeof (req.body?.accessToken || req.body?.["access-token"] || req.body?.token) === "string" &&
      (req.body?.accessToken || req.body?.["access-token"] || req.body?.token).trim().length > 0;

    if (!hasOtp && !hasToken) {
      throw new Error("Enter the 6-digit verification code or provide a valid verification token.");
    }
    return true;
  }),
];

export const deactivateAccountValidator = [
  body("password").notEmpty().withMessage("Current password is required."),
];
