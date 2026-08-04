// Enterprise Settings Phase 7 — Accessibility.
//
// Preferences-only, same as every other Enterprise Settings section — no
// application-wide behavior actually changes yet (e.g. Reduce Motion isn't
// wired into the rest of the app). A future phase reads these values, the
// same relationship Notifications/Dashboard/Maps already have with their
// own future consumers.

export const ACCESSIBILITY_FIELDS = [
  "highContrast",
  "reduceMotion",
  "largeText",
  "keyboardNavigation",
  "focusHighlight",
  "screenReader",
] as const;
export type AccessibilityField = (typeof ACCESSIBILITY_FIELDS)[number];

export type AccessibilityPreferences = Record<AccessibilityField, boolean>;

export function defaultAccessibilityPreferences(): AccessibilityPreferences {
  return {
    highContrast: false,
    reduceMotion: false,
    largeText: false,
    keyboardNavigation: true,
    focusHighlight: true,
    screenReader: false,
  };
}
