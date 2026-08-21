import { motion } from "framer-motion";
import { Leaf, Zap, Droplets, Recycle, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import type { City } from "@/lib/mock-data";

export interface TargetItem {
  key: string;
  label: string;
  icon: typeof Leaf;
  current: number | null;
  target: number;
  unit: string;
  direction: "higher-is-better" | "lower-is-better";
  accent: string;
}

export function SustainabilityTargets({ city }: { city: City }) {
  const greenCover = city.greenCover ?? null;
  const renewableShare = city.renewableShare ?? null;
  const waterQuality = city.water ?? null;
  const wasteDiversion = city.ecoScore?.breakdown?.wasteDiversion?.rawValue ?? null;

  const targets: TargetItem[] = [
    {
      key: "greenCover",
      label: "Green Cover",
      icon: Leaf,
      current: greenCover,
      target: 30,
      unit: "%",
      direction: "higher-is-better",
      accent: "var(--color-success)",
    },
    {
      key: "renewableEnergy",
      label: "Renewable Energy",
      icon: Zap,
      current: renewableShare,
      target: 35,
      unit: "%",
      direction: "higher-is-better",
      accent: "var(--color-info)",
    },
    {
      key: "waterQuality",
      label: "Water Quality",
      icon: Droplets,
      current: waterQuality,
      target: 75,
      unit: "%",
      direction: "higher-is-better",
      accent: "var(--color-info)",
    },
    {
      key: "wasteDiversion",
      label: "Waste Diversion",
      icon: Recycle,
      current: wasteDiversion,
      target: 60,
      unit: "%",
      direction: "higher-is-better",
      accent: "var(--color-primary)",
    },
  ];

  return (
    <Panel
      eyebrow="Compliance & Benchmarks"
      title="Sustainability Targets"
      action={
        <span className="text-xs text-muted-foreground font-medium">
          Municipal reference standards
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {targets.map((item, idx) => {
          const isUnavailable = item.current == null || Number.isNaN(item.current);
          const currentVal = item.current ?? 0;
          const delta = isUnavailable ? null : currentVal - item.target;
          const achieved = delta !== null && delta >= 0;
          const progress = isUnavailable ? 0 : Math.min(100, Math.round((currentVal / item.target) * 100));

          let statusText = "Data Unavailable";
          if (delta !== null) {
            if (delta === 0) {
              statusText = "Target achieved";
            } else if (delta > 0) {
              statusText = `Above target (+${delta.toFixed(0)}${item.unit})`;
            } else {
              statusText = `${Math.abs(delta).toFixed(0)}${item.unit} below target`;
            }
          }

          const StatusIcon = isUnavailable ? HelpCircle : achieved ? CheckCircle2 : AlertTriangle;
          const statusToneColor = isUnavailable
            ? "var(--color-muted-foreground)"
            : achieved
            ? "var(--color-success)"
            : "var(--color-warning)";

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-elev)" }}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="size-9 rounded-xl grid place-items-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${item.accent} 15%, transparent)`, color: item.accent }}
                  >
                    <item.icon className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {item.label}
                  </div>
                </div>

                {/* Values Comparison */}
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Current → Target</div>
                  <div className="flex items-baseline gap-1.5 font-extrabold tracking-tight">
                    <span className="text-2xl sm:text-3xl tabular-nums">
                      {isUnavailable ? "—" : `${currentVal}${item.unit}`}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                      → {item.target}{item.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50">
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: achieved ? "var(--color-success)" : item.accent,
                    }}
                  />
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusToneColor }}>
                  <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{statusText}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}
