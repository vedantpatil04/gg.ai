/**
 * Phase 3 — FCM push notification bridge (Android/Capacitor side).
 *
 * This module owns everything Capacitor/FCM-specific: the native
 * permission bridge (reusing the existing Phase 1 PermissionManager — see
 * NotificationPermissionPlugin.java), @capacitor/push-notifications
 * registration, the single Android notification channel, and translating
 * native events into plain callbacks. It deliberately knows nothing about
 * React, react-query, or the router — see
 * src/components/push/push-notifications-bridge.tsx for that wiring.
 *
 * Runs as a no-op everywhere except the native Android app: on the plain
 * Vercel-hosted browser experience, `isNativeAndroid()` is false and every
 * exported function returns immediately, so this can be safely imported
 * from shared code without touching browser behavior.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";
import { deviceApi } from "../api/device.api";

// ─── Native permission bridge (see NotificationPermissionPlugin.java) ────────

interface NotificationPermissionResult {
  status: string;
  granted: boolean;
}

interface NotificationPermissionBridgePlugin {
  getStatus(): Promise<NotificationPermissionResult>;
  requestPermission(): Promise<NotificationPermissionResult>;
  openAppSettings(): Promise<void>;
}

const NotificationPermissionBridge = registerPlugin<NotificationPermissionBridgePlugin>(
  "GreenGuardNotificationPermission",
);

// ─── Constants ─────────────────────────────────────────────────────────────────

// Must match ANDROID_NOTIFICATION_CHANNEL_ID in backend/src/services/push.service.ts
// and the default_notification_channel_id meta-data in AndroidManifest.xml.
export const ANDROID_NOTIFICATION_CHANNEL_ID = "gg_notifications";

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

// ─── Android notification channel ─────────────────────────────────────────────

let channelEnsured = false;

/** Creates the single stable notification channel used for every
 *  GreenGuard push notification. Idempotent — Android no-ops recreating a
 *  channel with the same id, and this additionally only runs once per app
 *  session. Deliberately one channel, not one per category (see Phase 3
 *  spec: "do not create dozens of channels"). */
async function ensureAndroidChannel(): Promise<void> {
  if (channelEnsured || !isNativeAndroid()) return;
  channelEnsured = true;
  try {
    await PushNotifications.createChannel({
      id: ANDROID_NOTIFICATION_CHANNEL_ID,
      name: "GreenGuard notifications",
      description: "Complaint updates, assignments, and platform alerts",
      importance: 4, // IMPORTANCE_HIGH — heads-up banner
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
    });
  } catch (err) {
    // Only fails on devices without notification support at all (e.g. some
    // emulator images without Play Services) — non-fatal either way.
    console.warn("[push] createChannel failed", err);
  }
}

// ─── Event wiring ──────────────────────────────────────────────────────────────
//
// Listeners are attached at most once for the lifetime of the WebView (an
// app relaunch, not a login/logout). `activeHandlers` is reassigned on
// every startPushNotifications() call so the *current* user's callbacks
// are always the ones invoked — this is what makes account switching on
// the same device route foreground/tap events to the newly logged-in
// user's react-query cache and router instead of stale closures from the
// previous session.

export interface PushEventHandlers {
  /** Foreground delivery — no system notification is shown (see
   *  capacitor.config.ts's empty presentationOptions), so the only thing
   *  to do is refresh the existing in-app Notification Center. */
  onForegroundNotification: () => void;
  /** Notification tap — background or terminated-app launch. `route` is
   *  the same app-relative path already used by the in-app Notification
   *  Center's own click handler. */
  onNotificationTap: (route: string) => void;
}

let activeHandlers: PushEventHandlers | null = null;
let listenersAttached = false;
let lastKnownToken: string | null = null;

function attachListenersOnce(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener("registration", (token: Token) => {
    lastKnownToken = token.value;
    deviceApi.register(token.value, "android", "com.vedant.greenguard").catch((err) => {
      console.error("[push] Failed to register device token with backend", err);
    });
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[push] FCM registration error", err);
  });

  PushNotifications.addListener("pushNotificationReceived", () => {
    activeHandlers?.onForegroundNotification();
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
    const route = action.notification?.data?.route as string | undefined;
    if (route) activeHandlers?.onNotificationTap(route);
  });
}

/**
 * Requests notification permission (via the existing PermissionManager,
 * not the plugin's own prompt — see NotificationPermissionPlugin.java) and
 * registers this device for push. Safe to call every time a user
 * authenticates; a denied permission just means no system-tray display —
 * it does not throw, and the in-app Notification Center is unaffected
 * either way.
 *
 * Listener attachment is intentionally deferred until this is first
 * called (i.e. until a user is authenticated) rather than happening
 * unconditionally at app boot. That's what makes the "notification tapped
 * while logged out" case (Phase 3 spec section 17) come out correct
 * without any extra bookkeeping: Capacitor's native plugin layer retains
 * a fired event (see @capacitor/push-notifications' Android
 * `notifyListeners(..., retainUntilConsumed=true)`) until *some* JS
 * listener is registered for it — including a listener registered only
 * after the user finishes logging in. So a background/terminated-app tap
 * that happens while unauthenticated simply sits retained natively; the
 * moment startPushNotifications() runs post-login and attaches the
 * listener for the first time, the retained tap replays immediately and
 * routes to the correct destination. Nothing is ever silently dropped.
 */
export async function startPushNotifications(handlers: PushEventHandlers): Promise<void> {
  activeHandlers = handlers;
  if (!isNativeAndroid()) return;

  attachListenersOnce();
  await ensureAndroidChannel();

  try {
    const result = await NotificationPermissionBridge.requestPermission();
    if (!result.granted) return;
    // register() only fetches the token — it does not itself prompt for
    // permission, which is why the request above happens first.
    await PushNotifications.register();
  } catch (err) {
    console.error("[push] startPushNotifications failed", err);
  }
}

/** Called on logout. Deactivates this device's token server-side so a
 *  different account logging in on the same device isn't briefly still
 *  reachable as "User A" in the moment before it re-registers — see
 *  Phase 3 spec section 22. Native listeners stay attached (harmless —
 *  they just won't have an authenticated `activeHandlers` to call into
 *  until the next login), so a retained tap from before logout is still
 *  correctly captured rather than needing to be re-registered. */
export function stopPushNotifications(): void {
  activeHandlers = null;
  if (!isNativeAndroid() || !lastKnownToken) return;
  deviceApi.deactivate(lastKnownToken).catch((err) => {
    console.error("[push] Failed to deactivate device token on logout", err);
  });
}
