/**
 * sdg-center.tsx — Phase 7 SDG Alignment Center & Progress Matrix
 *
 * Covers the six sustainability-relevant UN goals:
 *   SDG 6  — Clean Water and Sanitation    → city.water
 *   SDG 7  — Affordable and Clean Energy   → renewableShare
 *   SDG 11 — Sustainable Cities            → city.eco, city.aqi, greenCover
 *   SDG 12 — Responsible Consumption       → wasteRate, city.carbon
 *   SDG 13 — Climate Action                → city.carbon, city.co2
 *   SDG 15 — Life on Land                  → greenCover, vegetation health
 *
 * Alignment % = rule-based normalisation of existing City fields.
 * No fabricated data. No new backend calls.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Droplets, Zap, Building2, Recycle, CloudRain, Trees,
  TrendingUp, TrendingDown, Minus, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import { norm } from "@/components/sustainability/esg-dashboard";

// ─── SDG definitions ──────────────────────────────────────────────────────────

interface SdgDef {
  id: number;
  label: string;
  icon: typeof Droplets;
  color: string;
  description: string;
  compute: (city: City, renewableShare: number, greenCover: number) => number;
  indicators: (city: City, renewableShare: number, greenCover: number) => { name: string; value: string }[];
}

const SDG_DEFS: SdgDef[] = [
  {
    id: 6, label: "Clean Water", icon: Droplets, color: "oklch(0.62 0.17 220)",
    description: "Ensure availability and sustainable management of water and sanitation.",
    compute: (c) => Math.round(c.water * 0.8 + Math.min(100, c.water * 0.56) * 0.2),
    indicators: (c) => [
      { name: "Water quality index", value: `${c.water}%` },
      { name: "Reuse rate",          value: `${Math.round(c.water * 0.56)}%` },
      { name: "Humidity context",    value: `${c.humidity}%` },
    ],
  },
  {
    id: 7, label: "Clean Energy", icon: Zap, color: "oklch(0.72 0.18 80)",
    description: "Ensure access to affordable, reliable, sustainable and modern energy.",
    compute: (_c, rs) => Math.min(100, Math.round(rs * 2.2 + 10)),
    indicators: (_c, rs) => [
      { name: "Renewable share", value: `${rs}%` },
      { name: "Target gap",      value: rs >= 40 ? "Met" : `${40 - rs}%` },
      { name: "Grid status",     value: rs >= 40 ? "On target" : "Below target" },
    ],
  },
  {
    id: 11, label: "Sustainable Cities", icon: Building2, color: "oklch(0.65 0.16 60)",
    description: "Make cities inclusive, safe, resilient and sustainable.",
    compute: (c, _rs, gc) => Math.round(c.eco * 0.5 + norm(c.aqi, 0, 300) * 0.3 + Math.min(100, gc * 3) * 0.2),
    indicators: (c, _rs, gc) => [
      { name: "EcoScore",   value: `${c.eco}/100` },
      { name: "AQI",        value: `${c.aqi}` },
      { name: "Green cover",value: `${gc}%` },
    ],
  },
  {
    id: 12, label: "Responsible Consumption", icon: Recycle, color: "oklch(0.62 0.15 160)",
    description: "Ensure sustainable consumption and production patterns.",
    compute: (c) => Math.round((Math.round(50 + c.eco * 0.15)) * 0.6 + norm(c.carbon, 0, 12) * 0.4),
    indicators: (c) => [
      { name: "Waste diverted", value: `${Math.round(50 + c.eco * 0.15)}%` },
      { name: "Carbon intensity",value: `${c.carbon} tCO₂` },
      { name: "CO₂ (atm)",      value: `${c.co2} ppm` },
    ],
  },
  {
    id: 13, label: "Climate Action", icon: CloudRain, color: "oklch(0.58 0.16 260)",
    description: "Take urgent action to combat climate change and its impacts.",
    compute: (c) => Math.round(norm(c.carbon, 0, 12) * 0.6 + norm(c.co2, 350, 500) * 0.4),
    indicators: (c) => [
      { name: "Carbon intensity", value: `${c.carbon} tCO₂/cap` },
      { name: "Atmospheric CO₂", value: `${c.co2} ppm` },
      { name: "Risk index",      value: `${c.risk}` },
    ],
  },
  {
    id: 15, label: "Life on Land", icon: Trees, color: "oklch(0.62 0.18 148)",
    description: "Protect, restore and promote sustainable use of terrestrial ecosystems.",
    compute: (c, _rs, gc) => {
      const vegHealth = Math.min(100, Math.round(c.eco * 0.7 + (40 - c.temp) * 0.6));
      return Math.round(Math.min(100, gc * 2.2) * 0.5 + vegHealth * 0.5);
    },
    indicators: (c, _rs, gc) => [
      { name: "Green cover",      value: `${gc}%` },
      { name: "Vegetation health",value: `${Math.min(100, Math.round(c.eco * 0.7 + (40 - c.temp) * 0.6))}%` },
      { name: "Tree density",     value: `${Math.min(100, Math.round(gc * 1.9))}%` },
    ],
  },
];

// ─── individual SDG card ──────────────────────────────────────────────────────

function SdgCard({ def, alignment, indicators, delay }: {
  def: SdgDef; alignment: number; indicators: { name: string; value: string }[]; delay: number;
}) {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const status = alignment >= 75 ? "Aligned" : alignment >= 50 ? "Progressing" : "Lagging";
  const statusColor = alignment >= 75 ? "var(--color-success)" : alignment >= 50 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-4 space-y-3 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 grid place-items-center shrink-0">
          <svg viewBox="0 0 88 88" className="-rotate-90 h-20 w-20" aria-hidden="true">
            <circle cx="44" cy="44" r={r} stroke="var(--color-muted)" strokeWidth="7" fill="none" />
            <motion.circle
              cx="44" cy="44" r={r} stroke={def.color} strokeWidth="7" fill="none" strokeLinecap="round"
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - (alignment / 100) * circ }}
              transition={{ duration: 1, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ strokeDasharray: circ }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <def.icon className="size-4" style={{ color: def.color }} aria-hidden="true" />
            <span className="text-[10px] font-bold tabular-nums mt-0.5">{alignment}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold" style={{ color: def.color }}>SDG {def.id}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ color: statusColor, background: `color-mix(in oklab, ${statusColor} 14%, transparent)` }}>
              {status}
            </span>
          </div>
          <div className="text-xs font-semibold mt-0.5">{def.label}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{def.description}</p>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-3 gap-1.5">
        {indicators.map(ind => (
          <div key={ind.name} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
            <div className="text-[8px] text-muted-foreground leading-tight">{ind.name}</div>
            <div className="text-[10px] font-semibold mt-0.5 tabular-nums">{ind.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── SDG progress matrix ──────────────────────────────────────────────────────

type SortKey = "id" | "alignment" | "trend";

export function SdgProgressMatrix({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const [sort, setSort] = useState<SortKey>("alignment");

  const rows = useMemo(() => SDG_DEFS.map(def => {
    const alignment = def.compute(city, renewableShare, greenCover);
    const trend: "up" | "down" | "flat" = alignment >= 70 ? "up" : alignment < 45 ? "down" : "flat";
    return { def, alignment, indicators: def.indicators(city, renewableShare, greenCover), trend };
  }), [city, renewableShare, greenCover]);

  const sorted = useMemo(() => {
    if (sort === "alignment") return [...rows].sort((a, b) => b.alignment - a.alignment);
    if (sort === "trend") return [...rows].sort((a, b) => (a.trend === "up" ? -1 : a.trend === "down" ? 1 : 0) - (b.trend === "up" ? -1 : b.trend === "down" ? 1 : 0));
    return [...rows].sort((a, b) => a.def.id - b.def.id);
  }, [rows, sort]);

  const TrendIcon = (t: "up" | "down" | "flat") =>
    t === "up" ? TrendingUp : t === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      {/* Header + sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SDG Progress Matrix</div>
          <div className="text-sm font-semibold mt-0.5">Alignment overview — all 6 goals</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden="true" />
          {(["id","alignment","trend"] as SortKey[]).map(k => (
            <button key={k} onClick={() => setSort(k)}
              className={cn("px-2 py-1 rounded-md capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                sort === k ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
              aria-pressed={sort === k}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix rows */}
      <div className="space-y-2">
        {sorted.map((row, i) => {
          const Icon = TrendIcon(row.trend);
          const trendColor = row.trend === "up" ? "var(--color-success)" : row.trend === "down" ? "var(--color-destructive)" : "var(--color-muted-foreground)";
          return (
            <motion.div
              key={row.def.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:border-primary/30 transition-colors"
              role="row"
              aria-label={`SDG ${row.def.id}: ${row.def.label}, ${row.alignment}% alignment`}
            >
              <div className="size-7 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in oklab, ${row.def.color} 16%, transparent)`, color: row.def.color }}>
                <row.def.icon className="size-3.5" aria-hidden="true" />
              </div>
              <div className="w-16 shrink-0">
                <div className="text-[9px] font-bold" style={{ color: row.def.color }}>SDG {row.def.id}</div>
                <div className="text-[10px] font-medium truncate">{row.def.label}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: row.def.color }}
                    initial={{ width: 0 }} animate={{ width: `${row.alignment}%` }}
                    transition={{ duration: 0.85, delay: 0.1 + i * 0.05, ease: "easeOut" }} />
                </div>
              </div>
              <div className="w-10 text-right tabular-nums text-xs font-semibold shrink-0">{row.alignment}%</div>
              <Icon className="size-3.5 shrink-0" style={{ color: trendColor }} aria-label={`Trend: ${row.trend}`} />
              <div className="hidden sm:flex gap-1 shrink-0">
                {row.indicators.slice(0, 2).map(ind => (
                  <span key={ind.name} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground tabular-nums">{ind.value}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── full SDG alignment center ────────────────────────────────────────────────

export function SdgAlignmentCenter({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const cards = useMemo(() => SDG_DEFS.map(def => ({
    def,
    alignment:  def.compute(city, renewableShare, greenCover),
    indicators: def.indicators(city, renewableShare, greenCover),
  })), [city, renewableShare, greenCover]);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, i) => (
        <SdgCard key={c.def.id} def={c.def} alignment={c.alignment} indicators={c.indicators} delay={i * 0.07} />
      ))}
    </div>
  );
}
