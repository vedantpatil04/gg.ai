import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Loader2,
  CheckCircle2,
  Check,
  MapPin,
  Clock,
} from "lucide-react";
import { alertApi } from "@/lib/api/services.api";
import { environmentalApi } from "@/lib/api/environmental.api";
import { Panel, Pill } from "@/components/ui-bits";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Authority Environmental Alerts (Phase 7).
 *
 * Reuses the existing Alert model/API exactly as Mission Control's
 * top-5 preview does (alertApi.getActive / getForCity / acknowledge /
 * resolve — all pre-existing and already authorized server-side for
 * authority/administrator roles). No new alert system, no new severity
 * scale, no invented data — an alert with no active/history rows for a
 * city is shown as an empty state, not padded with anything fabricated.
 */

interface AlertRecord {
  _id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  status: "active" | "acknowledged" | "resolved";
  category: string;
  cityId: string;
  area: string;
  isAutomated: boolean;
  createdAt: string;
  updatedAt: string;
}

const SEVERITY_META: Record<string, { icon: typeof Info; tone: "info" | "warning" | "destructive" }> = {
  info: { icon: Info, tone: "info" },
  warning: { icon: AlertTriangle, tone: "warning" },
  critical: { icon: AlertOctagon, tone: "destructive" },
};

const CATEGORY_LABEL: Record<string, string> = {
  air: "Air Quality",
  water: "Water",
  heat: "Heat",
  flood: "Flood",
  chemical: "Chemical",
  general: "General",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AlertRow({
  alert,
  cityName,
  onAcknowledge,
  onResolve,
  isBusy,
}: {
  alert: AlertRecord;
  cityName: string;
  onAcknowledge: () => void;
  onResolve: () => void;
  isBusy: boolean;
}) {
  const meta = SEVERITY_META[alert.severity] ?? SEVERITY_META.info;
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Icon
        className={cn(
          "size-4 shrink-0 mt-0.5",
          meta.tone === "destructive" && "text-destructive",
          meta.tone === "warning" && "text-amber-600 dark:text-amber-400",
          meta.tone === "info" && "text-blue-600 dark:text-blue-400",
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug">{alert.title}</h4>
          <div className="flex items-center gap-1 shrink-0">
            <Pill tone={meta.tone}>{alert.severity}</Pill>
            <Pill tone={alert.status === "resolved" ? "success" : "muted"}>{alert.status}</Pill>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {alert.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {alert.area || cityName}, {cityName}
          </span>
          <span>{CATEGORY_LABEL[alert.category] ?? alert.category}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {timeAgo(alert.createdAt)}
          </span>
          {alert.isAutomated && <span>Automated</span>}
        </div>
        {alert.status !== "resolved" && (
          <div className="flex items-center gap-2 pt-1.5">
            {alert.status === "active" && (
              <button
                type="button"
                disabled={isBusy}
                onClick={onAcknowledge}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border/60 hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="size-3 animate-spin inline mr-1" /> : null}
                Acknowledge
              </button>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={onResolve}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <Check className="size-3" />
              Resolve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CityOption {
  id: string;
  name: string;
}

function normalizeCities(resp: unknown): CityOption[] {
  if (!resp) return [];
  let rawList: unknown[] = [];
  if (Array.isArray(resp)) {
    rawList = resp;
  } else if (typeof resp === "object" && resp !== null) {
    const obj = resp as Record<string, unknown>;
    if (Array.isArray(obj.cities)) {
      rawList = obj.cities;
    } else if (Array.isArray(obj.data)) {
      rawList = obj.data;
    } else if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.cities)) {
        rawList = nested.cities;
      }
    }
  }

  return rawList
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = String(item.id ?? item.cityId ?? item._id ?? "").trim();
      const name = String(item.name ?? item.cityName ?? id).trim();
      return { id, name };
    })
    .filter((c) => Boolean(c.id));
}

function extractAlerts(resp: unknown): AlertRecord[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp as AlertRecord[];
  const obj = resp as { data?: { alerts?: AlertRecord[] } | AlertRecord[]; alerts?: AlertRecord[] };
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.data?.alerts)) return obj.data.alerts;
  if (Array.isArray(obj.alerts)) return obj.alerts;
  return [];
}

export function AuthorityAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const jurisdictionCities = user?.assignedCities ?? [];
  const [cityFilter, setCityFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: citiesResp } = useQuery({
    queryKey: ["monitoring-cities"],
    queryFn: () => environmentalApi.getCities(),
    staleTime: 5 * 60_000,
  });
  const cities = useMemo(() => normalizeCities(citiesResp), [citiesResp]);
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? id;

  // Default view: real active alerts network-wide, with jurisdiction ones
  // pinned to the top. Selecting a specific city switches to that city's
  // full history (active + acknowledged + resolved) via getForCity.
  const { data: activeResp, isLoading: activeLoading, isError: activeError } = useQuery({
    queryKey: ["authority-active-alerts"],
    queryFn: () => alertApi.getActive(),
    enabled: !cityFilter,
    refetchInterval: 60_000,
  });
  const { data: cityResp, isLoading: cityLoading, isError: cityError } = useQuery({
    queryKey: ["authority-city-alerts", cityFilter],
    queryFn: () => alertApi.getForCity(cityFilter),
    enabled: !!cityFilter,
  });

  const isLoading = cityFilter ? cityLoading : activeLoading;
  const isError = cityFilter ? cityError : activeError;
  const currentResp = cityFilter ? cityResp : activeResp;
  const alerts = useMemo(() => extractAlerts(currentResp), [currentResp]);

  const jurisdictionAlerts = alerts.filter((a) => jurisdictionCities.includes(a.cityId));
  const otherAlerts = alerts.filter((a) => !jurisdictionCities.includes(a.cityId));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["authority-active-alerts"] });
    qc.invalidateQueries({ queryKey: ["authority-city-alerts", cityFilter] });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertApi.acknowledge(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: invalidate,
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertApi.resolve(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCityFilter("")}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
            !cityFilter
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30",
          )}
        >
          Active — All Cities
        </button>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="text-xs rounded-full border border-border/60 bg-background/50 px-3 py-1.5 outline-none focus:border-primary"
        >
          <option value="">View history for a city…</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Panel eyebrow="Environmental Alerts" title={cityFilter ? `${cityName(cityFilter)} — All Alerts` : "Active Alerts"}>
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            Loading alerts…
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive py-4">
            <AlertTriangle className="size-4 shrink-0" />
            We couldn't load alerts.
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
            <CheckCircle2 className="size-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No {cityFilter ? "" : "active "}alerts</p>
            <p className="text-xs mt-0.5">
              {cityFilter
                ? `${cityName(cityFilter)} has no recorded environmental alerts.`
                : "There are no active environmental alerts right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!cityFilter && jurisdictionAlerts.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Your Jurisdiction
                </div>
                {jurisdictionAlerts.map((a) => (
                  <AlertRow
                    key={a._id}
                    alert={a}
                    cityName={cityName(a.cityId)}
                    isBusy={busyId === a._id}
                    onAcknowledge={() => acknowledgeMutation.mutate(a._id)}
                    onResolve={() => resolveMutation.mutate(a._id)}
                  />
                ))}
              </div>
            )}
            <div>
              {!cityFilter && jurisdictionAlerts.length > 0 && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Other Cities
                </div>
              )}
              {(cityFilter ? alerts : otherAlerts).map((a) => (
                <AlertRow
                  key={a._id}
                  alert={a}
                  cityName={cityName(a.cityId)}
                  isBusy={busyId === a._id}
                  onAcknowledge={() => acknowledgeMutation.mutate(a._id)}
                  onResolve={() => resolveMutation.mutate(a._id)}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
