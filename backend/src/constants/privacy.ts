// Enterprise Settings Phase 8 — Privacy.
//
// User preference controls only — no account/security features live here
// (delete account, profile visibility, data export, GDPR requests, cookie
// banner, email privacy are all explicitly out of scope; see the Future
// Features placeholders in the frontend panel).

export const PRIVACY_FIELDS = ["anonymousAnalytics", "personalizedRecommendations"] as const;
export type PrivacyField = (typeof PRIVACY_FIELDS)[number];

export type PrivacyPreferences = Record<PrivacyField, boolean>;

export function defaultPrivacyPreferences(): PrivacyPreferences {
  return {
    anonymousAnalytics: true,
    personalizedRecommendations: true,
  };
}
