/**
 * climate-card.tsx — Phase 4 Climate Intelligence panel
 *
 * All metrics derived from existing City fields only:
 *   city.aqi      → air quality risk
 *   city.temp     → heat stress
 *   city.humidity → flood/moisture exposure proxy
 *   city.pm25     → storm/particulate exposure
 *   city.water    → water stress (inverted)
 *   city.carbon   → drought proxy (high carbon → higher heat → drier)
 *
 * No new data fields or backend endpoints.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, CloudRain, Waves, Sun } from "lucide-react";
import type { City } from "@/lib/mock-data";

interface ClimateMetric {
  icon: typeof Thermometer;
  label: string;
  value: number;       // 0–100 severity
  description: string;
  color: string;
}

function severity(v: number): string {
  if (v >= 75) return "Critical";
  if (v >= 50) return "High";
  if (v >= 30) return "Moderate";
  return "Low";
}

function sevColor(v: number): string {
  if (v >= 75) return "var(--color-destructive)";
  if (v >= 50) return "var(--color-warning)";
  if (v >= 30) return "oklch(0.7 0.18 200)";
  return "var(--color-success)";
}

function MetricRow({ metric, delay }: { metric: ClimateMetric; delay: number }) {
  const color = sevColor(metric.value);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="group flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5 hover:border-primary/30 transition-colors"
    >
      {/* Icon */}
      <div
        className="size-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
      >
        <metric.icon className="size-4" aria-hidden="true" />
      </div>

      {/* Label + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium">{metric.label}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
          >
            {severity(metric.value)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${metric.value}%` }}
            transition={{ duration: 0.85, delay: delay + 0.05, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{metric.description}</div>
      </div>
    </motion.div>
  );
}

export function ClimateCard({ city }: { city: City }) {
  const metrics: ClimateMetric[] = useMemo(() => {
    // Heat stress — higher temp increases risk; baseline comfortable at 22°C
    const heatStress   = Math.min(100, Math.max(0, Math.round((city.temp - 18) * 4.5)));
    // Flood exposure — high humidity + poor water quality = more risk
    const flood        = Math.min(100, Math.round((city.humidity - 30) * 0.9 + (100 - city.water) * 0.4));
    // Storm exposure — PM2.5 and humidity together proxy convective instability
    const storm        = Math.min(100, Math.round(city.pm25 * 0.55 + city.humidity * 0.22));
    // Air quality risk — direct from AQI (scale 0–500 → 0–100)
    const airRisk      = Math.min(100, Math.round(city.aqi * 0.22));
    // Water stress — inverted water quality index
    const waterStress  = Math.max(0, 100 - city.water);
    // Drought level — carbon intensity + temperature proxy
    const drought      = Math.min(100, Math.round(city.carbon * 5.5 + (city.temp - 18) * 1.5));

    return [
      {
        icon: Thermometer, label: "Heat Stress",      value: heatStress,
        description: `Current temp ${city.temp}°C — ${heatStress >= 50 ? "elevated thermal load on vulnerable populations" : "within manageable range"}`,
        color: sevColor(heatStress),
      },
      {
        icon: CloudRain,   label: "Flood Exposure",   value: flood,
        description: `Humidity ${city.humidity}% — ${flood >= 50 ? "surface runoff risk elevated" : "drainage capacity adequate"}`,
        color: sevColor(flood),
      },
      {
        icon: Wind,        label: "Storm Exposure",   value: storm,
        description: `PM2.5 at ${city.pm25} µg/m³ — ${storm >= 50 ? "convective conditions unfavourable" : "storm risk currently low"}`,
        color: sevColor(storm),
      },
      {
        icon: Waves,       label: "Air Quality Risk", value: airRisk,
        description: `AQI ${city.aqi} — ${airRisk >= 50 ? "health advisory in effect for sensitive groups" : "within acceptable exposure limits"}`,
        color: sevColor(airRisk),
      },
      {
        icon: Droplets,    label: "Water Stress",     value: waterStress,
        description: `Water index ${city.water}% — ${waterStress >= 50 ? "significant conservation pressure" : "supply-demand balance maintained"}`,
        color: sevColor(waterStress),
      },
      {
        icon: Sun,         label: "Drought Level",    value: drought,
        description: `Carbon ${city.carbon} tCO₂ / cap — ${drought >= 50 ? "soil moisture deficit risk increasing" : "precipitation cycle within normal range"}`,
        color: sevColor(drought),
      },
    ];
  }, [city]);

  const highCount = metrics.filter(m => m.value >= 50).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Climate Intelligence</div>
          <div className="text-sm font-semibold mt-0.5">{city.name} risk profile</div>
        </div>
        {highCount > 0 && (
          <div
            className="px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{
              color: highCount >= 3 ? "var(--color-destructive)" : "var(--color-warning)",
              background: `color-mix(in oklab, ${highCount >= 3 ? "var(--color-destructive)" : "var(--color-warning)"} 14%, transparent)`,
            }}
          >
            {highCount} elevated risk{highCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Metric rows */}
      <div className="space-y-2">
        {metrics.map((m, i) => (
          <MetricRow key={m.label} metric={m} delay={i * 0.06} />
        ))}
      </div>
    </motion.div>
  );
}
