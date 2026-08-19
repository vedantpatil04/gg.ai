import { body, param } from "express-validator";

const DEVICE_PLATFORMS = ["android", "ios", "web"];

export const registerDeviceValidator = [
  body("token")
    .isString()
    .trim()
    .isLength({ min: 10, max: 4096 })
    .withMessage("A valid FCM device token is required."),
  body("platform")
    .optional()
    .isString()
    .isIn(DEVICE_PLATFORMS)
    .withMessage(`platform must be one of: ${DEVICE_PLATFORMS.join(", ")}`),
  body("appId").optional().isString().trim().isLength({ max: 200 }),
];

export const deactivateDeviceValidator = [
  param("token").isString().trim().isLength({ min: 10, max: 4096 }).withMessage("A valid device token is required."),
];
