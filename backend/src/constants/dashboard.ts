// Enterprise Settings Phase 5 — Dashboard Preferences.
//
// This module only stores preferences. The dashboard route (src/routes/dashboard.tsx)
// currently renders its sections inline with no widget-id abstraction of its
// own, so the catalogs below are the ones introduced by this phase — a
// future phase that makes the dashboard preference-aware will read from
// these same catalogs rather than this module reading from the dashboard.

export const LANDING_PAGES = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard" },
  { id: "environment", path: "/environment", label: "Environmental Overview" },
  { id: "map", path: "/map", label: "Smart Map" },
  { id: "forecast", path: "/forecast", label: "Forecast" },
  { id: "citizen", path: "/citizen", label: "Citizen Hub" },
  { id: "sustainability", path: "/sustainability", label: "Sustainability" },
  { id: "copilot", path: "/copilot", label: "GreenGuard Intelligence Center" },
] as const;
export type LandingPageId = (typeof LANDING_PAGES)[number]["id"];
export const LANDING_PAGE_IDS: LandingPageId[] = LANDING_PAGES.map((p) => p.id);

export const DASHBOARD_WIDGETS = [
  { id: "aqi", label: "Air Quality Index" },
  { id: "weather", label: "Weather Summary" },
  { id: "trends", label: "Pollution Trends" },
  { id: "complaints", label: "Recent Complaints" },
  { id: "alerts", label: "Environmental Alerts" },
  { id: "reports", label: "Reports Overview" },
  { id: "quickActions", label: "Quick Actions" },
] as const;
export type WidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];
export const WIDGET_IDS: WidgetId[] = DASHBOARD_WIDGETS.map((w) => w.id);

// Pinned cards are a distinct (partially overlapping) catalog from the
// widget list above — spec's own DB example includes "forecast" as a
// pinned card even though it's not a dashboard widget, since pinning can
// also promote a quick-link to another section (Forecast, Smart Map).
export const PINNABLE_CARDS = [
  { id: "aqi", label: "AQI" },
  { id: "forecast", label: "Forecast" },
  { id: "map", label: "Smart Map" },
  { id: "complaints", label: "Complaint Status" },
  { id: "weather", label: "Weather" },
  { id: "reports", label: "Reports" },
] as const;
export type PinnableCardId = (typeof PINNABLE_CARDS)[number]["id"];
export const PINNABLE_CARD_IDS: PinnableCardId[] = PINNABLE_CARDS.map((c) => c.id);

// Matches the app's existing default city (CityProvider's CITIES[0] on the
// frontend, and the spec's own DB example) — not a new default invented by
// this phase.
export const DEFAULT_CITY_ID = "belagavi";

export interface DashboardPreferences {
  defaultLandingPage: LandingPageId;
  visibleWidgets: WidgetId[];
  widgetOrder: WidgetId[];
  defaultCity: string;
  pinnedCards: PinnableCardId[];
}

export function defaultDashboardPreferences(): DashboardPreferences {
  return {
    defaultLandingPage: "dashboard",
    visibleWidgets: [...WIDGET_IDS],
    widgetOrder: [...WIDGET_IDS],
    defaultCity: DEFAULT_CITY_ID,
    pinnedCards: ["aqi", "forecast"],
  };
}

function hasDuplicates(arr: string[]): boolean {
  return new Set(arr).size !== arr.length;
}

export function isValidWidgetArray(value: unknown): value is WidgetId[] {
  return Array.isArray(value)
    && value.every((v) => typeof v === "string" && WIDGET_IDS.includes(v as WidgetId))
    && !hasDuplicates(value);
}

export function isValidPinnedCardArray(value: unknown): value is PinnableCardId[] {
  return Array.isArray(value)
    && value.every((v) => typeof v === "string" && PINNABLE_CARD_IDS.includes(v as PinnableCardId))
    && !hasDuplicates(value);
}
