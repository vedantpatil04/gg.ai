import { Wind, AlertTriangle, CloudRain, MapPinned, Loader2, ChevronRight, Activity } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ExecutiveDashboardData } from "@/lib/api/command.api";
import { useAdminExecutiveDashboard, useActiveAlertsNetwork } from "./admin-dashboard-queries";

function getAqiBadge(aqi: number) {
  if (aqi <= 50) return { label: "Good", tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  if (aqi <= 100) return { label: "Moderate", tone: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
  if (aqi <= 150) return { label: "Sensitive", tone: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
  return { label: "Unhealthy", tone: "text-destructive bg-destructive/10 border-destructive/20" };
}

function EnvMetricTile({
  icon: Icon,
  label,
  value,
  hint,
  badge,
  to,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: string;
  badge?: { label: string; tone: string };
  to?: string;
  tone?: "default" | "warning" | "destructive" | "info";
}) {
  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40",
        "transition-all duration-150 h-full",
        to && "cursor-pointer hover:border-border",
      )}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-md bg-muted/80 grid place-items-center text-muted-foreground shrink-0">
            <Icon className="size-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 truncate">
            {label}
          </span>
        </div>
        {badge && (
          <span className={cn("text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0", badge.tone)}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="my-1 flex items-baseline justify-between">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums font-display">
          {value}
        </div>
      </div>

      {hint && (
        <div className="text-[10.5px] text-muted-foreground/75 truncate mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

/** Alert categories that map to weather (rather than pollution) conditions. */
const WEATHER_CATEGORIES = new Set(["heat", "flood"]);

/**
 * Environmental Intelligence Executive Panel for the Admin Dashboard.
 */
export function AdminEnvironmentalIntelligence() {
  const dashboard = useAdminExecutiveDashboard();
  const alerts = useActiveAlertsNetwork();

  if (dashboard.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Connecting to environmental telemetry…</span>
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive">
        Couldn't load environmental telemetry. Try refreshing the dashboard.
      </div>
    );
  }

  const d = dashboard.data?.data as (ExecutiveDashboardData & { empty?: boolean }) | undefined;

  if (!d || d.empty) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        No environmental telemetry available.
      </p>
    );
  }

  const weatherWarnings = (alerts.data ?? []).filter(
    (a: { category?: string }) => a.category && WEATHER_CATEGORIES.has(a.category),
  ).length;

  const criticalCityNames = d.highRiskCities
    .slice(0, 2)
    .map((c) => c.cityName)
    .join(", ");

  const aqiBadge = getAqiBadge(Number(d.network.avgAqi) || 0);

  return (
    <div className="space-y-3">
      {/* 2x2 Structured Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Average AQI */}
        <EnvMetricTile
          icon={Wind}
          label="Average AQI"
          value={d.network.avgAqi}
          badge={aqiBadge}
          hint={`Monitored across ${d.network.cityCount} cities`}
          to="/admin/environmental-monitoring"
        />

        {/* Critical Cities */}
        <EnvMetricTile
          icon={MapPinned}
          label="Critical Cities"
          value={d.highRiskCities.length}
          badge={
            d.highRiskCities.length > 0
              ? { label: "Attention", tone: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
              : { label: "Optimal", tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" }
          }
          hint={criticalCityNames ? `High risk: ${criticalCityNames}` : "All cities in safe limits"}
          to="/admin/cities"
        />

        {/* Active Alerts */}
        <EnvMetricTile
          icon={AlertTriangle}
          label="Active Alerts"
          value={d.alerts.active}
          badge={
            d.alerts.active > 0
              ? { label: "Active", tone: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
              : { label: "Clear", tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" }
          }
          hint="Network pollution advisories"
          to="/admin/environmental-monitoring"
        />

        {/* Weather Warnings */}
        <EnvMetricTile
          icon={CloudRain}
          label="Weather Warnings"
          value={alerts.isLoading ? "…" : weatherWarnings}
          badge={
            weatherWarnings > 0
              ? { label: "Weather", tone: "text-sky-500 bg-sky-500/10 border-sky-500/20" }
              : { label: "Normal", tone: "text-muted-foreground bg-muted border-border/40" }
          }
          hint="Heatwave & flood advisories"
          to="/admin/environmental-monitoring"
        />
      </div>

      {/* Footer link to Hub */}
      <Link
        to="/admin/environmental-monitoring"
        className="flex items-center justify-between pt-2 border-t border-border/50 text-[11.5px] font-medium text-muted-foreground hover:text-primary transition-colors select-none"
      >
        <span className="flex items-center gap-1.5">
          <Activity className="size-3.5 text-primary" />
          Open Environmental Monitoring Hub
        </span>
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}

