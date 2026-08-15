/**
 * GreenGuard AI — i18n: Configuration constants
 *
 * Single source of truth imported everywhere i18n metadata is needed.
 * Never hard-code language codes or namespace strings elsewhere.
 */

// ─── Supported languages ──────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = ["en", "hi", "kn", "mr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Human-readable display names for the language picker. */
export const LANGUAGE_NAMES: Record<
  Language,
  { native: string; english: string; locale: string }
> = {
  en: { native: "English",  english: "English", locale: "en-IN" },
  hi: { native: "हिन्दी",  english: "Hindi",   locale: "hi-IN" },
  kn: { native: "ಕನ್ನಡ",   english: "Kannada", locale: "kn-IN" },
  mr: { native: "मराठी",   english: "Marathi", locale: "mr-IN" },
};

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_LANGUAGE: Language  = "en";
export const FALLBACK_LANGUAGE: Language = "en";

// ─── Translation namespaces ───────────────────────────────────────────────────
// Each maps to one JSON file per language:  src/i18n/locales/{lang}/{ns}.json
export const NAMESPACES = [
  "common",
  "navigation",
  "settings",
  "dashboard",
  "authentication",
  "citizen",
  "authority",
  "administrator",
  "errors",
  "validation",
  "notifications",
  "forecast",
  "copilot",
  "map",
  "reports",
  "simulator",
  "sustainability",
  "profile",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

// ─── Storage ──────────────────────────────────────────────────────────────────
/** localStorage key used to persist the active language between sessions. */
export const LANGUAGE_STORAGE_KEY = "gg-language";
