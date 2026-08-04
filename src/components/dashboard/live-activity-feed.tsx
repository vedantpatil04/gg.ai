/**
 * LiveActivityFeed — Phase 2
 *
 * Streaming environmental update feed.
 * New entries slide in from the top on a configurable interval.
 * Uses AnimatePresence for smooth entry/exit transitions.
 *
 * Data source: seeded from existing ALERTS + INSIGHTS.
 * In production this would subscribe to a WebSocket; for now it
 * cycles through mock events to demonstrate the live feel.
 * All animation respects prefers-reduced-motion.
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  Activity, Droplets, Wind, Gauge, AlertTriangle,
  CheckCircle2, Info, Zap, Leaf,
} from "lucide-react";
import { ALERTS, INSIGHTS } from "@/lib/mock-data";
import { SLIDE_LEFT } from "@/lib/motion";

// ─── Activity item shape ─────────────────────────────────────────────────────

type ActivityKind = "alert" | "sensor" | "weather" | "air" | "eco" | "info";

interface ActivityItem {
  id:        string;
  kind:      ActivityKind;
  title:     string;
  detail:    string;
  time:      string;
  severity?: "critical" | "warning" | "info" | "success";
}

// ─── Seed pool from existing mock data ───────────────────────────────────────

const SEED_POOL: Omit<ActivityItem, "id" | "time">[] = [
  ...ALERTS.map((a) => ({
    kind:     "alert" as ActivityKind,
    title:    a.title,
    detail:   a.desc ?? "",
    severity: a.severity as "critical" | "warning" | "info",
  })),
  ...INSIGHTS.map((i) => ({
    kind:     "air" as ActivityKind,
    title:    i.title,
    detail:   i.body,
    severity: "info" as const,
  })),
  { kind: "sensor",  title: "Sensor network sync",          detail: "42 sensors reporting nominal readings.",                 severity: "success" },
  { kind: "weather", title: "Wind speed update",            detail: "Gusts up to 28 km/h detected in northern sectors.",      severity: "info"    },
  { kind: "eco",     title: "Green cover index",            detail: "Urban vegetation index stable at 0.42 NDVI.",            severity: "success" },
  { kind: "sensor",  title: "PM2.5 sensor calibrated",      detail: "Unit #07 recalibrated. Readings now nominal.",           severity: "success" },
  { kind: "weather", title: "Humidity spike — east zone",   detail: "Relative humidity at 88% in coastal monitoring area.",   severity: "warning" },
  { kind: "air",     title: "O₃ levels normalising",       detail: "Ozone concentrations falling toward baseline post-peak.", severity: "info"    },
];

function makeId() { return Math.random().toString(36).slice(2); }

function relTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60)  return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60)  return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

function newItem(seed: number): ActivityItem {
  const template = SEED_POOL[seed % SEED_POOL.length];
  return { ...template, id: makeId(), time: "just now" };
}

// ─── Icon per kind ────────────────────────────────────────────────────────────

const KIND_ICON: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  alert:   AlertTriangle,
  sensor:  Activity,
  weather: Wind,
  air:     Gauge,
  eco:     Leaf,
  info:    Info,
};

const KIND_COLOR: Record<ActivityKind, string> = {
  alert:   "var(--color-destructive)",
  sensor:  "var(--color-success)",
  weather: "var(--color-info)",
  air:     "var(--color-primary)",
  eco:     "var(--color-success)",
  info:    "var(--color-muted-foreground)",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-destructive",
  warning:  "bg-warning",
  success:  "bg-success",
  info:     "bg-info",
};

// ─── Single feed row ──────────────────────────────────────────────────────────

function FeedRow({ item }: { item: ActivityItem }) {
  const Icon  = KIND_ICON[item.kind];
  const color = KIND_COLOR[item.kind];

  return (
    <motion.div
      layout
      variants={SLIDE_LEFT}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex gap-3 py-2.5 border-b border-border last:border-0 group"
    >
      {/* Icon */}
      <div className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{
          background: `color-mix(in oklab, ${color} 12%, transparent)`,
          color,
        }}>
        <Icon className="size-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium leading-tight truncate">{item.title}</div>
          <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">{item.time}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</div>
      </div>

      {/* Severity dot */}
      {item.severity && (
        <div className="mt-1.5 shrink-0">
          <span className={`size-2 rounded-full block ${SEV_DOT[item.severity] ?? "bg-muted"}`} />
        </div>
      )}
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

const INITIAL_COUNT  = 5;
const MAX_FEED_ITEMS = 12;
const UPDATE_INTERVAL_MS = 8000; // new item every 8 seconds

export function LiveActivityFeed() {
  const prefersReduced = useReducedMotion() ?? false;

  const [items, setItems] = useState<ActivityItem[]>(() =>
    Array.from({ length: INITIAL_COUNT }, (_, i) => ({
      ...newItem(i),
      time: relTime((INITIAL_COUNT - i) * 90_000),
    }))
  );
  const [counter, setCounter] = useState(INITIAL_COUNT);
  const [paused, setPaused]   = useState(false);

  const addItem = useCallback(() => {
    setCounter((c) => {
      const next = c + 1;
      const item = newItem(next);
      setItems((prev) => [item, ...prev].slice(0, MAX_FEED_ITEMS));
      return next;
    });
  }, []);

  // Update existing item timestamps every minute
  useEffect(() => {
    const tick = setInterval(() => {
      setItems((prev) =>
        prev.map((item, i) => ({
          ...item,
          time: item.time === "just now"
            ? "1m ago"
            : item.time, // simplified — real impl would track timestamps
        }))
      );
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  // Stream new items (disabled when reduced-motion or user paused)
  useEffect(() => {
    if (prefersReduced || paused) return;
    const id = setInterval(addItem, UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [addItem, prefersReduced, paused]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {!prefersReduced && (
              <span className="size-2 rounded-full bg-success block"
                style={{ animation: "live-dot-feed 2s ease-in-out infinite" }} />
            )}
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Live
            </div>
          </div>
          <h2 className="text-sm font-semibold">Activity Feed</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{items.length} events</span>
          {!prefersReduced && (
            <button
              onClick={() => setPaused((p) => !p)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 max-h-[420px] overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes live-dot-feed {
          0%,100% { opacity:1; box-shadow:0 0 4px var(--color-success); }
          50%      { opacity:0.4; box-shadow:none; }
        }
        @media (prefers-reduced-motion:reduce) {
          @keyframes live-dot-feed { from{} to{} }
        }
      `}</style>
    </div>
  );
}
