import client from "./client";

export interface PrivacyPreferences {
  anonymousAnalytics: boolean;
  personalizedRecommendations: boolean;
}

export const privacyApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { privacy: PrivacyPreferences } }>("/settings/privacy")
      .then((r) => r.data),

  update: (patch: Partial<PrivacyPreferences>) =>
    client
      .patch<{ success: boolean; data: { privacy: PrivacyPreferences } }>("/settings/privacy", patch)
      .then((r) => r.data),
};
