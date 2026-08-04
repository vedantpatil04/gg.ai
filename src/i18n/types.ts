/**
 * GreenGuard AI — i18n Phase 1: TypeScript Resource Types
 *
 * Augments the i18next `CustomTypeOptions` interface so every call to
 * `t("key")`, `useTranslation("ns")`, etc., is fully type-checked against
 * the actual JSON translation files.
 *
 * HOW IT WORKS:
 *   i18next reads `CustomTypeOptions.resources` to infer key paths.
 *   We point it at the English (en) locale files — the source of truth.
 *   Non-English locales are structurally identical, so one type covers all.
 *
 * USAGE:
 *   import type { TFunction } from "i18next";
 *   const t: TFunction<"settings"> = useTranslation("settings").t;
 *   t("sections.appearance"); // ✓ typed
 *   t("sections.typo");       // ✗ TS error
 */

import type enCommon from "./locales/en/common.json";
import type enNavigation from "./locales/en/navigation.json";
import type enSettings from "./locales/en/settings.json";
import type enDashboard from "./locales/en/dashboard.json";
import type enAuthentication from "./locales/en/authentication.json";
import type enCitizen from "./locales/en/citizen.json";
import type enAuthority from "./locales/en/authority.json";
import type enAdministrator from "./locales/en/administrator.json";
import type enErrors from "./locales/en/errors.json";
import type enValidation from "./locales/en/validation.json";
import type enNotifications from "./locales/en/notifications.json";

export interface I18nResources {
  common: typeof enCommon;
  navigation: typeof enNavigation;
  settings: typeof enSettings;
  dashboard: typeof enDashboard;
  authentication: typeof enAuthentication;
  citizen: typeof enCitizen;
  authority: typeof enAuthority;
  administrator: typeof enAdministrator;
  errors: typeof enErrors;
  validation: typeof enValidation;
  notifications: typeof enNotifications;
}

// Augment the i18next module — activates type-checking for all t() calls.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: I18nResources;
  }
}
