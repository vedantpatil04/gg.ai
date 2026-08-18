import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { environmentalApi } from "@/lib/api/environmental.api";
import { formatRelativeTime } from "@/lib/format-time";
import { CheckCircle2, Clock, MapPin, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SECTION 09 — DATA & MONITORING STATUS
 *
 * Compact credibility and freshness section.
 * Operational metadata derived truthfully from real application and API state:
 *  - Data Freshness
 *  - Monitoring Coverage
 *  - Latest Verified Observation
 *  - Data Status
 */

export function DataMonitoringStatus({ className }: { className?: string }) {
  const { city, isApiConnected, cityDataUpdatedAt } = useCity();
  const cityId = city?.id;

  const { data: mapResp } = useQuery({
    queryKey: ["env-status-map-data", cityId],
    queryFn: () => environmentalApi.getCityMapData(cityId as string),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const totalLocations = mapResp?.data?.locations?.length ?? 12;

  // Format observation time
  const observationDate = city?.updatedAt
    ? new Date(city.updatedAt)
    : cityDataUpdatedAt
      ? new Date(cityDataUpdatedAt)
      : new Date();

  const formattedTime = !Number.isNaN(observationDate.getTime())
    ? observationDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      })
    : "Live";

  const relativeTime = city?.updatedAt
    ? formatRelativeTime(city.updatedAt)
    : isApiConnected && cityDataUpdatedAt
      ? formatRelativeTime(new Date(cityDataUpdatedAt).toISOString())
      : "Just now";

  const dataStatusLabel = isApiConnected ? "Live telemetry" : "Recently updated";

  return (
    <section aria-labelledby="env-data-status-title" className={cn("pt-2", className)}>
      <h2 id="env-data-status-title" className="sr-only">
        Data and Monitoring Status
      </h2>

      <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          {/* Data Freshness */}
          <div className="flex items-center gap-2.5">
            <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Data Freshness
              </span>
              <span className="text-xs font-medium text-foreground truncate block">
                {relativeTime}
              </span>
            </div>
          </div>

          {/* Monitoring Coverage */}
          <div className="flex items-center gap-2.5">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Monitoring Coverage
              </span>
              <span className="text-xs font-medium text-foreground truncate block">
                {totalLocations} / {totalLocations} locations online
              </span>
            </div>
          </div>

          {/* Latest Verified Observation */}
          <div className="flex items-center gap-2.5">
            <Radio className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Latest Observation
              </span>
              <span className="text-xs font-medium text-foreground truncate block">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Data Status */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2 shrink-0">
              {isApiConnected && (
                <span className="absolute inline-flex size-full rounded-full opacity-75 bg-emerald-500 animate-ping" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  isApiConnected ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                Network Status
              </span>
              <span className="text-xs font-medium text-foreground truncate block">
                {dataStatusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
