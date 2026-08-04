import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CloudSun, ArrowRight, CloudOff } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { environmentalApi } from "@/lib/api/environmental.api";
import { cn } from "@/lib/utils";

/**
 * Phase 1 — Weather Forecast Gateway.
 *
 * Design principles:
 *  - Acts as a premium gateway to /forecast — clear single call to action
 *  - Data status is communicated subtly, not alarmingly
 *  - The card breathes: generous padding, whitespace, no cramped info
 *  - CTA button is the visual anchor on desktop
 *  - Mobile: stacks vertically with CTA below
 */

export function ForecastOverview({ className }: { className?: string }) {
  const { city } = useCity();

  const { data: days, isLoading, isError } = useQuery({
    queryKey: ["weather-forecast", city.id],
    queryFn: async () => {
      const res = await environmentalApi.getCityWeatherForecast(city.id);
      return res?.data?.days ?? [];
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  const isAvailable =
    !isLoading && !isError && Array.isArray(days) && days.length > 0;

  return (
    <div
      className={cn(
        "glass rounded-2xl overflow-hidden",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500",
        className,
      )}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 p-6 md:p-8">
        {/* Icon */}
        <div
          className="size-12 rounded-2xl grid place-items-center shrink-0"
          style={{
            background: isAvailable
              ? "color-mix(in oklab, var(--color-primary) 11%, transparent)"
              : "oklch(1 0 0 / 0.06)",
            color: isAvailable ? "var(--color-primary)" : "oklch(0.55 0.012 230)",
            border: `1px solid ${isAvailable ? "color-mix(in oklab, var(--color-primary) 20%, transparent)" : "oklch(1 0 0 / 0.08)"}`,
          }}
          aria-hidden="true"
        >
          {isAvailable ? (
            <CloudSun className="size-6" />
          ) : (
            <CloudOff className="size-5.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Weather &amp; Forecast Intelligence
            </h3>

            {/* Status badge */}
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full border whitespace-nowrap"
              style={
                isAvailable
                  ? {
                      color: "var(--color-success)",
                      borderColor: "color-mix(in oklab, var(--color-success) 28%, transparent)",
                      background: "color-mix(in oklab, var(--color-success) 9%, transparent)",
                    }
                  : {
                      color: "var(--color-warning)",
                      borderColor: "color-mix(in oklab, var(--color-warning) 28%, transparent)",
                      background: "color-mix(in oklab, var(--color-warning) 9%, transparent)",
                    }
              }
            >
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ background: isAvailable ? "var(--color-success)" : "var(--color-warning)" }}
                aria-hidden="true"
              />
              {isAvailable ? "Live data" : "Temporarily limited"}
            </span>
          </div>

          <p
            className="text-sm leading-relaxed max-w-lg"
            style={{ color: "oklch(0.55 0.014 230)" }}
          >
            {isAvailable
              ? `Hourly, daily, and long-range forecasts for ${city.name} — with AI-powered predictive analysis.`
              : `Forecast data for ${city.name} is temporarily limited. Open the Forecast Center to view any available or cached data.`}
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 w-full md:w-auto">
          <Link to="/forecast">
            <button
              type="button"
              className={cn(
                "group inline-flex items-center justify-center gap-2 w-full md:w-auto",
                "h-10 px-5 rounded-xl text-sm font-semibold",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
                boxShadow: "0 2px 8px color-mix(in oklab, var(--color-primary) 30%, transparent)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.92";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 16px color-mix(in oklab, var(--color-primary) 38%, transparent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 2px 8px color-mix(in oklab, var(--color-primary) 30%, transparent)";
              }}
            >
              Open Forecast Center
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
