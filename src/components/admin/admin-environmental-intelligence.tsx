import { Wind, AlertTriangle, CloudRain, MapPinned, Loader2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { ExecutiveDashboardData } from "@/lib/api/command.api";
import { useAdminExecutiveDashboard, useActiveAlertsNetwork } from "./admin-dashboard-queries";

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground truncate">{hint}</div>}
      </div>
    </div>
  );
}

/** Alert categories that map to weather (rather than pollution) conditions.
 *  "flood" is included since flash-flood/heavy-rain warnings are weather
 *  advisories in this schema, same as "heat". */
const WEATHER_CATEGORIES = new Set(["heat", "flood"]);

/**
 * Reuses the existing /api/command/executive-dashboard endpoint (already
 * built for Command Center) — no new backend aggregation needed. Weather
 * Warnings is the one figure derived client-side from the alerts list
 * already being fetched for this same panel.
 */
export function AdminEnvironmentalIntelligence() {
  const dashboard = useAdminExecutiveDashboard();
  const alerts = useActiveAlertsNetwork();

  if (dashboard.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <p className="text-sm text-destructive">Couldn't load environmental data. Try refreshing.</p>
    );
  }

  const d = dashboard.data?.data as (ExecutiveDashboardData & { empty?: boolean }) | undefined;

  if (!d || d.empty) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No environmental data available. Run the data ingestion scheduler or seed the database.
      </p>
    );
  }

  const weatherWarnings = (alerts.data ?? []).filter(
    (a: { category?: string }) => a.category && WEATHER_CATEGORIES.has(a.category),
  ).length;

  const criticalCityNames = d.highRiskCities
    .slice(0, 3)
    .map((c) => c.cityName)
    .join(", ");

  return (
    <div className="grid grid-cols-2 gap-y-5 gap-x-3">
      <MiniStat
        icon={Wind}
        label="Average AQI"
        value={d.network.avgAqi}
        hint={`Across ${d.network.cityCount} cities`}
      />
      <MiniStat
        icon={MapPinned}
        label="Critical Cities"
        value={d.highRiskCities.length}
        hint={criticalCityNames || "None currently"}
      />
      <MiniStat
        icon={AlertTriangle}
        label="Active Alerts"
        value={d.alerts.active}
        hint="Network-wide, all categories"
      />
      <MiniStat
        icon={CloudRain}
        label="Weather Warnings"
        value={alerts.isLoading ? "…" : weatherWarnings}
        hint="Heat & flood advisories"
      />
    </div>
  );
}
