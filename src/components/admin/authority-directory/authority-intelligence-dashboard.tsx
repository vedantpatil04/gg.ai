import { useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RotateCcw,
  MapPin,
  TrendingUp,
  Loader2,
  Trophy,
  ShieldAlert,
  Info,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthorityDashboard, CAPACITY_META, type CapacityLabel } from "./authority-directory-queries";

function CapacityBadge({ capacity }: { capacity?: CapacityLabel }) {
  if (!capacity || !CAPACITY_META[capacity]) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const meta = CAPACITY_META[capacity];
  const classes = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    info: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    destructive: "bg-destructive/10 text-destructive border-destructive/25 font-bold",
    muted: "bg-muted/60 text-muted-foreground border-border/50",
  }[meta.tone];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 select-none",
        classes,
      )}
    >
      <span>{meta.label}</span>
    </span>
  );
}

function MetricTile({
  label,
  value,
  subtext,
  icon: Icon,
  colorClass = "text-foreground",
  bgClass = "bg-muted/10",
}: {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ElementType;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div className={cn("p-3.5 rounded-2xl border border-border/60 flex items-start justify-between gap-2.5 select-none", bgClass)}>
      <div className="min-w-0 space-y-1">
        <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 truncate">
          {label}
        </div>
        <div className={cn("text-xl sm:text-2xl font-bold font-display tabular-nums tracking-tight", colorClass)}>
          {value}
        </div>
        {subtext && <div className="text-[11px] text-muted-foreground/70 truncate">{subtext}</div>}
      </div>
      <div className="size-8 rounded-xl bg-muted/40 grid place-items-center text-muted-foreground shrink-0 mt-0.5">
        <Icon className="size-4" />
      </div>
    </div>
  );
}

function InsightRow({ type, message }: { type: "warning" | "info" | "critical"; message: string }) {
  const meta = {
    critical: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10 border-destructive/25" },
    warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/25" },
    info: { icon: Info, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/25" },
  }[type];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm select-none", meta.bg)}>
      <Icon className={cn("size-4 mt-0.5 shrink-0", meta.color)} />
      <span className="text-foreground/90 leading-relaxed">{message}</span>
    </div>
  );
}

export function AuthorityIntelligenceDashboard() {
  const { data, isLoading } = useAuthorityDashboard();

  const coverageHealth = useMemo(() => {
    if (!data) return "unknown";
    const { coveredCities, totalCities } = data.coverage;
    if (totalCities === 0) return "unknown";
    const pct = coveredCities / totalCities;
    if (pct >= 0.9) return "healthy";
    if (pct >= 0.6) return "moderate";
    return "critical";
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2.5 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-xs font-medium">Aggregating authority telemetry…</span>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, coverage, leaderboard, insights } = data;

  return (
    <div className="space-y-6">
      {/* ── 1. PRIMARY WORKFORCE CAPACITY METRICS ─────────────────────────── */}
      <div className="space-y-2">
        <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
          Workforce Deployment &amp; Availability
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <MetricTile
            label="Total Officers"
            value={metrics.total}
            icon={Users}
            colorClass="text-foreground"
          />
          <MetricTile
            label="Available"
            value={metrics.available}
            icon={UserCheck}
            colorClass="text-emerald-500"
            subtext="Ready for dispatch"
          />
          <MetricTile
            label="Busy"
            value={metrics.busy}
            icon={Briefcase}
            colorClass="text-sky-500"
          />
          <MetricTile
            label="Overloaded"
            value={metrics.overloaded}
            icon={AlertTriangle}
            colorClass="text-destructive"
            subtext=">5 active cases"
          />
          <MetricTile
            label="On Leave"
            value={metrics.onLeave}
            icon={Clock}
            colorClass="text-amber-500"
          />
          <MetricTile
            label="Inactive"
            value={metrics.inactive}
            icon={UserX}
            colorClass="text-muted-foreground"
          />
        </div>
      </div>

      {/* ── 2. ACTIVE INCIDENT PIPELINE TELEMETRY ─────────────────────────── */}
      <div className="space-y-2">
        <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
          Incident Workload &amp; Resolution Pipeline
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <MetricTile
            label="Active Investigations"
            value={metrics.activeInvestigations}
            icon={Briefcase}
            colorClass="text-sky-500"
          />
          <MetricTile
            label="Awaiting Verification"
            value={metrics.waitingVerification}
            icon={Clock}
            colorClass="text-violet-500"
          />
          <MetricTile
            label="Rework Cases"
            value={metrics.reworkCases}
            icon={RotateCcw}
            colorClass="text-destructive"
          />
          <MetricTile
            label="Pending Assignment"
            value={metrics.pendingComplaints}
            icon={CheckCircle2}
            colorClass="text-amber-500"
          />
        </div>
      </div>

      {/* ── 3. CITY COVERAGE & PERFORMANCE SUMMARY ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* City Coverage Panel */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/15 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Municipal Coverage Telemetry</h3>
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize",
                coverageHealth === "healthy"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                  : coverageHealth === "moderate"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
                    : "bg-destructive/10 text-destructive border-destructive/25",
              )}
            >
              {coverageHealth} Coverage
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="text-xl font-bold tabular-nums text-foreground">{coverage.totalCities}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Total Cities</div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <div className="text-xl font-bold tabular-nums text-emerald-500">{coverage.coveredCities}</div>
              <div className="text-[10px] text-emerald-500/80 uppercase font-bold tracking-wider mt-0.5">Covered</div>
            </div>
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
              <div className="text-xl font-bold tabular-nums text-destructive">{coverage.uncoveredCities}</div>
              <div className="text-[10px] text-destructive/80 uppercase font-bold tracking-wider mt-0.5">Uncovered</div>
            </div>
          </div>

          {coverage.uncoveredCityIds.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-muted-foreground font-medium">Cities requiring authority deployment:</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.uncoveredCityIds.map((c) => (
                  <span
                    key={c}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 capitalize font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(coverage.authoritiesPerCity).length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <p className="text-xs text-muted-foreground font-medium">Active officer distribution per city:</p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {Object.entries(coverage.authoritiesPerCity)
                  .sort(([, a], [, b]) => b - a)
                  .map(([city, count]) => (
                    <div key={city} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-foreground/80 font-medium">{city}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (count / Math.max(...Object.values(coverage.authoritiesPerCity))) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="w-5 text-right font-semibold tabular-nums text-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Leaderboard Panel */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/15 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">Officer Performance Summary</h3>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Min 3 Closed Cases
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-10">
              Insufficient historical data. Officers require at least 3 resolved complaints to appear in performance rankings.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {leaderboard.map((a, idx) => (
                <div
                  key={a._id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/40 transition-colors select-none"
                >
                  <div
                    className={cn(
                      "size-6 rounded-lg grid place-items-center text-[10.5px] font-bold shrink-0",
                      idx === 0
                        ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                        : idx === 1
                          ? "bg-muted text-muted-foreground border border-border/60"
                          : idx === 2
                            ? "bg-amber-500/10 text-amber-500/80 border border-amber-500/20"
                            : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{a.name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">
                      {a.total} total cases &middot; {a.active} active
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-500 tabular-nums">{a.resolutionRate}%</div>
                      <div className="text-[9.5px] text-muted-foreground">resolved</div>
                    </div>
                    <CapacityBadge capacity={a.capacity} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-muted-foreground text-xs">
            <TrendingUp className="size-3 text-primary" />
            <p className="text-[11px]">Ranked by verified resolution rate across logged complaints.</p>
          </div>
        </div>
      </div>

      {/* ── 4. OPERATIONAL INSIGHTS ───────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
            Operational Alerts &amp; Critical Insights
          </div>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <InsightRow key={i} type={ins.type} message={ins.message} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
