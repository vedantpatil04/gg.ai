import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  archiveNotification,
  deleteNotification,
  getPreferences,
  updatePreferences,
} from "../controllers/notification.controller";
import { registerDevice, deactivateDevice, listDevices } from "../controllers/device.controller";
import { validate } from "../middleware/validate";
import { registerDeviceValidator, deactivateDeviceValidator } from "../validators/device.validator";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// ─── Listing & counts ─────────────────────────────────────────────────────────
router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);

// ─── Bulk actions ─────────────────────────────────────────────────────────────
router.patch("/mark-all-read", markAllRead);

// ─── Preferences ─────────────────────────────────────────────────────────────
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

// ─── Phase 3 — FCM device token registration ──────────────────────────────────
// Permanent push-delivery infrastructure: reused by every current and
// future notification type via notification.service.ts, never touched by
// individual controllers directly (see push.service.ts).
router.get("/devices", listDevices);
router.post("/devices", registerDeviceValidator, validate, registerDevice);
router.delete("/devices/:token", deactivateDeviceValidator, validate, deactivateDevice);

// ─── Per-notification actions ─────────────────────────────────────────────────
router.patch("/:id/read", markAsRead);
router.patch("/:id/archive", archiveNotification);
router.delete("/:id", deleteNotification);

export default router;
