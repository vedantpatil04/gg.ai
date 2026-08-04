import client from "./client";

export interface AccessibilityPreferences {
  highContrast: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  focusHighlight: boolean;
  screenReader: boolean;
}

export const accessibilityApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { accessibility: AccessibilityPreferences } }>("/settings/accessibility")
      .then((r) => r.data),

  update: (patch: Partial<AccessibilityPreferences>) =>
    client
      .patch<{ success: boolean; data: { accessibility: AccessibilityPreferences } }>("/settings/accessibility", patch)
      .then((r) => r.data),
};
