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

// ─── Per-notification actions ─────────────────────────────────────────────────
router.patch("/:id/read", markAsRead);
router.patch("/:id/archive", archiveNotification);
router.delete("/:id", deleteNotification);

export default router;
