import type { ComponentType } from "react";
import { Activity, Thermometer, Droplets, Wind, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvMetricsStripSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * V3 Live Metrics Strip — Premium floating telemetry chips.
 *
 * Each card floats with a subtle hover glow, animated value entrance,
 * and AQI-reactive accent on the primary metric. All from useCity() —
 * no new API calls.
 */

interface StripMetricDef {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  accent?: string;
  sublabel?: string;
}

function StripCard({ icon: Icon, label, value, accent, sublabel, index }: StripMetricDef & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22, delay: index * 0.07 }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 20 } }}
      className="relative rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(1 0 0 / 0.07) 0%, oklch(1 0 0 / 0.03) 100%)",
        backdropFilter: "blur(20px) saturate(130%)",
        WebkitBackdropFilter: "blur(20px) saturate(130%)",
        boxShadow: accent
          ? `0 0 0 1px oklch(1 0 0 / 0.06) inset, 0 8px 32px oklch(0 0 0 / 0.3), 0 0 24px -8px ${accent}30`
          : "0 0 0 1px oklch(1 0 0 / 0.06) inset, 0 8px 32px oklch(0 0 0 / 0.25)",
      }}
    >
      {/* Accent glow top edge */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${accent}80 50%, transparent 100%)` }}
          aria-hidden="true"
        />
      )}

      <div className="p-4 flex items-center gap-3">
        <div
          className="size-10 rounded-xl grid place-items-center shrink-0"
          style={{
            color: accent ?? "oklch(0.78 0.18 160)",
            background: accent
              ? `color-mix(in oklab, ${accent} 16%, oklch(1 0 0 / 0.05))`
              : "oklch(1 0 0 / 0.07)",
            boxShadow: accent ? `0 0 12px ${accent}30` : undefined,
          }}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/35 truncate">{label}</div>
          <div
            className="text-lg font-bold tabular-nums leading-tight"
            style={{ color: accent ? accent : "oklch(0.95 0.01 220)" }}
          >
            {value}
          </div>
          {sublabel && (
            <div className="text-[9px] text-white/30 truncate mt-0.5">{sublabel}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function LiveMetricsStrip({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) return <EnvMetricsStripSkeleton className={className} />;
  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load live metrics."
      />
    );
  }
  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Live metrics are currently unavailable."
        description="This strip will update once a live environmental reading is available."
      />
    );
  }

  const band = findAqiBand(city.aqi);
  const metrics: StripMetricDef[] = [
    { key: "aqi", label: "AQI Index", icon: Activity, value: `${city.aqi}`, accent: band.color, sublabel: band.label },
  ];
  if (typeof city.temp === "number") {
    metrics.push({ key: "temp", label: "Temperature", icon: Thermometer, value: `${city.temp}°C`, sublabel: "Ambient" });
  }
  if (typeof city.humidity === "number") {
    metrics.push({ key: "humidity", label: "Humidity", icon: Droplets, value: `${city.humidity}%`, sublabel: "Relative" });
  }
  if (typeof city.windSpeed === "number") {
    metrics.push({ key: "wind", label: "Wind Speed", icon: Wind, value: `${city.windSpeed} km/h` });
  }
  if (typeof city.pressure === "number") {
    metrics.push({ key: "pressure", label: "Pressure", icon: Gauge, value: `${city.pressure} hPa` });
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {metrics.map((m, i) => (
        <StripCard
          key={m.key}
          icon={m.icon}
          label={m.label}
          value={m.value}
          accent={m.accent}
          sublabel={m.sublabel}
          index={i}
        />
      ))}
    </div>
  );
}
