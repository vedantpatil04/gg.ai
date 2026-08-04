import { body } from "express-validator";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "../constants/notifications";
import {
  SUPPORTED_LANGUAGES, DATE_FORMATS, TIME_FORMATS, NUMBER_FORMATS, MEASUREMENT_UNITS, isValidTimezone,
} from "../constants/languageRegion";
import {
  LANDING_PAGE_IDS, isValidWidgetArray, isValidPinnedCardArray,
} from "../constants/dashboard";
import {
  MAP_TYPES, MEASUREMENT_UNITS as MAP_MEASUREMENT_UNITS, ANIMATION_SPEEDS, isValidZoom,
} from "../constants/maps";
import { ACCESSIBILITY_FIELDS } from "../constants/accessibility";
import { PRIVACY_FIELDS } from "../constants/privacy";
import { City } from "../models/City";

// Enterprise Settings Phase 2 — Appearance only. Future phases (notifications,
// language, dashboard, maps, accessibility, privacy) get their own validators
// alongside this one rather than one growing "settings" validator.
export const updateAppearanceValidator = [
  body("theme")
    .trim()
    .isIn(["light", "dark", "system"])
    .withMessage("theme must be one of: light, dark, system"),
];

// Enterprise Settings Phase 3 — Notifications.
//
// The PATCH body is a *partial* map of category -> partial channel object,
// e.g. { "complaints": { "email": false } }. express-validator's declarative
// chains don't have a clean way to validate a dynamic-key nested shape like
// this, so it's one custom validator that walks the payload directly and
// rejects anything outside the known categories/channels/boolean values.
export const updateNotificationsValidator = [
  body().custom((payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of category preferences.");
    }

    for (const [category, channels] of Object.entries(payload as Record<string, unknown>)) {
      if (!NOTIFICATION_CATEGORIES.includes(category as (typeof NOTIFICATION_CATEGORIES)[number])) {
        throw new Error(`Unknown notification category: ${category}`);
      }
      if (typeof channels !== "object" || channels === null || Array.isArray(channels)) {
        throw new Error(`${category} must be an object of channel preferences.`);
      }
      for (const [channel, value] of Object.entries(channels as Record<string, unknown>)) {
        if (!NOTIFICATION_CHANNELS.includes(channel as (typeof NOTIFICATION_CHANNELS)[number])) {
          throw new Error(`Unknown notification channel: ${channel}`);
        }
        if (typeof value !== "boolean") {
          throw new Error(`${category}.${channel} must be a boolean.`);
        }
      }
    }

    return true;
  }),
];

// Enterprise Settings Phase 4 — Language & Region.
//
// PATCH body is a partial flat object of the 6 known fields, e.g.
// { "dateFormat": "MM/DD/YYYY" }. One custom validator (rather than six
// separate `body("x").optional()...` chains) so "reject unknown top-level
// properties" is enforced in the same place as each field's own rule.
const LANGUAGE_REGION_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  language: (v) => typeof v === "string" && SUPPORTED_LANGUAGES.includes(v as (typeof SUPPORTED_LANGUAGES)[number]),
  timezone: (v) => isValidTimezone(v),
  dateFormat: (v) => typeof v === "string" && DATE_FORMATS.includes(v as (typeof DATE_FORMATS)[number]),
  timeFormat: (v) => typeof v === "string" && TIME_FORMATS.includes(v as (typeof TIME_FORMATS)[number]),
  numberFormat: (v) => typeof v === "string" && NUMBER_FORMATS.includes(v as (typeof NUMBER_FORMATS)[number]),
  measurementUnit: (v) => typeof v === "string" && MEASUREMENT_UNITS.includes(v as (typeof MEASUREMENT_UNITS)[number]),
};

export const updateLanguageRegionValidator = [
  body().custom((payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of language & region preferences.");
    }
    if (Object.keys(payload as object).length === 0) {
      throw new Error("Request body must include at least one preference to update.");
    }

    for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
      const isValid = LANGUAGE_REGION_FIELD_VALIDATORS[field];
      if (!isValid) throw new Error(`Unknown language & region field: ${field}`);
      if (!isValid(value)) throw new Error(`Invalid value for ${field}.`);
    }

    return true;
  }),
];

// Enterprise Settings Phase 5 — Dashboard Preferences.
//
// `defaultCity` needs a real DB lookup (against the existing City
// collection, not a hand-kept id list), so this validator is async —
// express-validator awaits custom validators that return a Promise.
const DASHBOARD_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean | Promise<boolean>> = {
  defaultLandingPage: (v) => typeof v === "string" && LANDING_PAGE_IDS.includes(v as (typeof LANDING_PAGE_IDS)[number]),
  visibleWidgets: (v) => isValidWidgetArray(v),
  widgetOrder: (v) => isValidWidgetArray(v),
  pinnedCards: (v) => isValidPinnedCardArray(v),
  defaultCity: async (v) => {
    if (typeof v !== "string" || !v.trim()) return false;
    const exists = await City.exists({ cityId: v.toLowerCase(), isActive: true });
    return !!exists;
  },
};

export const updateDashboardValidator = [
  body().custom(async (payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of dashboard preferences.");
    }
    if (Object.keys(payload as object).length === 0) {
      throw new Error("Request body must include at least one preference to update.");
    }

    for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
      const isValid = DASHBOARD_FIELD_VALIDATORS[field];
      if (!isValid) throw new Error(`Unknown dashboard field: ${field}`);
      if (!(await isValid(value))) throw new Error(`Invalid value for ${field}.`);
    }

    return true;
  }),
];

// Enterprise Settings Phase 6 — Map Preferences.
const MAP_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  mapType: (v) => typeof v === "string" && MAP_TYPES.includes(v as (typeof MAP_TYPES)[number]),
  zoom: (v) => isValidZoom(v),
  trafficLayer: (v) => typeof v === "boolean",
  pollutionLayer: (v) => typeof v === "boolean",
  weatherLayer: (v) => typeof v === "boolean",
  measurementUnit: (v) => typeof v === "string" && MAP_MEASUREMENT_UNITS.includes(v as (typeof MAP_MEASUREMENT_UNITS)[number]),
  animationSpeed: (v) => typeof v === "string" && ANIMATION_SPEEDS.includes(v as (typeof ANIMATION_SPEEDS)[number]),
  rememberLastLocation: (v) => typeof v === "boolean",
};

export const updateMapsValidator = [
  body().custom((payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of map preferences.");
    }
    if (Object.keys(payload as object).length === 0) {
      throw new Error("Request body must include at least one preference to update.");
    }

    for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
      const isValid = MAP_FIELD_VALIDATORS[field];
      if (!isValid) throw new Error(`Unknown map preference field: ${field}`);
      if (!isValid(value)) throw new Error(`Invalid value for ${field}.`);
    }

    return true;
  }),
];

// Enterprise Settings Phase 7 — Accessibility. Every field is a plain
// boolean, so validation is simpler than the other sections: known field
// name + boolean value, nothing more.
export const updateAccessibilityValidator = [
  body().custom((payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of accessibility preferences.");
    }
    if (Object.keys(payload as object).length === 0) {
      throw new Error("Request body must include at least one preference to update.");
    }

    for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
      if (!ACCESSIBILITY_FIELDS.includes(field as (typeof ACCESSIBILITY_FIELDS)[number])) {
        throw new Error(`Unknown accessibility field: ${field}`);
      }
      if (typeof value !== "boolean") {
        throw new Error(`${field} must be a boolean.`);
      }
    }

    return true;
  }),
];

// Enterprise Settings Phase 8 — Privacy. Same shape as Accessibility's
// validator: plain booleans, known field names only.
export const updatePrivacyValidator = [
  body().custom((payload: unknown) => {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("Request body must be an object of privacy preferences.");
    }
    if (Object.keys(payload as object).length === 0) {
      throw new Error("Request body must include at least one preference to update.");
    }

    for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
      if (!PRIVACY_FIELDS.includes(field as (typeof PRIVACY_FIELDS)[number])) {
        throw new Error(`Unknown privacy field: ${field}`);
      }
      if (typeof value !== "boolean") {
        throw new Error(`${field} must be a boolean.`);
      }
    }

    return true;
  }),
];
