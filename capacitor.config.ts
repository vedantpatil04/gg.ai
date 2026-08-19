import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vedant.greenguard',
  appName: 'GreenGuard AI',

  // Required even when using server.url
  webDir: 'dist',

  server: {
    url: 'https://gg-ai-system.vercel.app',
    cleartext: false,
    allowNavigation: [
      'gg-ai-system.vercel.app',
      '*.vercel.app',
      'gg-ai-11ja.onrender.com',
      '*.onrender.com',
    ],
  },

  plugins: {
    PushNotifications: {
      // Phase 3: while the app is in the foreground, an incoming FCM
      // "notification" payload would otherwise also be manually rendered
      // as a system-tray notification by the plugin itself (Android
      // doesn't auto-display those while foregrounded). Left empty here
      // so foreground pushes only fire the `pushNotificationReceived` JS
      // event (see src/lib/push/push-notifications.ts, which refreshes
      // the existing in-app Notification Center instead) -- avoiding a
      // duplicate native notification + in-app entry for the same event.
      // Background/terminated system-tray display is unaffected: that's
      // handled by Android/Play Services directly, before any app code
      // runs, and always happens for a "notification" payload.
      presentationOptions: [],
    },
  },
};

export default config;