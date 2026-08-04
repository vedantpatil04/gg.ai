import { Bike, PersonStanding, Users, Footprints, ShieldCheck } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { EnvHealthRecommendationSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Phase 3 — Today's Health Guidance (upgraded).
 *
 * Additions over Phase 2:
 *  - Activity Suitability matrix: four activity types with a clear
 *    suitable / limited / avoid rating per current AQI.
 *  - Sensitive group advisory with a dedicated visual callout.
 *  - Supporting factors kept but relabeled as "Supporting readings".
 *  - All content is informational — medical disclaimer prominent.
 *
 * Business logic: same useCity() + findAqiBand + HEALTH_STATUS_BY_BAND.
 * No new API, no fabricated data.
 */

// ─── Activity suitability ────────────────────────────────────────────────────

type ActivityRating = "Suitable" | "Limited" | "Avoid";

interface ActivityItem {
  icon: typeof Bike;
  label: string;
  audience: string;
  rating: ActivityRating;
  note: string;
}

function buildActivityItems(aqi: number): ActivityItem[] {
  const ratingColor: Record<ActivityRating, string> = {
    Suitable: "var(--color-success)",
    Limited:  "hsl(45 90% 55%)",
    Avoid:    "hsl(28 90% 55%)",
  };

  function rate(good: number, limited: number): ActivityRating {
    return aqi <= good ? "Suitable" : aqi <= limited ? "Limited" : "Avoid";
  }

  return [
    {
      icon: Bike,
      label: "Vigorous outdoor sport",
      audience: "General population",
      rating: rate(50, 100),
      note: aqi <= 50 ? "No restrictions."
        : aqi <= 100 ? "Consider shorter sessions."
        : "Avoid prolonged exertion outdoors.",
    },
    {
      icon: PersonStanding,
      label: "Light outdoor activity",
      audience: "General population",
      rating: rate(100, 150),
      note: aqi <= 100 ? "Suitable for most people."
        : aqi <= 150 ? "Short walks are acceptable."
        : "Limit outdoor time where possible.",
    },
    {
      icon: Footprints,
      label: "Outdoor activity",
      audience: "Sensitive groups",
      rating: rate(50, 100),
      note: aqi <= 50 ? "No restrictions for sensitive individuals."
        : aqi <= 100 ? "Sensitive individuals should shorten outdoor sessions."
        : "Sensitive groups should remain indoors where possible.",
    },
    {
      icon: Users,
      label: "Outdoor activity",
      audience: "Children & elderly",
      rating: rate(50, 100),
      note: aqi <= 50 ? "No restrictions for children or elderly."
        : aqi <= 100 ? "Supervise and shorten outdoor time for children."
        : "Children and elderly should avoid outdoor activity.",
    },
  ];
}

function ActivityRatingBadge({ rating }: { rating: ActivityRating }) {
  const styles: Record<ActivityRating, { color: string; bg: string }> = {
    Suitable: { color: "var(--color-success)",  bg: "color-mix(in oklab, var(--color-success) 12%, transparent)" },
    Limited:  { color: "hsl(45 90% 55%)",       bg: "color-mix(in oklab, hsl(45 90% 55%) 12%, transparent)"    },
    Avoid:    { color: "hsl(28 90% 55%)",        bg: "color-mix(in oklab, hsl(28 90% 55%) 12%, transparent)"    },
  };
  const s = styles[rating];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
      style={{ color: s.color, background: s.bg }}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {rating}
    </span>
  );
}

// ─── AQI status badge ────────────────────────────────────────────────────────

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-base font-semibold px-3.5 py-1.5 rounded-full border w-fit"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
      aria-label={`Air quality status: ${label}`}
    >
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Supporting factor pill ───────────────────────────────────────────────────

function SupportingFactor({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      aria-label={`${label}: ${value}`}
    >
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold" aria-hidden="true">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums" aria-hidden="true">{value}</span>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function HealthRecommendation({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) return <EnvHealthRecommendationSkeleton className={className} />;

  if (isCityError) {
    return (
      <EnvErrorState className={className} onRetry={refreshCity} retryDisabled={false}
        message="Unable to load health guidance data." />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState className={className}
        title="Health guidance is unavailable until environmental data is loaded." />
    );
  }

  const band = findAqiBand(city.aqi);
  const recommendation = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  const activities = buildActivityItems(city.aqi);
  const hasSensitiveAdvisory = city.aqi > 50;

  const factors: { label: string; value: string }[] = [];
  if (typeof city.pm25 === "number")    factors.push({ label: "PM2.5",       value: `${city.pm25} µg/m³` });
  if (typeof city.humidity === "number") factors.push({ label: "Humidity",    value: `${city.humidity}%` });
  if (typeof city.temp === "number")     factors.push({ label: "Temperature", value: `${city.temp}°C` });

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5 glass-hover",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      {/* AQI status */}
      <CategoryBadge label={band.label} color={band.color} />

      {/* Main guidance text */}
      <p className="text-base md:text-lg leading-relaxed font-medium">{recommendation}</p>

      {/* Sensitive group advisory callout */}
      {hasSensitiveAdvisory && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: "color-mix(in oklab, hsl(45 90% 55%) 8%, transparent)",
            border: "1px solid color-mix(in oklab, hsl(45 90% 55%) 25%, transparent)",
          }}
        >
          <ShieldCheck
            className="size-4 shrink-0 mt-0.5"
            style={{ color: "hsl(45 90% 55%)" }}
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(45 90% 55%)" }}>
              Sensitive group advisory
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {city.aqi <= 100
                ? "People with asthma, heart disease, or respiratory conditions, as well as children and elderly individuals, should consider limiting prolonged outdoor activity."
                : "Those with respiratory or cardiovascular conditions, children under 14, and adults over 65 should avoid prolonged outdoor exposure and consider remaining indoors."}
            </p>
          </div>
        </div>
      )}

      {/* Activity suitability matrix */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-muted-foreground">
          Activity suitability
        </p>
        <div className="space-y-2">
          {activities.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={`${a.label}-${a.audience}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className="size-7 rounded-lg grid place-items-center shrink-0"
                  style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}
                  aria-hidden="true"
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-none truncate">{a.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{a.audience}</div>
                </div>
                <ActivityRatingBadge rating={a.rating} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Supporting readings */}
      {factors.length > 0 && (
        <div className="pt-1 border-t border-border space-y-3">
          <p className="text-[9px] uppercase tracking-[0.20em] text-muted-foreground font-bold">
            Supporting readings
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${factors.length}, 1fr)` }}
            role="list"
            aria-label="Supporting environmental readings"
          >
            {factors.map((f) => (
              <div key={f.label} role="listitem">
                <SupportingFactor label={f.label} value={f.value} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Informational only — not medical advice. Consult a healthcare professional for personal health decisions.
      </p>
    </div>
  );
}
