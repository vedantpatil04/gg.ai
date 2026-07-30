import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Info,
  Flame,
  Droplets,
  Wind,
  FlaskConical,
  ShieldAlert,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { alertApi } from "@/lib/api/services.api";
import { EnvAlertsSkeleton } from "@/components/environment/env-alerts-skeleton";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Environmental Alerts & Notifications (Phase 9).
 *
 * Upgrades the flat alert row list into a premium live monitoring center:
 *   • Severity filter tabs (All / Critical / Warning / Info).
 *   • Alert summary strip — count per severity at a glance.
 *   • Premium alert cards — AQI-reactive accent, category icon, severity
 *     badge, pulse-dot on critical, expandable description.
 *   • Contextual action suggestions derived from real alert severities.
 *
 * Same query key ["active-alerts", city.id] — no new API call.
 * All animations use motion-safe: — reduced-motion safe.
 */

// ─── Types & constants ────────────────────────────────────────────────────────

type AlertSeverity = "info" | "warning" | "critical";
type AlertCategory = "air" | "water" | "heat" | "flood" | "chemical" | "general";
type FilterKey = "all" | AlertSeverity;

interface EnvAlert {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category?: AlertCategory;
  area?: string;
  createdAt?: string;
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: "Informational",
  warning: "Warning",
  critical: "Critical",
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: "var(--color-info, hsl(200 80% 55%))",
  warning: "var(--color-warning)",
  critical: "var(--color-destructive)",
};

const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  air: "Air Quality",
  water: "Water Quality",
  heat: "Heat",
  flood: "Flood Risk",
  chemical: "Chemical Hazard",
  general: "General",
};

const CATEGORY_ICON: Record<AlertCategory, LucideIcon> = {
  air: Wind,
  water: Droplets,
  heat: Flame,
  flood: Droplets,
  chemical: FlaskConical,
  general: Info,
};

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

// ─── Contextual action suggestions ───────────────────────────────────────────

function deriveActions(alerts: EnvAlert[]): string[] {
  const actions: string[] = [];
  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");
  const hasAir = alerts.some((a) => a.category === "air");
  const hasHeat = alerts.some((a) => a.category === "heat");
  const hasWater = alerts.some((a) => a.category === "water");

  if (hasCritical) actions.push("Monitor local conditions closely until alerts are resolved.");
  if (hasAir) actions.push("Review current air quality details before planning outdoor activity.");
  if (hasHeat) actions.push("Avoid prolonged outdoor exposure during the hottest part of the day.");
  if (hasWater) actions.push("Check local water quality advisories before consumption.");
  if (hasWarning && !hasCritical)
    actions.push("Conditions are worth monitoring — recheck alerts later.");
  if (actions.length === 0)
    actions.push("Stay informed and recheck environmental alerts periodically.");

  return actions.slice(0, 3);
}

// ─── Alert summary strip ──────────────────────────────────────────────────────

function AlertSummaryStrip({ alerts }: { alerts: EnvAlert[] }) {
  const counts: Record<AlertSeverity, number> = { critical: 0, warning: 0, info: 0 };
  alerts.forEach((a) => {
    counts[a.severity] = (counts[a.severity] ?? 0) + 1;
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {(["critical", "warning", "info"] as AlertSeverity[]).map((sev) => {
        const color = SEVERITY_COLOR[sev];
        const Icon = SEVERITY_ICON[sev];
        return (
          <div
            key={sev}
            className="flex flex-col items-center gap-1 rounded-xl border p-3"
            style={{
              borderColor: `color-mix(in oklab, ${color} 30%, var(--color-border))`,
              background: `color-mix(in oklab, ${color} 8%, var(--color-card))`,
            }}
          >
            <Icon className="size-4" style={{ color }} aria-hidden="true" />
            <span className="text-xl font-bold tabular-nums" style={{ color }}>
              {counts[sev]}
            </span>
            <span className="text-[10px] text-muted-foreground">{SEVERITY_LABEL[sev]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Individual alert card ────────────────────────────────────────────────────

function AlertCard({ alert, rank }: { alert: EnvAlert; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLOR[alert.severity];
  const SeverityIcon = SEVERITY_ICON[alert.severity];
  const CategoryIcon = alert.category ? CATEGORY_ICON[alert.category] : undefined;
  const severityLabel = SEVERITY_LABEL[alert.severity];
  const categoryLabel = alert.category ? CATEGORY_LABEL[alert.category] : undefined;
  const timeLabel = alert.createdAt
    ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })
    : undefined;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 glass transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{
        borderColor: `color-mix(in oklab, ${color} 28%, var(--color-border))`,
        animationDelay: `${rank * 50}ms`,
      }}
      aria-label={`${severityLabel} alert: ${alert.title}`}
    >
      <div className="flex gap-3">
        {/* Severity icon + pulse dot for critical */}
        <div
          className="relative size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
          aria-hidden="true"
        >
          <SeverityIcon className="size-4" />
          {alert.severity === "critical" && (
            <span
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full pulse-dot"
              style={{ background: color }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold leading-snug">{alert.title}</span>
            {timeLabel && (
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {timeLabel}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                background: `color-mix(in oklab, ${color} 12%, transparent)`,
              }}
            >
              <SeverityIcon className="size-2.5" aria-hidden="true" />
              {severityLabel}
            </span>
            {categoryLabel && CategoryIcon && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                <CategoryIcon className="size-2.5" aria-hidden="true" />
                {categoryLabel}
              </span>
            )}
            {alert.area && (
              <span className="text-[10px] text-muted-foreground">· {alert.area}</span>
            )}
          </div>

          {/* Description — truncated, expandable */}
          <p
            className={cn(
              "text-xs text-muted-foreground leading-relaxed",
              !expanded && "line-clamp-2",
            )}
          >
            {alert.description}
          </p>
          {alert.description.length > 100 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Actions panel ────────────────────────────────────────────────────────────

function ActionsPanel({ alerts }: { alerts: EnvAlert[] }) {
  const actions = deriveActions(alerts);
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 md:p-6 space-y-3",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Recommended Actions
      </span>
      <ul className="space-y-2">
        {actions.map((action, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
          >
            <CheckCircle2 className="size-3.5 shrink-0 mt-0.5 text-primary/60" aria-hidden="true" />
            {action}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Recommendations are informational only and are not medical advice.
      </p>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EnvAlerts({ className }: { className?: string }) {
  const { city } = useCity();
  const [filter, setFilter] = useState<FilterKey>("all");

  const {
    data: alerts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["active-alerts", city.id],
    queryFn: async () => {
      const res = await alertApi.getActive(city.id);
      return (res?.data?.alerts ?? []) as EnvAlert[];
    },
    enabled: !!city.id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isLoading) return <EnvAlertsSkeleton className={className} />;

  if (isError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refetch}
        retryDisabled={false}
        message="Unable to load environmental alerts."
      />
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <EnvEmptyState
        className={className}
        title="No active environmental alerts"
        description="Current environmental conditions do not indicate any active alerts."
      />
    );
  }

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  // Sort: critical first, then warning, then info; within each group, newest first
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  const sorted = [...filtered].sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary strip */}
      <AlertSummaryStrip alerts={alerts} />

      {/* Filter tabs */}
      <div
        className="flex items-center gap-2 flex-wrap"
        role="group"
        aria-label="Filter alerts by severity"
      >
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn(
              "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              filter === key
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {FILTER_LABELS[key]}
            {key !== "all" && (
              <span className="ml-1 opacity-60">
                ({alerts.filter((a) => a.severity === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert cards */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No {filter} alerts at this time.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((alert, i) => (
            <AlertCard key={alert._id ?? alert.id ?? alert.title} alert={alert} rank={i} />
          ))}
        </div>
      )}

      {/* Actions panel */}
      <ActionsPanel alerts={alerts} />
    </div>
  );
}
