import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import {
  Loader2,
  ClipboardList,
  CheckCircle2,
  Clock,
  RotateCcw,
  Users,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { commandApi, type AuthorityAnalyticsData } from "@/lib/api/command.api";
import { Panel, StatCard, Pill, WorkspaceHeader, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { ISSUE_LABELS } from "./investigation-workspace";
import { useAuth } from "@/lib/auth-context";

const ISSUE_COLORS: Record<string, string> = {
  air_pollution: "var(--color-destructive)",
  water_contamination: "var(--color-info)",
  open_burning: "var(--color-warning)",
  noise: "var(--color-primary)",
  waste_dumping: "var(--color-success)",
  chemical_spill: "#a855f7",
  other: "var(--color-muted-foreground)",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "#f97316",
  critical: "var(--color-destructive)",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  awaiting_citizen_review: "Awaiting Citizen Review",
  resolved: "Awaiting Verification",
  rework: "Rework",
  rejected: "Rejected",
  closed: "Closed",
};

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtHours(h?: number): string {
  if (h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export function AuthorityAnalytics() {
  const { user } = useAuth();
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data: res, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["authority-analytics", days],
    queryFn: () => commandApi.getAuthorityAnalytics(days),
    staleTime: 60_000,
  });

  const d = res?.data as AuthorityAnalyticsData | undefined;

  const handleExport = async () => {
    const blob = await commandApi.exportOperationsReportPdf(days);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `greenguard-operations-report-${dateStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="ANALYTICS · MY WORKLOAD"
        title={user?.role === "administrator" ? "Network Complaint Analytics" : "My Complaint Workload"}
        description={
          user?.role === "administrator"
            ? "Operational analytics across all complaints in the network."
            : "Operational analytics for complaints assigned to you — scoped to your own queue."
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {([7, 30, 90] as const).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={days === n ? "default" : "outline"}
                  onClick={() => setDays(n)}
                  aria-pressed={days === n}
                  className="text-xs"
                >
                  {n}D
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "size-3.5 mr-1.5 animate-spin" : "size-3.5 mr-1.5"} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleExport} disabled={!d}>
              Export PDF
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading workload analytics…</span>
        </div>
      ) : isError || !d ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="Unable to load analytics"
          description="Please try refreshing."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : d.kpis.totalAssigned === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No complaints yet"
          description={
            d.scope === "assigned"
              ? "No complaints have been assigned to you yet."
              : "No complaints exist in the network yet."
          }
        />
      ) : (
        <>
          {/* ── KPI row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              label="Total"
              value={d.kpis.totalAssigned}
              accent="info"
              icon={<ClipboardList className="size-4" />}
              hint={d.scope === "assigned" ? "Assigned to you" : "Network-wide"}
            />
            <StatCard label="In Progress" value={d.kpis.inProgress} accent="warning" icon={<Clock className="size-4" />} />
            <StatCard
              label="Awaiting Review"
              value={d.kpis.awaitingCitizenReview}
              accent="info"
              icon={<Users className="size-4" />}
            />
            <StatCard label="Rework" value={d.kpis.rework} accent="destructive" icon={<RotateCcw className="size-4" />} />
            <StatCard
              label="Closed"
              value={d.kpis.closed}
              accent="success"
              icon={<CheckCircle2 className="size-4" />}
              hint={`${d.kpis.resolutionRate}% resolution rate`}
            />
            <StatCard
              label="Avg. Open Age"
              value={fmtHours(d.kpis.avgOpenCaseAgeHours)}
              accent="primary"
              icon={<ShieldCheck className="size-4" />}
            />
          </div>

          {/* ── Performance ─────────────────────────────────────────────── */}
          <Panel eyebrow="Performance" title="Resolution Timing (Real Timestamps Only)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Assignment → Investigation", value: d.performance.avgAssignmentToInvestigationHours },
                { label: "Investigation → Resolution", value: d.performance.avgInvestigationDurationHours },
                { label: "Resolution → Closure", value: d.performance.avgResolutionToClosureHours },
                { label: "Overall (Filed → Closed)", value: d.performance.avgOverallResolutionHours },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div className="text-2xl font-bold tabular-nums">{fmtHours(m.value)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    {m.label}
                  </div>
                  {m.value === undefined && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Insufficient data</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* ── Category / Severity ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel eyebrow="Category Breakdown" title="By Issue Type">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={d.byCategory.map((c) => ({
                      name: ISSUE_LABELS[c.issueType] ?? titleCase(c.issueType),
                      value: c.count,
                      fill: ISSUE_COLORS[c.issueType] ?? "var(--color-muted-foreground)",
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {d.byCategory.map((c, i) => (
                      <Cell key={i} fill={ISSUE_COLORS[c.issueType] ?? "var(--color-muted-foreground)"} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => <span style={{ color: "var(--color-muted-foreground)" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
            <Panel eyebrow="Severity Distribution" title="By Severity">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={d.bySeverity.map((s) => ({
                      name: titleCase(s.severity),
                      value: s.count,
                      fill: SEVERITY_COLORS[s.severity] ?? "var(--color-muted-foreground)",
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {d.bySeverity.map((s, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[s.severity] ?? "var(--color-muted-foreground)"} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => <span style={{ color: "var(--color-muted-foreground)" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* ── Status breakdown ─────────────────────────────────────────── */}
          <Panel eyebrow="Status Distribution" title="Complaints by Status">
            <div className="flex flex-wrap gap-2">
              {d.byStatus.map((s) => (
                <Pill key={s.status} tone="muted">
                  {STATUS_LABELS[s.status] ?? titleCase(s.status)}: {s.count}
                </Pill>
              ))}
            </div>
          </Panel>

          {/* ── Location ─────────────────────────────────────────────────── */}
          <Panel eyebrow="Location Analysis" title="Volume by City (with current AQI)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={d.byCity.slice(0, 8).map((c) => ({
                  city: titleCase(c.cityId).slice(0, 10),
                  Total: c.total,
                  Resolved: c.resolved,
                  Pending: c.pending,
                  Critical: c.critical,
                }))}
                margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="city" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Total" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Resolved" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Pending" fill="var(--color-warning)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Critical" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {d.byCity.some((c) => c.aqi !== undefined) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.byCity
                  .filter((c) => c.aqi !== undefined)
                  .slice(0, 8)
                  .map((c) => (
                    <Pill key={c.cityId} tone={c.aqi! > 150 ? "destructive" : c.aqi! > 100 ? "warning" : "success"}>
                      {titleCase(c.cityId)} · AQI {c.aqi} · {c.total} complaints
                    </Pill>
                  ))}
              </div>
            )}
          </Panel>

          {/* ── Assignment source ─────────────────────────────────────────── */}
          <Panel eyebrow="Assignment Source" title="Smart Routing Outcomes">
            <div className="flex flex-wrap gap-2">
              {d.byAssignmentSource.map((s) => (
                <Pill key={s.source} tone={s.source === "automatic" ? "primary" : "muted"}>
                  {titleCase(s.source)}: {s.count}
                </Pill>
              ))}
            </div>
          </Panel>

          {/* ── Trend ─────────────────────────────────────────────────────── */}
          <Panel eyebrow={`Last ${days} Days`} title="Workload Trend">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.trend} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                  interval="preserveStartEnd"
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip {...tooltipStyle} labelFormatter={(v) => v} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="submitted" name="Filed" fill="var(--color-warning)" radius={[2, 2, 0, 0]} opacity={0.8} />
                <Line dataKey="resolved" name="Resolved" stroke="var(--color-info)" strokeWidth={2} dot={false} />
                <Line dataKey="closed" name="Closed" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                <Line dataKey="rework" name="Rework" stroke="var(--color-destructive)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          {/* ── Rework & Citizen Review ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel eyebrow="Rework Analytics" title="Rework Workflow">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">{d.rework.total}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">{d.rework.percentage}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">
                    {d.rework.avgResolutionAttempts ?? "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    Avg. Attempts
                  </div>
                </div>
              </div>
              {d.rework.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No rework cases in scope</p>
              ) : (
                <div className="space-y-2">
                  {d.rework.byCategory.map((c) => (
                    <div key={c.issueType} className="flex items-center justify-between text-sm">
                      <span>{ISSUE_LABELS[c.issueType] ?? titleCase(c.issueType)}</span>
                      <span className="tabular-nums text-muted-foreground">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel eyebrow="Citizen Review" title="Citizen Review Outcomes">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">{d.citizenReview.awaiting}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Awaiting</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">{d.citizenReview.accepted}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">
                    {fmtHours(d.citizenReview.avgTurnaroundHours)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    Avg. Turnaround
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
