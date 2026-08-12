/**
 * GreenGuard AI — i18n: TypeScript resource types
 *
 * Augments i18next's `CustomTypeOptions` so every `t("key")` call is
 * type-checked against the real English JSON files (source of truth).
 *
 * Import this file exactly once — `src/i18n/index.ts` does so via:
 *   import "./types";
 *
 * After that, type inference flows automatically to any `useTranslation`
 * or `t` call in the rest of the codebase.
 *
 * Usage examples:
 *   const { t } = useTranslation("settings");
 *   t("sections.appearance");   // ✓ type-safe
 *   t("sections.nonexistent");  // ✗ TypeScript error
 */

import type enCommon         from "./locales/en/common.json";
import type enNavigation     from "./locales/en/navigation.json";
import type enSettings       from "./locales/en/settings.json";
import type enDashboard      from "./locales/en/dashboard.json";
import type enAuthentication from "./locales/en/authentication.json";
import type enCitizen        from "./locales/en/citizen.json";
import type enAuthority      from "./locales/en/authority.json";
import type enAdministrator  from "./locales/en/administrator.json";
import type enErrors         from "./locales/en/errors.json";
import type enValidation     from "./locales/en/validation.json";
import type enNotifications  from "./locales/en/notifications.json";

export interface I18nResources {
  common:         typeof enCommon;
  navigation:     typeof enNavigation;
  settings:       typeof enSettings;
  dashboard:      typeof enDashboard;
  authentication: typeof enAuthentication;
  citizen:        typeof enCitizen;
  authority:      typeof enAuthority;
  administrator:  typeof enAdministrator;
  errors:         typeof enErrors;
  validation:     typeof enValidation;
  notifications:  typeof enNotifications;
}

// Augment the i18next module — activates TypeScript checking for all t() calls.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS:  "common";
    resources:  I18nResources;
  }
}
