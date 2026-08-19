/**
 * Phase 3 — auth-aware wiring for FCM push notifications.
 *
 * Mounted once at the app root (see src/routes/__root.tsx). Everything
 * Capacitor/FCM-specific lives in src/lib/push/push-notifications.ts; this
 * component only supplies the three things that module deliberately
 * doesn't know about:
 *  - the current user (to start/stop registration as they log in/out)
 *  - react-query's cache (to refresh the existing Notification Center on
 *    foreground delivery)
 *  - the router (to navigate on notification tap)
 *
 * Renders nothing.
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { notificationKeys } from "@/hooks/use-notifications";
import { startPushNotifications, stopPushNotifications, isNativeAndroid } from "@/lib/push/push-notifications";

export function PushNotificationsBridge() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNativeAndroid()) return;

    if (isAuthenticated && user) {
      startPushNotifications({
        onForegroundNotification: () => {
          // No native notification is shown for a foreground push (see
          // capacitor.config.ts) — just refresh the existing Notification
          // Center's unread count and list so the new one shows up.
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onNotificationTap: (route) => {
          navigate({ to: route as Parameters<typeof navigate>[0]["to"] });
        },
      });
    } else {
      stopPushNotifications();
    }
    // Re-run on user id change too, not just the boolean, so switching
    // accounts on the same device re-registers under the new user rather
    // than keeping the previous session's device-token association.
  }, [isAuthenticated, user?._id, navigate, queryClient]);

  return null;
}
