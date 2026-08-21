/**
 * GreenGuard AI — Landing Navigation Data
 *
 * Phase 1: Enterprise Foundation & Hero Experience
 *
 * Single source of truth for the enterprise navigation. Both the desktop
 * mega menu and the mobile drawer read from these arrays, so a route never
 * has to be added or renamed in two places.
 *
 * Every entry points at a real, existing route — there are no placeholder
 * links or invented pages.
 */

import type { ComponentType } from "react";
import { Activity, Map, CloudRain, Brain, MessageSquare, Leaf, FileBarChart, GitBranch } from "lucide-react";

/** Matches the icon-prop convention already used across the app (e.g. `app-layout.tsx`). */
export type IconComponent = ComponentType<{ className?: string }>;

/** Every route this nav data can point at — kept as a literal union (not `string`) so `<Link to>` stays type-checked. */
export type LandingRoute =
  | "/environment"
  | "/map"
  | "/forecast"
  | "/intelligence"
  | "/citizen"
  | "/sustainability"
  | "/reports"
  | "/simulator"
  | "/about"
  | "/docs"
  | "/contact"
  | "/login"
  | "/dashboard";

export interface PlatformNavItem {
  to: LandingRoute;
  label: string;
  description: string;
  icon: IconComponent;
}

/** The "Platform" mega menu — every core module, in the order a user moves through them. */
export const PLATFORM_ITEMS: readonly PlatformNavItem[] = [
  {
    to: "/environment",
    label: "Environmental Overview",
    description: "Live air, water and climate readings for every monitored zone.",
    icon: Activity,
  },
  {
    to: "/map",
    label: "Smart Map",
    description: "Geospatial intelligence — heatmaps, hotspots and asset drilldown.",
    icon: Map,
  },
  {
    to: "/forecast",
    label: "Forecast Intelligence",
    description: "72-hour predictive horizon for AQI, weather and risk.",
    icon: CloudRain,
  },
  {
    to: "/intelligence",
    label: "GreenGuard Intelligence Center",
    description: "Ask anything about your environment. Get cited, actionable answers.",
    icon: Brain,
  },
  {
    to: "/citizen",
    label: "Citizen Portal",
    description: "Crowdsourced ground-truth — verify, triage and resolve reports.",
    icon: MessageSquare,
  },
  {
    to: "/sustainability",
    label: "Sustainability",
    description: "Carbon, ESG and SDG metrics across your city's operations.",
    icon: Leaf,
  },
  {
    to: "/reports",
    label: "Green Actions",
    description: "Turn environmental intelligence into coordinated municipal action.",
    icon: FileBarChart,
  },
  {
    to: "/simulator",
    label: "Policy Simulator",
    description: "Model the environmental impact of a decision before you commit to it.",
    icon: GitBranch,
  },
] as const;

export interface SimpleNavItem {
  to: LandingRoute;
  label: string;
}

/** Top-level links shown next to the Platform mega menu, on desktop and in the mobile drawer. */
export const PRIMARY_LINKS: readonly SimpleNavItem[] = [
  { to: "/about", label: "About" },
  { to: "/docs", label: "Documentation" },
  { to: "/contact", label: "Contact" },
] as const;

export const SIGN_IN_LINK: SimpleNavItem = { to: "/login", label: "Sign in" };
export const LAUNCH_LINK: SimpleNavItem = { to: "/dashboard", label: "Launch Platform" };
