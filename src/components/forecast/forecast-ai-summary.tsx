/**
 * ForecastAISummary — Phase 3
 *
 * Premium AI forecast summary panel with:
 *   - Animated typing reveal of the forecast narrative
 *   - Health + outdoor recommendations
 *   - Pollution trend explanation
 *   - Best outdoor activity time
 *   - Expandable details
 *
 * All text generated deterministically from city data — no external AI call.
 * Typing animation uses CSS, respects prefers-reduced-motion.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles, ChevronDown, ChevronUp,
  Activity, PersonStanding, Clock, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import type { City } from "@/lib/mock-data";
import { aqiBand } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { FADE_UP, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Deterministic text generation ───────────────────────────────────────────

function buildForecastNarrative(city: City): {
  summary:     string;
  health:      string;
  outdoor:     string;
  pollution:   string;
  bestTime:    string;
  trend:       "improving" | "worsening" | "stable";
} {
  const band = aqiBand(city.aqi);
  const hot  = city.temp > 30;
  const wet  = city.humidity > 70;

  const trend: "improving" | "worsening" | "stable" =
    city.aqi > 150 ? "worsening" : city.aqi < 60 ? "improving" : "stable";

  const summary =
    city.aqi > 200
      ? `${city.name} is currently experiencing hazardous air quality. PM2.5 at ${city.pm25} µg/m³ — significantly above the WHO 24h limit. Conditions are expected to remain elevated through the next 24 hours due to stagnant atmospheric pressure.`
      : city.aqi > 100
        ? `Air quality in ${city.name} is ${band.label.toLowerCase()} today. PM2.5 readings of ${city.pm25} µg/m³ are driving the index, combined with NO₂ of ${city.no2} ppb from traffic. ${hot ? "High temperatures are accelerating ground-level ozone formation." : "Conditions are expected to improve after sunset."}`
        : `${city.name} is enjoying ${band.label.toLowerCase()} air quality today. Conditions are forecast to remain stable over the next 48 hours. ${wet ? "Elevated humidity may cause minor discomfort but has a mild scrubbing effect on particulates." : "Low humidity and moderate winds support good dispersion."}`;

  const health =
    city.aqi > 200
      ? "Everyone should avoid outdoor activities. Seal windows, run air purifiers indoors, and wear N95 masks if going outside is unavoidable."
      : city.aqi > 150
        ? "Sensitive groups — children, elderly, and those with respiratory conditions — should stay indoors. Others should limit strenuous activity."
        : city.aqi > 100
          ? "Sensitive individuals should reduce prolonged outdoor exertion. General population can proceed with normal activities."
          : "Air quality poses minimal health risk. Ideal for outdoor activities including exercise and sports.";

  const outdoor =
    city.aqi > 150
      ? "Outdoor exercise is not recommended today."
      : city.aqi > 80
        ? `Light walks are acceptable. Avoid high-intensity exercise${hot ? " especially between 12:00–16:00" : ""}.`
        : "Excellent day for outdoor activities including running, cycling, and sports.";

  const pollution =
    city.pm25 > 80
      ? `PM2.5 is the dominant pollutant at ${city.pm25} µg/m³, primarily from industrial combustion and vehicular emissions. Stagnant overnight air has allowed accumulation.`
      : city.no2 > 50
        ? `Nitrogen dioxide (NO₂) at ${city.no2} ppb is elevated — a signature of heavy traffic congestion. Peak NO₂ typically occurs 08:00–10:00 and 18:00–20:00.`
        : `Pollutant levels remain within acceptable ranges. PM2.5 at ${city.pm25} µg/m³ and O₃ at ${city.o3} ppb are below WHO advisory thresholds.`;

  const bestTime =
    city.aqi > 150
      ? "Early morning (05:00–07:00) offers the lowest pollution window today."
      : city.aqi > 80
        ? "Morning hours (06:00–10:00) have the cleanest air. Avoid 14:00–18:00 when ozone peaks."
        : "Conditions are good throughout the day. Morning and evening are typically best for exercise.";

  return { summary, health, outdoor, pollution, bestTime, trend };
}

// ─── Typing reveal hook ───────────────────────────────────────────────────────

function useTypeReveal(text: string, active: boolean, speed = 16): string {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed("");
    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i < text.length) timerRef.current = setTimeout(tick, speed);
    };
    timerRef.current = setTimeout(tick, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, active, speed]);

  return displayed;
}

// ─── Trend indicator ──────────────────────────────────────────────────────────

function TrendChip({ trend }: { trend: "improving" | "worsening" | "stable" }) {
  const map = {
    improving: { icon: TrendingDown, label: "Improving",  color: "var(--color-success)"     },
    worsening: { icon: TrendingUp,   label: "Worsening",  color: "var(--color-destructive)"  },
    stable:    { icon: Minus,        label: "Stable",     color: "var(--color-muted-foreground)" },
  };
  const { icon: Icon, label, color } = map[trend];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
      }}
    >
      <Icon className="size-2.5" />
      {label}
    </span>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ForecastAISummary({ city }: { city: City }) {
  const [expanded, setExpanded] = useState(false);
  const prefersReduced = useReducedMotion() ?? false;
  const { summary, health, outdoor, pollution, bestTime, trend } =
    buildForecastNarrative(city);

  const typedSummary = useTypeReveal(summary, !prefersReduced, 14);

  const details = [
    { icon: Activity,       label: "Health advisory",   text: health    },
    { icon: PersonStanding, label: "Outdoor guidance",  text: outdoor   },
    { icon: TrendingUp,     label: "Pollution drivers", text: pollution  },
    { icon: Clock,          label: "Best time outside", text: bestTime  },
  ];

  return (
    <motion.div
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          {/* AI orb */}
          <div
            className="size-8 rounded-xl grid place-items-center shrink-0"
            style={{
              background: "radial-gradient(circle at 35% 35%, oklch(0.82 0.22 280), oklch(0.55 0.28 260))",
              boxShadow: "0 0 14px oklch(0.65 0.25 270 / 0.50)",
            }}
          >
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              GreenGuard Intelligence
            </div>
            <div className="text-sm font-semibold mt-0.5">AI Forecast Summary</div>
          </div>
        </div>
        <TrendChip trend={trend} />
      </div>

      {/* Summary text with typing effect */}
      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {prefersReduced ? summary : typedSummary}
          {/* Cursor blink while typing */}
          {!prefersReduced && typedSummary.length < summary.length && (
            <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle"
              style={{ animation: "cursor-blink 0.8s ease-in-out infinite" }} />
          )}
        </p>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {expanded ? "Show less" : "View detailed breakdown"}
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR_MD, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
              {details.map(({ icon: Icon, label, text }) => (
                <div key={label} className="flex gap-3">
                  <div
                    className="size-6 rounded-lg grid place-items-center shrink-0 mt-0.5"
                    style={{
                      background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-0.5">
                      {label}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes cursor-blink {
          0%,100% { opacity:1; }
          50%      { opacity:0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cursor-blink { from{} to{} }
        }
      `}</style>
    </motion.div>
  );
}
