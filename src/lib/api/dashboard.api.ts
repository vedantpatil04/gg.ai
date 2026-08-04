import client from "./client";

export const LANDING_PAGES = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard" },
  { id: "environment", path: "/environment", label: "Environmental Overview" },
  { id: "map", path: "/map", label: "Smart Map" },
  { id: "forecast", path: "/forecast", label: "Forecast" },
  { id: "citizen", path: "/citizen", label: "Citizen Hub" },
  { id: "sustainability", path: "/sustainability", label: "Sustainability" },
  { id: "copilot", path: "/copilot", label: "AI Copilot" },
] as const;
export type LandingPageId = (typeof LANDING_PAGES)[number]["id"];

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

export const PINNABLE_CARDS = [
  { id: "aqi", label: "AQI" },
  { id: "forecast", label: "Forecast" },
  { id: "map", label: "Smart Map" },
  { id: "complaints", label: "Complaint Status" },
  { id: "weather", label: "Weather" },
  { id: "reports", label: "Reports" },
] as const;
export type PinnableCardId = (typeof PINNABLE_CARDS)[number]["id"];

export interface DashboardPreferences {
  defaultLandingPage: LandingPageId;
  visibleWidgets: WidgetId[];
  widgetOrder: WidgetId[];
  defaultCity: string;
  pinnedCards: PinnableCardId[];
}

export const dashboardApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { dashboard: DashboardPreferences } }>("/settings/dashboard")
      .then((r) => r.data),

  // Partial update — only the included fields are touched server-side.
  // Array fields (visibleWidgets, widgetOrder, pinnedCards) are always sent
  // in full, since they're whole-value replacements, not per-item patches.
  update: (patch: Partial<DashboardPreferences>) =>
    client
      .patch<{ success: boolean; data: { dashboard: DashboardPreferences } }>("/settings/dashboard", patch)
      .then((r) => r.data),

  restore: () =>
    client
      .post<{ success: boolean; data: { dashboard: DashboardPreferences } }>("/settings/dashboard/restore")
      .then((r) => r.data),
};
