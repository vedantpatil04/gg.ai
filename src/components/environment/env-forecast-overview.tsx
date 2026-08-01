import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CloudSun, ArrowRight } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { environmentalApi } from "@/lib/api/environmental.api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Weather Forecast Gateway CTA Card.
 *
 * Keeps Environmental Overview focused on current conditions while serving as a
 * compact enterprise gateway to the dedicated Forecast module (/forecast).
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

  const isAvailable = !isLoading && !isError && Array.isArray(days) && days.length > 0;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 min-h-[180px] max-h-[220px]",
        className,
      )}
    >
      {/* Left Column: Icon + Header + Description + Status Badge */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div
          className="size-12 md:size-14 rounded-2xl grid place-items-center shrink-0 border border-primary/20"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
            color: "var(--color-primary)",
          }}
          aria-hidden="true"
        >
          <CloudSun className="size-6 md:size-7" />
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-xl font-bold tracking-tight">Weather Forecast</h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                isAvailable
                  ? "border-success/30 text-success bg-success/10"
                  : "border-warning/30 text-warning bg-warning/10",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  background: isAvailable ? "var(--color-success)" : "var(--color-warning)",
                }}
                aria-hidden="true"
              />
              Forecast Service · {isAvailable ? "Available" : "Temporarily Unavailable"}
            </span>
          </div>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            View hourly, daily, and long-range weather forecasts for {city.name} with AI-powered predictive intelligence.
          </p>

          {!isAvailable && !isLoading && (
            <p className="text-xs text-muted-foreground/70 pt-0.5">
              Forecast data is temporarily unavailable. You can still open the Forecast Center to retry or view cached data.
            </p>
          )}
        </div>
      </div>

      {/* Right Column: CTA Button navigating to /forecast */}
      <div className="shrink-0 self-stretch md:self-center flex items-center">
        <Link to="/forecast">
          <Button
            size="lg"
            className="w-full md:w-auto h-11 px-6 text-base font-semibold gap-2 rounded-xl shadow-sm hover:shadow transition-all group"
          >
            <span>Open Forecast Center</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
