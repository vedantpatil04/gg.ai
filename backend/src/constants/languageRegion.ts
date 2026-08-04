/**
 * GreenGuard AI — Language & Region Constants (Backend)
 *
 * i18n Phase 1: all four languages are now fully supported.
 * The SUPPORTED_LANGUAGES array is the single gatekeeper for the backend
 * validator (settings.validator.ts) — adding a language here automatically
 * makes it accepted by every route that validates language preferences.
 *
 * Phase 2 onward: as new languages are added, append their BCP 47 primary
 * subtag here and create the corresponding translation files under
 * src/i18n/locales/{lang}/ on the frontend. No other backend files need
 * to change.
 */

// ─── Languages ────────────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = ["en", "hi", "kn", "mr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// ─── Date / time / number / units ────────────────────────────────────────────
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ["12h", "24h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const NUMBER_FORMATS = ["1,234.56", "1.234,56"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export const MEASUREMENT_UNITS = ["metric", "imperial"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

// A sentinel, not an IANA zone — "follow the browser/OS timezone" rather
// than a fixed one. isValidTimezone treats it as always valid.
export const AUTO_TIMEZONE = "auto";

// ─── Preferences shape ────────────────────────────────────────────────────────
export interface LanguageRegionPreferences {
  language: Language;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  numberFormat: NumberFormat;
  measurementUnit: MeasurementUnit;
}

export function defaultLanguageRegionPreferences(): LanguageRegionPreferences {
  return {
    language: "en",
    timezone: AUTO_TIMEZONE,
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    numberFormat: "1,234.56",
    measurementUnit: "metric",
  };
}

// ─── Timezone validation ──────────────────────────────────────────────────────
// Validated against the runtime's own IANA database (Node 18+) rather than
// a hand-maintained list, so it can never fall out of date and always
// agrees with whatever the frontend's Intl.supportedValuesOf("timeZone")
// offers in its dropdown.
export function isValidTimezone(tz: unknown): boolean {
  if (typeof tz !== "string") return false;
  if (tz === AUTO_TIMEZONE) return true;
  try {
    if (typeof (Intl as any).supportedValuesOf === "function") {
      return (Intl as any).supportedValuesOf("timeZone").includes(tz);
    }
  } catch {
    // fall through to the constructor-based check below
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
