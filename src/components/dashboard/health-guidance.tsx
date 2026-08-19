/**
 * HealthGuidance — Section 5: Health & Outdoor Guidance
 *
 * Converts environmental telemetry into actionable, practical advice for citizens.
 * Displays suitability ratings for common daily activities (Walking, Running,
 * Cycling, Outdoor Work) and a concise, data-driven recommendation.
 */

import { Panel } from "@/components/ui-bits";
import { findAqiBand } from "@/lib/mock-data";
import { Footprints, Flame, Bike, Briefcase, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useReducedMotion, motion } from "framer-motion";
import { STAGGER, FADE_UP } from "@/lib/motion";

interface HealthGuidanceProps {
  aqi: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
}

type GuidanceLevel = "Good" | "Moderate" | "Caution" | "Limit" | "Acceptable" | "Avoid";

interface ActivityGuidance {
  name: string;
  level: GuidanceLevel;
  tone: "success" | "warning" | "destructive";
  icon: React.ComponentType<{ className?: string }>;
  note: string;
}

function computeGuidance(aqi: number): {
  activities: ActivityGuidance[];
  summary: string;
  overallTone: "success" | "warning" | "destructive";
} {
  const isGood = aqi <= 50;
  const isModerate = aqi > 50 && aqi <= 100;
  const isUnhealthySensitive = aqi > 100 && aqi <= 150;
  const isUnhealthy = aqi > 150;

  const activities: ActivityGuidance[] = [
    {
      name: "Walking",
      icon: Footprints,
      level: isGood ? "Good" : isModerate ? "Good" : isUnhealthySensitive ? "Moderate" : "Caution",
      tone: isGood || isModerate ? "success" : isUnhealthySensitive ? "warning" : "destructive",
      note: isGood || isModerate
        ? "Ideal for outdoor walks and commuting."
        : isUnhealthySensitive
          ? "Fine for short walks; take easy pace."
          : "Keep walks short; consider indoor tracks.",
    },
    {
      name: "Running",
      icon: Flame,
      level: isGood ? "Good" : isModerate ? "Moderate" : isUnhealthySensitive ? "Caution" : "Avoid",
      tone: isGood ? "success" : isModerate || isUnhealthySensitive ? "warning" : "destructive",
      note: isGood
        ? "Great conditions for cardio and distance runs."
        : isModerate
          ? "Suitable for regular runs; stay well hydrated."
          : isUnhealthySensitive
            ? "Shorten high-intensity outdoor workouts."
            : "Prefer indoor treadmill / gym training.",
    },
    {
      name: "Cycling",
      icon: Bike,
      level: isGood ? "Good" : isModerate ? "Moderate" : isUnhealthySensitive ? "Caution" : "Avoid",
      tone: isGood ? "success" : isModerate || isUnhealthySensitive ? "warning" : "destructive",
      note: isGood
        ? "Clean airflow along bike trails and roads."
        : isModerate
          ? "Good for commuting; avoid congested roads."
          : isUnhealthySensitive
            ? "Reduce prolonged cycling in heavy traffic."
            : "Postpone long outdoor rides if possible.",
    },
    {
      name: "Outdoor Work",
      icon: Briefcase,
      level: isGood ? "Good" : isModerate ? "Acceptable" : isUnhealthySensitive ? "Caution" : "Limit",
      tone: isGood || isModerate ? "success" : isUnhealthySensitive ? "warning" : "destructive",
      note: isGood || isModerate
        ? "Normal work schedule without extra restrictions."
        : isUnhealthySensitive
          ? "Take periodic rest breaks in shaded areas."
          : "Limit continuous heavy outdoor exertion.",
    },
  ];

  let summary = "Conditions are generally suitable for normal outdoor activity.";
  let overallTone: "success" | "warning" | "destructive" = "success";

  if (isGood) {
    summary =
      "Air quality is clean and healthy. Ideal conditions for all outdoor sports, exercise, and daily recreation.";
    overallTone = "success";
  } else if (isModerate) {
    summary =
      "Conditions are generally suitable for normal outdoor activity. Consider shorter exposure during periods of higher pollution.";
    overallTone = "success";
  } else if (isUnhealthySensitive) {
    summary =
      "Air quality is moderately elevated. Sensitive individuals (children, elderly, asthmatics) should limit strenuous outdoor exertion.";
    overallTone = "warning";
  } else {
    summary =
      "Pollutant levels are elevated. General public should reduce prolonged outdoor exertion and favor well-ventilated indoor spaces.";
    overallTone = "destructive";
  }

  return { activities, summary, overallTone };
}

const TONE_STYLES = {
  success: {
    badgeBg: "color-mix(in oklab, var(--color-success) 12%, transparent)",
    badgeBorder: "color-mix(in oklab, var(--color-success) 28%, transparent)",
    badgeColor: "var(--color-success)",
  },
  warning: {
    badgeBg: "color-mix(in oklab, var(--color-warning) 12%, transparent)",
    badgeBorder: "color-mix(in oklab, var(--color-warning) 28%, transparent)",
    badgeColor: "var(--color-warning)",
  },
  destructive: {
    badgeBg: "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
    badgeBorder: "color-mix(in oklab, var(--color-destructive) 28%, transparent)",
    badgeColor: "var(--color-destructive)",
  },
};

export function HealthGuidance({ aqi, temp: _temp, humidity: _humidity, windSpeed: _windSpeed }: HealthGuidanceProps) {
  const prefersReduced = useReducedMotion();
  const { activities, summary, overallTone } = computeGuidance(aqi);
  const band = findAqiBand(aqi);

  return (
    <Panel
      eyebrow="Actionable Advice"
      title="Health & Outdoor Guidance"
      surface="card"
      action={
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5"
          style={{
            background: TONE_STYLES[overallTone].badgeBg,
            borderColor: TONE_STYLES[overallTone].badgeBorder,
            color: TONE_STYLES[overallTone].badgeColor,
          }}
        >
          <span className="size-1.5 rounded-full" style={{ background: band.color }} />
          AQI {aqi} · {band.label}
        </span>
      }
    >
      <div className="space-y-4">
        {/* 2x2 Activity grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          variants={STAGGER(0.06)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {activities.map((act) => {
            const Icon = act.icon;
            const style = TONE_STYLES[act.tone];

            return (
              <motion.div
                key={act.name}
                variants={FADE_UP}
                className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-all flex items-start gap-3"
              >
                <div
                  className="size-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: style.badgeBg,
                    color: style.badgeColor,
                  }}
                >
                  <Icon className="size-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{act.name}</span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-md border tabular-nums shrink-0"
                      style={{
                        background: style.badgeBg,
                        borderColor: style.badgeBorder,
                        color: style.badgeColor,
                      }}
                    >
                      {act.level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.note}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Practical summary recommendation */}
        <div
          className="p-3.5 rounded-xl border flex items-start gap-3"
          style={{
            background: `color-mix(in oklab, ${TONE_STYLES[overallTone].badgeColor} 7%, transparent)`,
            borderColor: TONE_STYLES[overallTone].badgeBorder,
          }}
        >
          <div className="mt-0.5 shrink-0" style={{ color: TONE_STYLES[overallTone].badgeColor }}>
            {overallTone === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : overallTone === "warning" ? (
              <ShieldCheck className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </div>
          <div className="text-xs leading-relaxed text-foreground/90 font-medium">
            {summary}
          </div>
        </div>
      </div>
    </Panel>
  );
}
