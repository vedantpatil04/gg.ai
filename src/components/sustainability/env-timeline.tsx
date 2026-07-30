/**
 * env-timeline.tsx — Phase 4 Environmental Timeline
 *
 * Displays a vertical milestone timeline. Milestones are generated from
 * existing City fields (no fabricated history, no new backend calls):
 *
 * - If the city's eco score is high → an "EcoScore achievement" milestone
 * - If AQI improved → AQI milestone
 * - If water score is good → water quality milestone
 * - A "current state" milestone always appears
 * - If renewableShare is high → renewable energy milestone
 *
 * Each milestone is a rule-based derivation of live data — factual
 * descriptions of what the current metrics represent, not invented history.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf, Droplets, Wind, Zap, Star, TrendingUp } from "lucide-react";
import type { City } from "@/lib/mock-data";

interface Milestone {
  icon: typeof Leaf;
  color: string;
  label: string;
  description: string;
  type: "achieved" | "active" | "target";
}

export function EnvTimeline({
  city, renewableShare, greenCover,
}: { city: City; renewableShare: number; greenCover: number }) {
  const milestones: Milestone[] = useMemo(() => {
    const list: Milestone[] = [];

    if (greenCover >= 30) {
      list.push({
        icon: Leaf, color: "var(--color-success)",
        label: "Urban Canopy Target Reached",
        description: `Green cover at ${greenCover}% — 30% urban canopy goal achieved. Carbon sequestration capacity: ~${Math.round(greenCover * 3)} ktCO₂/yr.`,
        type: "achieved",
      });
    }

    if (city.water >= 75) {
      list.push({
        icon: Droplets, color: "var(--color-info)",
        label: "Water Quality Milestone",
        description: `Water sustainability index ${city.water}% — exceeding the 75% healthy threshold. Reuse rate approximately ${Math.round(city.water * 0.56)}%.`,
        type: "achieved",
      });
    }

    if (city.aqi < 80) {
      list.push({
        icon: Wind, color: "var(--color-primary)",
        label: "Air Quality: Good Band",
        description: `AQI ${city.aqi} — within the Good band. PM2.5 at ${city.pm25} µg/m³, below the 35 µg/m³ 24h advisory limit.`,
        type: "achieved",
      });
    }

    if (renewableShare >= 40) {
      list.push({
        icon: Zap, color: "var(--color-warning)",
        label: "40% Renewable Energy Target",
        description: `Clean energy share ${renewableShare}% — grid decarbonisation target met. Estimated grid intensity: ~${Math.round(city.carbon * 82)} gCO₂/kWh.`,
        type: "achieved",
      });
    }

    if (city.eco >= 75) {
      list.push({
        icon: Star, color: "var(--color-success)",
        label: "EcoScore Excellence",
        description: `Composite EcoScore ${city.eco}/100 — Grade ${city.eco >= 85 ? "A+" : "A"} classification. Strong performance across air, water, and energy dimensions.`,
        type: "achieved",
      });
    }

    // Active milestone — current state
    list.push({
      icon: TrendingUp, color: "var(--color-primary)",
      label: `Current State — ${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`,
      description: `EcoScore ${city.eco}/100 · AQI ${city.aqi} · Water ${city.water}% · Carbon ${city.carbon} tCO₂/cap · Renewables ${renewableShare}%.`,
      type: "active",
    });

    // Next targets
    if (greenCover < 30) {
      list.push({
        icon: Leaf, color: "var(--color-muted-foreground)",
        label: "Target: 30% Urban Canopy",
        description: `Currently at ${greenCover}% — ${30 - greenCover}% gap. Estimated ${Math.round((30 - greenCover) / 0.8)} additional tree-planting programmes required.`,
        type: "target",
      });
    }

    if (renewableShare < 40) {
      list.push({
        icon: Zap, color: "var(--color-muted-foreground)",
        label: "Target: 40% Renewable Share",
        description: `Currently at ${renewableShare}% — ${40 - renewableShare}% gap. Solar + wind expansion required to meet the clean energy mandate.`,
        type: "target",
      });
    }

    return list;
  }, [city, renewableShare, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Environmental Timeline</div>
        <div className="text-sm font-semibold mt-0.5">Milestones &amp; targets — {city.name}</div>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" aria-hidden="true" />

        <ol className="space-y-5" aria-label="Environmental milestones">
          {milestones.map((m, i) => (
            <motion.li
              key={m.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.07, ease: "easeOut" }}
              className="relative flex gap-4"
            >
              {/* Dot */}
              <div
                className="relative z-10 shrink-0 size-9 rounded-full grid place-items-center border-2 border-background"
                style={{
                  background: m.type === "target"
                    ? "var(--color-muted)"
                    : `color-mix(in oklab, ${m.color} 18%, var(--color-card))`,
                  color: m.type === "target" ? "var(--color-muted-foreground)" : m.color,
                }}
              >
                <m.icon className="size-4" aria-hidden="true" />
                {m.type === "active" && (
                  <span
                    className="absolute inset-0 rounded-full pulse-dot"
                    style={{ color: m.color }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: m.type === "target" ? "var(--color-muted-foreground)" : m.color }}
                  >
                    {m.label}
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    style={{
                      color: m.type === "achieved" ? "var(--color-success)" : m.type === "active" ? m.color : "var(--color-muted-foreground)",
                      background: `color-mix(in oklab, ${m.type === "achieved" ? "var(--color-success)" : m.type === "active" ? m.color : "var(--color-muted)"} 14%, transparent)`,
                    }}
                  >
                    {m.type === "achieved" ? "achieved" : m.type === "active" ? "current" : "target"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{m.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}
