/**
 * MyEnvironment — Section 9: My Environment
 *
 * Personalized citizen environmental home panel.
 * Displays:
 *   - My area (city, country)
 *   - Current AQI (value + classification)
 *   - Outdoor suitability rating
 *   - Active alerts count
 *   - Citizen's reported issues count (sourced from authentic complaint data)
 *
 * Provides a direct link to /citizen for managing local issues.
 */

import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/ui-bits";
import { findAqiBand } from "@/lib/mock-data";
import {
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  UserCheck,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useReducedMotion, motion } from "framer-motion";
import { STAGGER, FADE_UP } from "@/lib/motion";

interface MyEnvironmentProps {
  cityName: string;
  country: string;
  aqi: number;
  activeAlertsCount: number;
  reportedIssuesCount: number;
  userName?: string;
}

export function MyEnvironment({
  cityName,
  country,
  aqi,
  activeAlertsCount,
  reportedIssuesCount,
  userName,
}: MyEnvironmentProps) {
  const prefersReduced = useReducedMotion();
  const band = findAqiBand(aqi);

  const outdoorSuitability =
    aqi <= 50
      ? { label: "Optimal", tone: "var(--color-success)" }
      : aqi <= 100
        ? { label: "Good", tone: "var(--color-success)" }
        : aqi <= 150
          ? { label: "Moderate", tone: "var(--color-warning)" }
          : { label: "Caution", tone: "var(--color-destructive)" };

  const cards = [
    {
      id: "area",
      label: "My Area",
      value: cityName,
      subvalue: country,
      icon: MapPin,
      tone: "var(--color-primary)",
      link: "/map",
    },
    {
      id: "aqi",
      label: "Current AQI",
      value: String(aqi),
      subvalue: band.label,
      icon: Activity,
      tone: band.color,
      link: "/environment",
    },
    {
      id: "suitability",
      label: "Outdoor Suitability",
      value: outdoorSuitability.label,
      subvalue: "Daily activities",
      icon: ShieldCheck,
      tone: outdoorSuitability.tone,
      link: "#",
    },
    {
      id: "alerts",
      label: "Active Alerts",
      value: String(activeAlertsCount),
      subvalue: activeAlertsCount === 0 ? "Normal threshold" : "Advisories active",
      icon: ShieldAlert,
      tone: activeAlertsCount > 0 ? "var(--color-warning)" : "var(--color-success)",
      link: "#",
    },
    {
      id: "reports",
      label: "Reported Issues",
      value: String(reportedIssuesCount),
      subvalue: reportedIssuesCount === 0 ? "No active reports" : "Community issues",
      icon: Megaphone,
      tone: "var(--color-info)",
      link: "/citizen",
    },
  ];

  return (
    <Panel
      eyebrow="Personal Summary"
      title="My Environment"
      surface="card"
      action={
        <Link
          to="/citizen"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>Manage reports</span>
          <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* User personalized greeting strip */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCheck className="size-3.5 text-primary shrink-0" />
            <span>
              Citizen Profile:{" "}
              <strong className="text-foreground font-medium">
                {userName || "Authenticated Citizen"}
              </strong>
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Telemetry synchronized for {cityName}
          </span>
        </div>

        {/* Compact 5-tile grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={STAGGER(0.05)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            const isClickable = card.link !== "#";

            const content = (
              <motion.div
                key={card.id}
                variants={FADE_UP}
                className="p-3.5 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/30 transition-all flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    {card.label}
                  </span>
                  <div
                    className="size-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${card.tone} 15%, transparent)`,
                      color: card.tone,
                    }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                </div>

                <div className="mt-3">
                  <div
                    className="text-xl font-bold tracking-tight truncate tabular-nums"
                    style={{ color: card.id === "aqi" ? card.tone : "inherit" }}
                  >
                    {card.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {card.subvalue}
                  </div>
                </div>
              </motion.div>
            );

            return isClickable ? (
              <Link key={card.id} to={card.link} className="block h-full focus-visible:outline-none">
                {content}
              </Link>
            ) : (
              <div key={card.id} className="h-full">
                {content}
              </div>
            );
          })}
        </motion.div>
      </div>
    </Panel>
  );
}
