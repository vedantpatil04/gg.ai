import { memo } from "react";
import {
  Wind,
  Droplets,
  Thermometer,
  CloudRain,
  AlertTriangle,
  Activity,
  Shield,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus as ArrowStable,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

export interface SmartMapMetricStripProps {
  city: {
    name: string;
    aqi: number;
    water: number;
    temp: number;
    humidity: number;
    alerts: number;
    risk: number;
  };
  band: {
    label: string;
    color: string;
  };
  sensorsOnline: number;
  totalSensors: number;
  mapLoaded: boolean;
  lastUpdated: string;
  aqiTrend?: {
    direction: "up" | "down" | "stable";
    delta?: number;
  };
  aqiForecast6h?: number;
}

function TrendBadge({ direction, value }: { direction: "up" | "down" | "stable"; value?: number }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive ml-1.5 tabular-nums">
        <ArrowUpRight className="size-3" />
        {value != null ? `+${value}` : ""}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500 ml-1.5 tabular-nums">
        <ArrowDownRight className="size-3" />
        {value != null ? `-${Math.abs(value)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground ml-1.5">
      <ArrowStable className="size-3" />
    </span>
  );
}

export const SmartMapMetricStrip = memo(function SmartMapMetricStrip({
  city,
  band,
  sensorsOnline,
  totalSensors,
  mapLoaded,
  lastUpdated,
  aqiTrend,
  aqiForecast6h,
}: SmartMapMetricStripProps) {
  const prefersReduced = useReducedMotion();

  // Derived contextual status values (preserves logic exactly)
  const waterQuality =
    city.water >= 75 ? "Good" : city.water >= 50 ? "Moderate" : "Poor";

  const tempContext =
    city.temp > 35 ? "Extreme" : city.temp > 30 ? "Warm" : city.temp > 20 ? "Moderate" : "Cool";

  const humidityContext =
    city.humidity > 75 ? "High Moisture" : city.humidity < 30 ? "Dry Air" : "Optimal";

  const riskTier =
    city.risk > 60 ? "High Risk" : city.risk > 30 ? "Moderate" : "Low Risk";

  const riskAccent =
    city.risk > 60
      ? "var(--color-destructive)"
      : city.risk > 30
        ? "var(--color-warning)"
        : "var(--color-success)";

  const coveragePercent = Math.round((sensorsOnline / Math.max(totalSensors, 1)) * 100);

  const alertsAccent =
    city.alerts > 0 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <div
      className={cn(
        "w-full shrink-0 border-b border-border/60 bg-card/60 dark:bg-card/40 backdrop-blur-md",
        "px-3 py-2 sm:px-4 sm:py-2.5",
      )}
      role="region"
      aria-label="Environmental Telemetry Strip"
    >
      <div
        className={cn(
          "flex items-stretch gap-2.5",
          // Horizontal momentum scroll on mobile/tablet, full strip on desktop
          "overflow-x-auto snap-x snap-mandatory overscroll-x-contain scroll-smooth",
          "[&::-webkit-scrollbar]:hidden",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* ── 1. AQI (Hero Environmental Metric) ────────────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[185px] lg:w-auto lg:flex-[1.25] snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-primary/50 hover:shadow-md transition-all duration-200",
          )}
        >
          {/* Subtle top accent hairline */}
          <span
            className="absolute inset-x-2.5 top-0 h-[2px] rounded-full"
            style={{ background: band.color }}
          />

          {/* Top Label */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="size-6 rounded-lg grid place-items-center shrink-0"
                style={{
                  background: `color-mix(in oklab, ${band.color} 16%, transparent)`,
                  color: band.color,
                }}
              >
                <Wind className="size-3.5" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
                Air Quality
              </span>
            </div>
            {mapLoaded && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-500 pulse-dot" />
                LIVE
              </span>
            )}
          </div>

          {/* Middle Value */}
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.aqi}
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md ml-1.5"
              style={{
                background: `color-mix(in oklab, ${band.color} 15%, transparent)`,
                color: band.color,
              }}
            >
              {band.label}
            </span>
            {aqiTrend && <TrendBadge direction={aqiTrend.direction} value={aqiTrend.delta} />}
          </div>

          {/* Bottom Context */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span>Updated {lastUpdated}</span>
            {aqiForecast6h != null && (
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                → {aqiForecast6h} in 6h
              </span>
            )}
          </div>
        </motion.div>

        {/* ── 2. WATER QUALITY INDEX (Core Environmental Metric) ─────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[160px] lg:w-auto lg:flex-[1.1] snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-info/50 hover:shadow-md transition-all duration-200",
          )}
        >
          <span className="absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-[var(--color-info)]" />

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-lg bg-info/10 text-info grid place-items-center shrink-0">
              <Droplets className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Water Quality
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.water}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ 100</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span className="font-medium text-info">{waterQuality}</span>
            <span>Index baseline</span>
          </div>
        </motion.div>

        {/* ── 3. TEMPERATURE (Core Environmental Metric) ────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-amber-500/40 hover:shadow-md transition-all duration-200",
          )}
        >
          <span className="absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-amber-500/70" />

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center shrink-0">
              <Thermometer className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Temperature
            </span>
          </div>

          <div className="flex items-baseline gap-0.5 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.temp}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">°C</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span>{tempContext}</span>
            <span>Ambient</span>
          </div>
        </motion.div>

        {/* ── 4. HUMIDITY (Core Environmental Metric) ───────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-sky-500/40 hover:shadow-md transition-all duration-200",
          )}
        >
          <span className="absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-sky-500/70" />

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-lg bg-sky-500/10 text-sky-500 grid place-items-center shrink-0">
              <CloudRain className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Humidity
            </span>
          </div>

          <div className="flex items-baseline gap-0.5 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.humidity}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span>{humidityContext}</span>
            <span>Relative</span>
          </div>
        </motion.div>

        {/* ── 5. ALERTS (Operational Metric) ────────────────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-border hover:shadow-md transition-all duration-200",
          )}
        >
          <span
            className="absolute inset-x-2.5 top-0 h-[2px] rounded-full"
            style={{ background: alertsAccent }}
          />

          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="size-6 rounded-lg grid place-items-center shrink-0"
              style={{
                background: `color-mix(in oklab, ${alertsAccent} 15%, transparent)`,
                color: alertsAccent,
              }}
            >
              <AlertTriangle className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Alerts
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.alerts}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] truncate">
            {city.alerts === 0 ? (
              <span className="font-medium text-emerald-500 inline-flex items-center gap-1">
                <CheckCircle2 className="size-2.5" /> All clear
              </span>
            ) : (
              <span className="font-semibold text-amber-500">
                {city.alerts} active
              </span>
            )}
            <span className="text-muted-foreground/70">Advisories</span>
          </div>
        </motion.div>

        {/* ── 6. ACTIVE DATA (Operational Metric) ───────────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-emerald-500/40 hover:shadow-md transition-all duration-200",
          )}
        >
          <span className="absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-emerald-500/70" />

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-500 grid place-items-center shrink-0">
              <Activity className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Active Data
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {sensorsOnline}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ {totalSensors}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span className="text-emerald-500 font-medium">Sensors reporting</span>
          </div>
        </motion.div>

        {/* ── 7. RISK (Risk Metric) ─────────────────────────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-border hover:shadow-md transition-all duration-200",
          )}
        >
          <span
            className="absolute inset-x-2.5 top-0 h-[2px] rounded-full"
            style={{ background: riskAccent }}
          />

          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="size-6 rounded-lg grid place-items-center shrink-0"
              style={{
                background: `color-mix(in oklab, ${riskAccent} 15%, transparent)`,
                color: riskAccent,
              }}
            >
              <Shield className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Risk
            </span>
          </div>

          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {city.risk}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ 100</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span
              className="font-medium"
              style={{ color: riskAccent }}
            >
              {riskTier}
            </span>
            <span>Index</span>
          </div>
        </motion.div>

        {/* ── 8. COVERAGE (Monitoring Reach Metric) ─────────────────────── */}
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative shrink-0 w-[145px] lg:w-auto lg:flex-1 snap-start",
            "rounded-xl p-3 flex flex-col justify-between gap-1.5",
            "bg-card/90 dark:bg-card/75 border border-border/70 shadow-sm",
            "hover:border-primary/40 hover:shadow-md transition-all duration-200",
          )}
        >
          <span className="absolute inset-x-2.5 top-0 h-[2px] rounded-full bg-[var(--color-primary)]" />

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-6 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Gauge className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
              Coverage
            </span>
          </div>

          <div className="flex items-baseline gap-0.5 my-0.5">
            <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {coveragePercent}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 truncate">
            <span>City monitoring</span>
            <span>Spatial</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
});
