import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Info,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { copilotApi } from "@/lib/api/services.api";
import { EnvAISummarySkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";

/**
 * Environmental Overview — AI Environmental Analysis & Smart Recommendations
 * (Phase 10 upgrade of env-ai-summary.tsx).
 *
 * Same ["ai-city-insights", city.id] query — no new API call.
 * Four panels built around the existing data:
 *   1. AI Summary card — live Gemini text when available, clean local
 *      fallback when not, data-completeness confidence badge.
 *   2. Environmental signal chips — dynamic, AQI-reactive, icon+label.
 *   3. Reasoning panel — explains WHY the current state is what it is.
 *   4. Smart Recommendations — priority-ranked, grounded in real readings.
 */

// ─── Local fallback summary ───────────────────────────────────────────────────

function buildLocalSummary(city: City): string {
  const band = findAqiBand(city.aqi);
  const guidance = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  const parts = [
    `${city.name} is currently experiencing ${band.label.toLowerCase()} air quality (AQI ${city.aqi}).`,
    guidance,
  ];
  if (typeof city.temp === "number" && typeof city.humidity === "number") {
    parts.push(`Conditions are ${city.temp}°C with ${city.humidity}% humidity.`);
  }
  return parts.join(" ");
}

// ─── Confidence indicator ─────────────────────────────────────────────────────

function dataCompleteness(city: City): { label: string; description: string; color: string } {
  const fields = [
    city.aqi,
    city.temp,
    city.humidity,
    city.windSpeed,
    city.pressure,
    city.pm25,
    city.pm10,
  ];
  const available = fields.filter((f) => typeof f === "number").length;
  if (available >= 6)
    return {
      label: "High confidence",
      description: "Multiple environmental metrics available.",
      color: "var(--color-success)",
    };
  if (available >= 3)
    return {
      label: "Moderate confidence",
      description: "Core environmental metrics available.",
      color: "hsl(45 90% 55%)",
    };
  return {
    label: "Limited confidence",
    description: "Few metrics available for this location.",
    color: "hsl(28 90% 55%)",
  };
}

// ─── Signal chips ─────────────────────────────────────────────────────────────

interface SignalChip {
  icon: LucideIcon;
  label: string;
  detail: string;
  color: string;
}

function buildSignalChips(city: City): SignalChip[] {
  const chips: SignalChip[] = [];
  const band = findAqiBand(city.aqi);

  chips.push({
    icon: Activity,
    label: `AQI ${band.label}`,
    detail: `${city.aqi}`,
    color: band.color,
  });

  if (typeof city.temp === "number") {
    const comfortable = city.temp >= 16 && city.temp <= 28;
    chips.push({
      icon: Thermometer,
      label:
        city.temp >= 35
          ? "Hot"
          : city.temp >= 28
            ? "Warm"
            : city.temp >= 16
              ? "Comfortable"
              : "Cool",
      detail: `${city.temp}°C`,
      color:
        city.temp >= 35
          ? "hsl(28 90% 55%)"
          : comfortable
            ? "var(--color-success)"
            : "hsl(200 70% 55%)",
    });
  }

  if (typeof city.humidity === "number") {
    chips.push({
      icon: Droplets,
      label: city.humidity >= 75 ? "High humidity" : city.humidity >= 40 ? "Comfortable" : "Dry",
      detail: `${city.humidity}%`,
      color: city.humidity >= 75 ? "hsl(200 70% 55%)" : "var(--color-success)",
    });
  }

  if (typeof city.windSpeed === "number") {
    chips.push({
      icon: Wind,
      label:
        city.windSpeed >= 35
          ? "Strong wind"
          : city.windSpeed >= 15
            ? "Moderate wind"
            : city.windSpeed >= 5
              ? "Light breeze"
              : "Calm",
      detail: `${city.windSpeed} km/h`,
      color:
        city.windSpeed >= 35
          ? "hsl(28 90% 55%)"
          : city.windSpeed >= 5
            ? "var(--color-success)"
            : "hsl(45 90% 55%)",
    });
  }

  if (typeof city.pressure === "number") {
    chips.push({
      icon: Gauge,
      label: "Pressure",
      detail: `${city.pressure} hPa`,
      color: "var(--color-muted-foreground)",
    });
  }

  return chips;
}

function SignalChips({ chips }: { chips: SignalChip[] }) {
  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Environmental signals">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <div
            key={chip.label}
            role="listitem"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-shadow duration-200 hover:shadow-sm"
            style={{
              color: chip.color,
              borderColor: `color-mix(in oklab, ${chip.color} 30%, var(--color-border))`,
              background: `color-mix(in oklab, ${chip.color} 10%, var(--color-card))`,
            }}
            aria-label={`${chip.label}: ${chip.detail}`}
          >
            <Icon className="size-3" aria-hidden="true" />
            {chip.label}
            <span className="opacity-60 font-normal">{chip.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reasoning panel ──────────────────────────────────────────────────────────

function buildReasoningPoints(city: City): string[] {
  const points: string[] = [];
  const band = findAqiBand(city.aqi);

  if (city.aqi > 50) {
    points.push(
      `AQI (${city.aqi} — ${band.label}) is currently the strongest influence on your environmental score.`,
    );
  } else {
    points.push(
      `Air quality is currently ${band.label.toLowerCase()} and not a primary concern at this time.`,
    );
  }

  if (typeof city.humidity === "number" && city.humidity >= 65) {
    points.push(
      `Elevated humidity (${city.humidity}%) may be making conditions feel warmer than the temperature suggests.`,
    );
  }

  if (typeof city.windSpeed === "number") {
    if (city.windSpeed >= 10) {
      points.push(
        `Wind at ${city.windSpeed} km/h is helping to disperse local pollutants and refresh air in the area.`,
      );
    } else {
      points.push(
        `Low wind speeds (${city.windSpeed} km/h) may limit pollutant dispersion — conditions could feel more stagnant.`,
      );
    }
  }

  if (typeof city.temp === "number" && city.temp >= 30) {
    points.push(
      `High temperature (${city.temp}°C) can increase ground-level ozone formation and contribute to elevated AQI.`,
    );
  }

  if (typeof city.pm25 === "number" && city.pm25 > 25) {
    points.push(
      `PM2.5 (${city.pm25} µg/m³) is above the WHO guideline and is contributing to the current air quality reading.`,
    );
  }

  if (points.length === 0) {
    points.push(
      "Conditions across all available environmental metrics are currently within normal ranges.",
    );
  }

  return points.slice(0, 3);
}

// ─── Smart Recommendations ────────────────────────────────────────────────────

type Priority = "Low" | "Moderate" | "High";

interface Rec {
  icon: LucideIcon;
  title: string;
  description: string;
  priority: Priority;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  Low: "var(--color-success)",
  Moderate: "hsl(45 90% 55%)",
  High: "hsl(28 90% 55%)",
};
const PRIORITY_ICON: Record<Priority, LucideIcon> = {
  Low: ShieldCheck,
  Moderate: Info,
  High: AlertTriangle,
};

function buildRecs(city: City): Rec[] {
  const recs: Rec[] = [];
  const band = findAqiBand(city.aqi);

  if (city.aqi <= 50) {
    recs.push({
      icon: Sun,
      title: "Outdoor activities are suitable",
      description: "Current air quality is good. Outdoor activities are appropriate for everyone.",
      priority: "Low",
    });
  } else if (city.aqi <= 100) {
    recs.push({
      icon: Activity,
      title: "Generally suitable — sensitive individuals take care",
      description: `${band.label} air quality. Sensitive groups may wish to limit prolonged outdoor exertion.`,
      priority: "Moderate",
    });
  } else {
    recs.push({
      icon: AlertTriangle,
      title: "Limit prolonged outdoor exposure",
      description: `${band.label} air quality detected. Reduce outdoor exertion where possible.`,
      priority: "High",
    });
  }

  if (typeof city.temp === "number" && city.temp >= 35) {
    recs.push({
      icon: Thermometer,
      title: "Avoid peak-heat outdoor activity",
      description: `${city.temp}°C — stay hydrated and avoid prolonged sun exposure.`,
      priority: "High",
    });
  } else if (typeof city.temp === "number" && city.temp >= 28) {
    recs.push({
      icon: Thermometer,
      title: "Stay hydrated during outdoor activity",
      description: `Warm at ${city.temp}°C — take regular breaks and keep fluids up.`,
      priority: "Moderate",
    });
  }

  if (typeof city.humidity === "number" && city.humidity >= 75) {
    recs.push({
      icon: Droplets,
      title: "Pace outdoor exertion",
      description: `High humidity (${city.humidity}%) makes conditions feel heavier — take breaks outdoors.`,
      priority: "Moderate",
    });
  }

  if (recs.length < 2) {
    recs.push({
      icon: ShieldCheck,
      title: "Monitor environmental updates",
      description:
        "Conditions are currently favourable. Check back periodically before planning extended outdoor activity.",
      priority: "Low",
    });
  }

  return recs.slice(0, 3);
}

function RecCard({ rec, rank }: { rec: Rec; rank: number }) {
  const color = PRIORITY_COLOR[rec.priority];
  const Icon = rec.icon;
  const PIcon = PRIORITY_ICON[rec.priority];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-shadow duration-300 hover:shadow-md",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3, animationDelay: `${rank * 60}ms` }}
      aria-label={`${rec.priority} priority: ${rec.title}`}
    >
      <div
        className="size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium leading-snug">{rec.title}</span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0"
            style={{
              color,
              borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
              background: `color-mix(in oklab, ${color} 10%, transparent)`,
            }}
          >
            <PIcon className="size-2.5" aria-hidden="true" />
            {rec.priority}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AiSummary({ className }: { className?: string }) {
  const { city } = useCity();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-city-insights", city.id],
    queryFn: async () => {
      const res = await copilotApi.cityInsights(city.id);
      return res.data.insights.environmentalSummary as string;
    },
    enabled: !!city.id,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isLoading) return <EnvAISummarySkeleton className={className} />;

  const summary = !isError && data ? data : buildLocalSummary(city);
  const confidence = dataCompleteness(city);
  const chips = buildSignalChips(city);
  const reasoning = buildReasoningPoints(city);
  const recs = buildRecs(city);
  const band = findAqiBand(city.aqi);

  if (!summary) {
    return (
      <EnvEmptyState
        className={className}
        title="An environmental summary is unavailable right now."
        description="This section will update once environmental data is available."
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1 — AI Summary card */}
      <div
        className={cn(
          "glass rounded-2xl p-6 md:p-8 space-y-5",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded-lg grid place-items-center shrink-0"
              style={{
                background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
                color: band.color,
              }}
              aria-hidden="true"
            >
              <Sparkles className="size-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block">
                GreenGuard AI
              </span>
              <span className="text-sm font-semibold">Environmental Summary</span>
            </div>
          </div>
          {/* Confidence badge */}
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border shrink-0"
            style={{
              color: confidence.color,
              borderColor: `color-mix(in oklab, ${confidence.color} 35%, transparent)`,
              background: `color-mix(in oklab, ${confidence.color} 10%, transparent)`,
            }}
            aria-label={`${confidence.label}: ${confidence.description}`}
            title={confidence.description}
          >
            {confidence.label}
          </span>
        </div>

        {/* Summary text */}
        <p className="text-sm leading-relaxed">{summary}</p>

        {/* Signal chips */}
        {chips.length > 0 && <SignalChips chips={chips} />}

        {isError && (
          <p className="text-[11px] text-muted-foreground italic">
            AI summary unavailable — showing a data-based summary instead.
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Informational only — not medical advice.
        </p>
      </div>

      {/* 2 — Reasoning panel + Recommendations side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reasoning */}
        <div
          className={cn(
            "glass rounded-2xl p-6 md:p-8 space-y-4",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
          )}
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Reasoning
            </span>
            <h3 className="text-sm font-semibold mt-1">Why this is happening</h3>
          </div>
          <ul className="space-y-3">
            {reasoning.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
              >
                <span
                  className="mt-1.5 size-1.5 rounded-full bg-primary/60 shrink-0"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Smart Recommendations */}
        <div
          className={cn(
            "glass rounded-2xl p-6 md:p-8 space-y-4",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
          )}
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Recommendations
            </span>
            <h3 className="text-sm font-semibold mt-1">Smart recommendations</h3>
          </div>
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <RecCard key={rec.title} rec={rec} rank={i} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Recommendations are informational only and are not medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
