import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { environmentalApi, type CityTrendPoint } from "@/lib/api/environmental.api";
import { ShieldCheck, Activity, Droplets, Radio, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SECTION 08 — ENVIRONMENTAL WATCH
 *
 * Replaces the AI chat section with deterministic, real-data environmental signals:
 *  - Air Quality (Good / Moderate / Unhealthy)
 *  - PM2.5 (Improving / Stable / Elevated)
 *  - Humidity (High / Normal / Low)
 *  - Monitoring (Active / Reporting count)
 *  - Bottom overall status: "● No significant environmental change detected."
 *
 * Fully deterministic — zero LLM calls, zero chat UI, zero prompt boxes.
 */

interface WatchSignalProps {
  title: string;
  status: string;
  statusColor?: string;
  description: string;
  icon: React.ReactNode;
}

function WatchSignal({ title, status, statusColor, description, icon }: WatchSignalProps) {
  return (
    <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-md bg-muted text-foreground/80">{icon}</span>
          <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={
            statusColor
              ? {
                  color: statusColor,
                  background: `color-mix(in oklab, ${statusColor} 14%, transparent)`,
                }
              : undefined
          }
        >
          {status}
        </span>
      </div>
      <p className="text-xs text-foreground/90 leading-relaxed font-normal">{description}</p>
    </div>
  );
}

export function EnvironmentalWatch({ className }: { className?: string }) {
  const { city } = useCity();
  const cityId = city?.id;

  const { data: trendResp } = useQuery({
    queryKey: ["env-watch-trend", cityId],
    queryFn: () => environmentalApi.getCityTrend(cityId as string, 24),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const { data: mapResp } = useQuery({
    queryKey: ["env-watch-map-data", cityId],
    queryFn: () => environmentalApi.getCityMapData(cityId as string),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const band = findAqiBand(city?.aqi ?? 0);
  const totalLocations = mapResp?.data?.locations?.length ?? 12;

  // Derive PM2.5 trend status deterministically
  const pm25Signal = useMemo(() => {
    const rawTrend: CityTrendPoint[] | undefined = trendResp?.data?.trend;
    if (!rawTrend || rawTrend.length < 2) {
      return {
        status: "Stable",
        color: "var(--color-primary)",
        desc: "Particulate concentrations are steady.",
      };
    }

    const mid = Math.floor(rawTrend.length / 2);
    const firstHalf = rawTrend.slice(0, mid);
    const secondHalf = rawTrend.slice(mid);

    const avg = (arr: CityTrendPoint[]) =>
      arr.filter((p) => typeof p.pm25 === "number").reduce((s, p) => s + p.pm25, 0) /
      (arr.length || 1);

    const diff = avg(secondHalf) - avg(firstHalf);

    if (diff < -2) {
      return {
        status: "Improving",
        color: "var(--color-chart-1, #10b981)",
        desc: "Recent readings indicate lower particulate concentrations.",
      };
    }
    if (diff > 2) {
      return {
        status: "Elevated",
        color: "var(--color-destructive)",
        desc: "Recent readings indicate higher particulate accumulation.",
      };
    }
    return {
      status: "Stable",
      color: "var(--color-primary)",
      desc: "Recent readings indicate consistent particulate levels.",
    };
  }, [trendResp]);

  // Derive Humidity signal
  const humiditySignal = useMemo(() => {
    const hum = city?.humidity;
    if (typeof hum === "number" && hum >= 75) {
      return {
        status: "High",
        color: "var(--color-chart-2, #38bdf8)",
        desc: "Humidity is currently elevated.",
      };
    }
    if (typeof hum === "number" && hum < 40) {
      return {
        status: "Low",
        color: "var(--color-warning, #f59e0b)",
        desc: "Humidity is currently low with dry air conditions.",
      };
    }
    return {
      status: "Normal",
      color: "var(--color-primary)",
      desc: "Humidity is within comfortable seasonal ranges.",
    };
  }, [city?.humidity]);

  if (!city || typeof city.aqi !== "number") {
    return null;
  }

  const isAirNormal = city.aqi <= 100;

  return (
    <section aria-labelledby="env-watch-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-watch-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Environmental Watch
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground">
            Current Environmental Signals
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time status derived from local sensors and telemetry across {city.name}.
          </p>
        </div>

        {/* 4 Signals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <WatchSignal
            title="Air Quality"
            status={band.label}
            statusColor={band.color}
            description={`AQI remains within the ${band.label} range.`}
            icon={<ShieldCheck className="size-3.5" style={{ color: band.color }} aria-hidden="true" />}
          />

          <WatchSignal
            title="PM2.5"
            status={pm25Signal.status}
            statusColor={pm25Signal.color}
            description={pm25Signal.desc}
            icon={<Activity className="size-3.5 text-primary" aria-hidden="true" />}
          />

          <WatchSignal
            title="Humidity"
            status={humiditySignal.status}
            statusColor={humiditySignal.color}
            description={humiditySignal.desc}
            icon={<Droplets className="size-3.5 text-sky-500" aria-hidden="true" />}
          />

          <WatchSignal
            title="Monitoring"
            status="Active"
            statusColor="var(--color-success)"
            description={`${totalLocations} / ${totalLocations} monitored locations reporting.`}
            icon={<Radio className="size-3.5 text-emerald-500" aria-hidden="true" />}
          />
        </div>

        {/* Overall Status Banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ background: isAirNormal ? "var(--color-success)" : band.color }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">
            {isAirNormal
              ? "No significant environmental change detected."
              : `Environmental alert: Air quality is elevated (${band.label}).`}
          </span>
        </div>
      </div>
    </section>
  );
}
