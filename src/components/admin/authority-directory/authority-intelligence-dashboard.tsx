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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard, Pill } from "@/components/ui-bits";
import { useAuthorityDashboard, type CapacityLabel } from "./authority-directory-queries";

const CAPACITY_META: Record<CapacityLabel, { label: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  free: { label: "Free", tone: "success" },
  moderate: { label: "Moderate", tone: "warning" },
  busy: { label: "Busy", tone: "warning" },
  overloaded: { label: "Overloaded", tone: "destructive" },
};

function InsightRow({ type, message }: { type: "warning" | "info" | "critical"; message: string }) {
  const meta = {
    critical: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/8 border-destructive/20" },
    warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/8 border-warning/20" },
    info: { icon: Info, color: "text-info", bg: "bg-info/8 border-info/20" },
  }[type];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-sm", meta.bg)}>
      <Icon className={cn("size-4 mt-0.5 shrink-0", meta.color)} />
      <span className="text-foreground/80">{message}</span>
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
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { metrics, coverage, leaderboard, insights } = data;

  return (
    <div className="space-y-6">
      {/* ── Metric grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Authorities"
          value={metrics.total}
          accent="primary"
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Available"
          value={metrics.available}
          accent="success"
          icon={<UserCheck className="size-4" />}
          hint="Ready for assignment"
        />
        <StatCard
          label="Busy"
          value={metrics.busy}
          accent="warning"
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          label="Overloaded"
          value={metrics.overloaded}
          accent="destructive"
          icon={<AlertTriangle className="size-4" />}
          hint=">10 active cases"
        />
        <StatCard
          label="On Leave"
          value={metrics.onLeave}
          accent="info"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Inactive"
          value={metrics.inactive}
          accent="destructive"
          icon={<UserX className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active Investigations"
          value={metrics.activeInvestigations}
          accent="primary"
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          label="Awaiting Verification"
          value={metrics.waitingVerification}
          accent="warning"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Rework Cases"
          value={metrics.reworkCases}
          accent="destructive"
          icon={<RotateCcw className="size-4" />}
        />
        <StatCard
          label="Pending Assignment"
          value={metrics.pendingComplaints}
          accent="info"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Coverage ── */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="font-semibold text-sm">City Coverage</h3>
            </div>
            <Pill
              tone={
                coverageHealth === "healthy"
                  ? "success"
                  : coverageHealth === "moderate"
                    ? "warning"
                    : "destructive"
              }
            >
              {coverageHealth === "healthy"
                ? "Healthy"
                : coverageHealth === "moderate"
                  ? "Moderate"
                  : "Critical"}
            </Pill>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-2xl font-semibold">{coverage.totalCities}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</div>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <div className="text-2xl font-semibold text-success">{coverage.coveredCities}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Covered</div>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3">
              <div className="text-2xl font-semibold text-destructive">{coverage.uncoveredCities}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Uncovered</div>
            </div>
          </div>

          {coverage.uncoveredCityIds.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cities without coverage:</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.uncoveredCityIds.map((c) => (
                  <span
                    key={c}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 capitalize"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(coverage.authoritiesPerCity).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Authorities per city:</p>
              {Object.entries(coverage.authoritiesPerCity)
                .sort(([, a], [, b]) => b - a)
                .map(([city, count]) => (
                  <div key={city} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-foreground/70">{city}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (count / Math.max(...Object.values(coverage.authoritiesPerCity))) * 100)}%` }}
                        />
                      </div>
                      <span className="w-4 text-right font-medium">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Leaderboard ── */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-warning" />
            <h3 className="font-semibold text-sm">Performance Leaderboard</h3>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Not enough data yet. Authorities need at least 3 closed cases to appear here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((a, idx) => (
                <div key={a._id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                      idx === 0
                        ? "bg-warning/15 text-warning"
                        : idx === 1
                          ? "bg-muted-foreground/15 text-muted-foreground"
                          : idx === 2
                            ? "bg-warning/10 text-warning/80"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground">{a.total} cases · {a.active} active</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-success">{a.resolutionRate}%</div>
                      <div className="text-[10px] text-muted-foreground">resolved</div>
                    </div>
                    <Pill tone={CAPACITY_META[a.capacity].tone}>{CAPACITY_META[a.capacity].label}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <TrendingUp className="size-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              Ranked by resolution rate · min 3 closed cases
            </p>
          </div>
        </div>
      </div>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Operational Insights
          </h3>
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
