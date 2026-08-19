// Enterprise Settings Phase 3 — Notification Preferences.
//
// Single source of truth for the known categories/channels, so the model
// schema, the request validator, and the controller's default/merge logic
// can never drift out of sync with each other.

export const NOTIFICATION_CATEGORIES = [
  "system",
  "complaints",
  "reports",
  "authority",
  "environment",
  "forecast",
  "admin",
  "security",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CHANNELS = ["inApp", "email", "push"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export type NotificationPreferences = Record<NotificationCategory, NotificationChannels>;

// In-App, Email, and Push (Phase 3 — Firebase Cloud Messaging) all default
// on. Push previously defaulted off as a placeholder for a channel that
// didn't exist yet; now that push.service.ts actually delivers it, a
// freshly-created user gets the same "everything on, opt out later"
// behavior as the other two channels instead of silently never receiving
// pushes until they discover a settings toggle.
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannels = {
  inApp: true,
  email: true,
  push: true,
};

export function defaultNotificationPreferences(): NotificationPreferences {
  return NOTIFICATION_CATEGORIES.reduce((acc, category) => {
    acc[category] = { ...DEFAULT_NOTIFICATION_CHANNELS };
    return acc;
  }, {} as NotificationPreferences);
}
