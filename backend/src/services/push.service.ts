/**
 * Phase 3 — Central Push Notification Service (Firebase Cloud Messaging)
 *
 * This is the ONLY module in the backend that talks to Firebase. Every
 * notification — present and future — reaches FCM by going through
 * notification.service.ts's createNotification()/fanOutNotification(),
 * which call sendPushToUser()/sendPushToUsers() below after the database
 * notification record has already been written successfully. Controllers
 * never call this module directly (see notification.service.ts).
 *
 * Design rules this file exists to enforce (Phase 3 spec):
 *  - FCM failure NEVER throws back into the caller. The existing
 *    Notification record is the source of truth; push is best-effort
 *    delivery on top of it.
 *  - A push send is scoped to exactly the token rows that belong to the
 *    target user(s) — no cross-user leakage is possible because token
 *    lookups are always by userId.
 *  - Invalid/unregistered tokens reported back by FCM are deactivated so
 *    they stop being retried, without affecting delivery to the user's
 *    other devices.
 *  - Nothing here is coupled to a specific notification type. Adding a
 *    new notification type never requires touching this file.
 */

import type { App } from "firebase-admin/app";
import type { Messaging, MulticastMessage } from "firebase-admin/messaging";
import mongoose from "mongoose";
import { DeviceToken, type DevicePlatform } from "../models/DeviceToken";
import { User } from "../models/User";
import type {
  NotificationCategory as NotificationModelCategory,
  NotificationPriority,
} from "../models/Notification";
import { NOTIFICATION_CATEGORIES } from "../constants/notifications";
import { logger } from "../utils/logger";

// ─── Firebase Admin bootstrap (lazy, graceful) ────────────────────────────────
//
// Mirrors the Gemini/OpenWeather pattern used elsewhere in this backend:
// the feature silently disables itself when its credentials aren't
// configured, rather than crashing the server. See app.ts's boot log and
// the FIREBASE_* variables documented in .env.example.

let firebaseApp: App | null | undefined; // undefined = not attempted yet

/**
 * Normalizes Firebase service account private keys from environment variables.
 * Handles:
 * - Escaped "\n" literals converted into real newlines
 * - Stripping outer single or double quotes
 * - Stripping trailing commas/semicolons from JSON copy-pasting
 */
export function normalizePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let normalized = rawKey.trim();

  // Strip trailing commas, semicolons, or whitespace (e.g. from JSON copy-paste)
  normalized = normalized.replace(/[,;]+$/, "").trim();

  // Strip surrounding quotes if present
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  // Strip any trailing commas or semicolons that were inside outer quotes
  normalized = normalized.replace(/[,;]+$/, "").trim();

  // Convert literal escaped \n to real newlines
  normalized = normalized.replace(/\\n/g, "\n");

  return normalized.trim();
}

function getFirebaseApp(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    firebaseApp = null;
    return null;
  }

  // Fail clearly if private key is malformed (missing standard PEM header/footer)
  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    logger.error(
      "[push] Failed to initialize Firebase Admin SDK: FIREBASE_PRIVATE_KEY is malformed (missing PEM header/footer).",
    );
    firebaseApp = null;
    return null;
  }

  try {
    // Deferred require so environments without these credentials never
    // pay the cost of loading the firebase-admin SDK at all.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, cert, getApps } = require("firebase-admin/app");
    const existing: App[] = getApps();
    const app: App =
      existing.length > 0
        ? existing[0]
        : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    firebaseApp = app;
  } catch (err: any) {
    // Never dump raw private key or credential object in error logs
    logger.error(
      `[push] Failed to initialize Firebase Admin SDK: ${err?.message || "Invalid credential or initialization failure"}`,
    );
    firebaseApp = null;
  }

  return firebaseApp;
}

function getMessaging(): Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getMessaging: getMessagingFn } = require("firebase-admin/messaging");
  return getMessagingFn(app);
}

/** True when Firebase Admin credentials are present and usable. Exposed for
 *  the health check / boot log — never for gating whether createNotification
 *  writes a Notification record, which must always succeed independent of
 *  this. */
export function isPushConfigured(): boolean {
  return getFirebaseApp() !== null;
}

// ─── Android notification channel ─────────────────────────────────────────────
// Single stable channel id, created client-side once (see the Android push
// bridge). Kept here too so every outgoing message references the same id.
export const ANDROID_NOTIFICATION_CHANNEL_ID = "gg_notifications";

// ─── Device token registration (called by device.controller.ts) ──────────────

interface RegisterDeviceInput {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  platform?: DevicePlatform;
  appId?: string;
}

/**
 * Registers (or re-associates) a device token for a user.
 *
 * Upserts by `token`, not by (userId, token) — an FCM token is bound to one
 * physical app install, not one account. This is what makes account
 * switching on the same device correct: when User B logs in on a device
 * that previously belonged to User A, the *same* token is re-registered
 * against User B, atomically reassigning it and reactivating it in one
 * write. There is no window where a stale token could still be considered
 * User A's.
 */
export async function registerDeviceToken(input: RegisterDeviceInput): Promise<void> {
  await DeviceToken.findOneAndUpdate(
    { token: input.token },
    {
      $set: {
        userId: input.userId,
        platform: input.platform ?? "android",
        appId: input.appId,
        active: true,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

/**
 * Deactivates a device token for a specific user (ownership-scoped — a
 * user can only deactivate their own token, mirroring notification
 * ownership guards elsewhere in this backend). Called on logout so a
 * follow-up account switch on the same device doesn't keep delivering to
 * the account that just signed out in the moments before it re-registers.
 */
export async function deactivateDeviceToken(
  userId: mongoose.Types.ObjectId | string,
  token: string,
): Promise<void> {
  await DeviceToken.updateOne({ token, userId }, { $set: { active: false } });
}

// ─── Category preference mapping ──────────────────────────────────────────────
//
// The Notification model's `category` (complaints/assignments/authorities/
// platform/environmental/security/ai/system — the taxonomy notifications
// are actually generated with) and the Settings page's notification
// preference categories (system/complaints/reports/authority/environment/
// forecast/admin/security — the coarser taxonomy users toggle channels
// for) are deliberately different groupings that already existed before
// Phase 3. This maps the former onto the latter purely to decide whether
// a user's push channel is enabled for a given notification, without
// touching either taxonomy.
const PUSH_PREFERENCE_CATEGORY: Record<NotificationModelCategory, (typeof NOTIFICATION_CATEGORIES)[number]> = {
  complaints: "complaints",
  assignments: "authority",
  authorities: "authority",
  platform: "admin",
  environmental: "environment",
  security: "security",
  ai: "system",
  system: "system",
  support: "system",
};

async function isPushEnabledForUser(
  userId: mongoose.Types.ObjectId | string,
  category: NotificationModelCategory,
): Promise<boolean> {
  const prefCategory = PUSH_PREFERENCE_CATEGORY[category] ?? "system";
  const user = await User.findById(userId).select("preferences.notifications").lean();
  const channels = user?.preferences?.notifications?.[prefCategory];
  // No stored preference yet → fall back to the schema default (push:
  // true — see constants/notifications.ts) rather than silently skipping
  // delivery for every user who hasn't opened Settings yet.
  if (!channels || typeof channels.push !== "boolean") return true;
  return channels.push;
}

// ─── Payload shape ─────────────────────────────────────────────────────────────

export interface PushPayload {
  notificationId: string;
  type: NotificationModelCategory;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  /** App-relative deep-link route, e.g. "/citizen?tab=complaints&id=...". */
  route?: string;
  priority: NotificationPriority;
}

function toDataPayload(payload: PushPayload): Record<string, string> {
  // FCM data payloads must be flat string->string maps.
  const data: Record<string, string> = {
    notificationId: payload.notificationId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    priority: payload.priority,
    timestamp: new Date().toISOString(),
  };
  if (payload.entityType) data.entityType = payload.entityType;
  if (payload.entityId) data.entityId = payload.entityId;
  if (payload.route) data.route = payload.route;
  return data;
}

// ─── Sending ────────────────────────────────────────────────────────────────

async function sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const messaging = getMessaging();
  if (!messaging) return; // Push not configured — Notification record already saved; nothing more to do.

  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: toDataPayload(payload),
    android: {
      priority: "high",
      notification: {
        channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    if (response.failureCount > 0) {
      await cleanupInvalidTokens(tokens, response.responses);
    }
  } catch (err) {
    // Never propagate — the Notification record already succeeded.
    logger.error("[push] sendEachForMulticast failed:", err);
  }
}

/** Deactivates exactly the tokens FCM reported as invalid/unregistered,
 *  leaving every other token (this user's other devices, or other users
 *  in the same multicast batch) untouched. */
async function cleanupInvalidTokens(
  tokens: string[],
  responses: Array<{ success: boolean; error?: { code?: string } }>,
): Promise<void> {
  const invalid: string[] = [];
  responses.forEach((res, i) => {
    if (res.success) return;
    const code = res.error?.code ?? "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      invalid.push(tokens[i]);
    }
  });
  if (invalid.length === 0) return;
  try {
    await DeviceToken.updateMany({ token: { $in: invalid } }, { $set: { active: false } });
    logger.info(`[push] Deactivated ${invalid.length} stale device token(s)`);
  } catch (err) {
    logger.error("[push] Failed to deactivate stale tokens:", err);
  }
}

/** Sends `payload` to every active device belonging to `userId`, honoring
 *  that user's push preference for the notification's category. Never
 *  throws. */
export async function sendPushToUser(
  userId: mongoose.Types.ObjectId | string,
  payload: PushPayload,
): Promise<void> {
  try {
    if (!isPushConfigured()) return;
    if (!(await isPushEnabledForUser(userId, payload.type))) return;

    const devices = await DeviceToken.find({ userId, active: true }).select("token").lean();
    if (devices.length === 0) return;

    await sendToTokens(
      devices.map((d) => d.token),
      payload,
    );
  } catch (err) {
    logger.error("[push] sendPushToUser failed:", err);
  }
}

interface FanOutPushInput {
  recipients: Array<{ userId: mongoose.Types.ObjectId | string }>;
  payload: Omit<PushPayload, "notificationId"> & { notificationIdByUser: Map<string, string> };
}

/** Fan-out variant for notifyX() helpers that create one Notification
 *  document per recipient (see notification.service.ts#fanOutNotification).
 *  Each recipient's push payload carries *their own* notificationId so a
 *  tap deep-links to their own copy of the notification, not a shared one. */
export async function sendPushToUsers(input: FanOutPushInput): Promise<void> {
  if (!isPushConfigured()) return;

  await Promise.all(
    input.recipients.map(async ({ userId }) => {
      const notificationId = input.payload.notificationIdByUser.get(String(userId));
      if (!notificationId) return;
      await sendPushToUser(userId, { ...input.payload, notificationId });
    }),
  );
}
