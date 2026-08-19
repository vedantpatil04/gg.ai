/**
 * analytics-center-page.tsx
 *
 * Automation 6 & 7 — Admin Governance, ML Analytics, and Priority Intelligence Center.
 *
 * Production-grade Administrator Governance & Intelligence center using
 * real data from Own ML (ComplaintPrediction), Smart Routing (RoutingResult),
 * Priority Intelligence (PriorityAssessment), Complaint lifecycle, and Board Automation.
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldAlert,
  Brain,
  Route,
  RotateCcw,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronRight,
  Activity,
  FileCheck,
  UserPlus,
  HelpCircle,
  Flame,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Panel, Pill, WorkspaceHeader } from "@/components/ui-bits";
import {
  useGovernanceOverview,
  useAcknowledgeEscalation,
  useResolveEscalation,
  type GovernanceFilterParams,
  type GovernanceExceptionItem,
} from "@/lib/api/adminGovernance.api";
import { useCity } from "@/lib/city-context";
import { cn } from "@/lib/utils";

// ─── Formatters & Constants ───────────────────────────────────────────────────

function formatPct(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return "0%";
  return `${Math.round(n)}%`;
}

function formatConf(c: number | undefined): string {
  if (c === undefined || isNaN(c)) return "—";
  return `${Math.round(c * 100)}%`;
}

const CATEGORY_NAMES: Record<string, string> = {
  air_pollution: "Air Pollution",
  water_contamination: "Water Quality",
  open_burning: "Open Burning",
  noise: "Noise Pollution",
  waste_dumping: "Waste Dumping",
  chemical_spill: "Chemical Spill",
  other: "Other Incident",
};

// ─── Horizontal Bar Component ─────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  max,
  sublabel,
  colorClass = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  sublabel?: string;
  colorClass?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(4, (value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/90 truncate max-w-[200px]">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold tabular-nums">{value}</span>
          {sublabel && <span className="text-[10px] text-muted-foreground">({sublabel})</span>}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsCenterPage() {
  const navigate = useNavigate();
  const { city } = useCity();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("exceptions");

  const filterParams: GovernanceFilterParams = {
    timeRange,
    cityId: selectedCity !== "all" ? selectedCity : undefined,
  };

  const { data: overview, isLoading, refetch, isFetching } = useGovernanceOverview(filterParams);
  const acknowledgeEscalation = useAcknowledgeEscalation();
  const resolveEscalation = useResolveEscalation();

  const summary = overview?.summary;
  const exceptions = overview?.exceptions || [];
  const ml = overview?.mlAnalytics;
  const routing = overview?.routingAnalytics;
  const rework = overview?.reworkAnalytics;
  const priority = overview?.priorityAnalytics;
  const board = overview?.boardCoverage;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header with Live Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              Automation 6 & 7
            </span>
            <span className="text-xs text-muted-foreground">· Enterprise Governance & Priority Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1 text-foreground">
            Governance & Intelligence Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational exception queues, Priority Intelligence, Own ML signals, Smart Routing auditability, and rework diagnostics.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range pills */}
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/80">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors capitalize",
                  timeRange === r
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Exceptions</span>
            <AlertTriangle className={cn("size-3.5", (summary?.activeExceptions ?? 0) > 0 ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-foreground">
            {summary?.activeExceptions ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Requires intervention</div>
        </Panel>

        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Critical Risks</span>
            <Flame className={cn("size-3.5", (summary?.criticalEscalations ?? 0) > 0 ? "text-rose-600 animate-pulse" : "text-muted-foreground")} />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-rose-600 dark:text-rose-400">
            {summary?.criticalEscalations ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Critical risk alerts</div>
        </Panel>

        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Routing Fails</span>
            <Route className={cn("size-3.5", (summary?.routingFailures ?? 0) > 0 ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-foreground">
            {summary?.routingFailures ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Routing exceptions</div>
        </Panel>

        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Rework Queue</span>
            <RotateCcw className={cn("size-3.5", (summary?.activeReworkCases ?? 0) > 0 ? "text-warning" : "text-muted-foreground")} />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-foreground">
            {summary?.activeReworkCases ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Citizen rework requested</div>
        </Panel>

        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Auto-Assign Rate</span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatPct(summary?.autoAssignmentRate)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Automation efficiency</div>
        </Panel>

        <Panel className="p-3.5 border-border/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Avg Risk Score</span>
            <Activity className="size-3.5 text-primary" />
          </div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-primary">
            {summary?.averagePriorityScore ?? 45}<span className="text-xs text-muted-foreground">/100</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Priority Intelligence</div>
        </Panel>
      </div>

      {/* ── Main Tabbed Intelligence Center ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/80 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="exceptions" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <AlertTriangle className="size-3.5" />
            <span>Exception Queue ({exceptions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="priority" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <Flame className="size-3.5 text-rose-500" />
            <span>Priority & Critical Escalation</span>
          </TabsTrigger>
          <TabsTrigger value="ml" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <Brain className="size-3.5" />
            <span>Own ML Intelligence</span>
          </TabsTrigger>
          <TabsTrigger value="routing" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <Route className="size-3.5" />
            <span>Smart Routing & Overrides</span>
          </TabsTrigger>
          <TabsTrigger value="rework" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <RotateCcw className="size-3.5" />
            <span>Rework & Citizen Review</span>
          </TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs gap-1.5 py-1.5 px-3 rounded-lg">
            <Users className="size-3.5" />
            <span>Board Coverage ({board?.coverageGaps.length ?? 0} gaps)</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: EXCEPTION QUEUE ── */}
        <TabsContent value="exceptions" className="space-y-4 mt-0">
          <Panel className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Actionable Exception Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Complaints currently blocked from automatic progression requiring Administrator intervention.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-8 gap-1.5"
              >
                <Link to="/admin/complaints">
                  <span>Open Full Governance Queue</span>
                  <ExternalLink className="size-3" />
                </Link>
              </Button>
            </div>

            {exceptions.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                <CheckCircle2 className="size-8 text-emerald-500/80 mx-auto" />
                <h4 className="text-sm font-semibold text-foreground">Zero Active Exceptions</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  All complaints are either automatically routed, undergoing active authority investigation, or closed cleanly.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exceptions.map((exc) => {
                  const toneColor =
                    exc.exceptionType === "critical_escalation"
                      ? "text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-500/10 font-bold"
                      : exc.exceptionType === "routing_failed"
                        ? "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5"
                        : exc.exceptionType === "rework_requested"
                          ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                          : exc.exceptionType === "verification_required"
                            ? "text-primary border-primary/30 bg-primary/5"
                            : "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5";

                  return (
                    <div
                      key={exc.id}
                      className={cn(
                        "p-4 rounded-xl border bg-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs",
                        exc.exceptionType === "critical_escalation" ? "border-rose-500/50 bg-rose-500/5 hover:border-rose-500" : "border-border/80 hover:border-primary/40",
                      )}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {exc.refId}
                          </span>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize", toneColor)}>
                            {exc.exceptionType.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {exc.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{CATEGORY_NAMES[exc.category] || exc.category}</span>
                          <span>·</span>
                          <span className="capitalize">{exc.cityId}</span>
                          {exc.priorityScore !== undefined && (
                            <>
                              <span>·</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">Risk Score: {exc.priorityScore}/100</span>
                            </>
                          )}
                          {exc.confidence !== undefined && (
                            <>
                              <span>·</span>
                              <span>Confidence: {formatConf(exc.confidence)}</span>
                            </>
                          )}
                          {exc.reworkCount !== undefined && exc.reworkCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Rework #{exc.reworkCount}
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-xs text-foreground/80 font-medium bg-muted/30 px-2.5 py-1 rounded-lg border border-border/50">
                          {exc.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          asChild
                          className="text-xs h-8 gap-1.5 shadow-xs"
                        >
                          <Link to={exc.actionUrl as any}>
                            <span>{exc.nextAction}</span>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ── TAB 2: PRIORITY & CRITICAL ESCALATION (Automation 7) ── */}
        <TabsContent value="priority" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Priority Distribution */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Flame className="size-4 text-rose-500" />
                  <span>Priority Risk Tiers</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Multi-signal operational priority classification.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <MetricBar
                  label="Critical Priority"
                  value={priority?.priorityDistribution.critical.count ?? 0}
                  max={priority?.totalAssessed || 1}
                  sublabel={`${priority?.priorityDistribution.critical.percentage ?? 0}% (Score ≥ 75)`}
                  colorClass="bg-rose-500"
                />
                <MetricBar
                  label="High Priority"
                  value={priority?.priorityDistribution.high.count ?? 0}
                  max={priority?.totalAssessed || 1}
                  sublabel={`${priority?.priorityDistribution.high.percentage ?? 0}% (Score 50–74)`}
                  colorClass="bg-amber-500"
                />
                <MetricBar
                  label="Medium Priority"
                  value={priority?.priorityDistribution.medium.count ?? 0}
                  max={priority?.totalAssessed || 1}
                  sublabel={`${priority?.priorityDistribution.medium.percentage ?? 0}% (Score 30–49)`}
                  colorClass="bg-primary"
                />
                <MetricBar
                  label="Low Priority"
                  value={priority?.priorityDistribution.low.count ?? 0}
                  max={priority?.totalAssessed || 1}
                  sublabel={`${priority?.priorityDistribution.low.percentage ?? 0}% (Score < 30)`}
                  colorClass="bg-muted-foreground/60"
                />
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Assessed Complaints:</span>
                  <span className="font-semibold text-foreground">{priority?.totalAssessed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Risk Score:</span>
                  <span className="font-semibold text-primary">{priority?.averagePriorityScore ?? 45}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Overall Escalation Rate:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{priority?.escalationRate ?? 0}%</span>
                </div>
              </div>
            </Panel>

            {/* Escalation Status */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Escalation Lifecycle Status</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  State progression of critical escalations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center">
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {priority?.escalationStatusBreakdown.escalated ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Active Escalations</div>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {priority?.escalationStatusBreakdown.acknowledged ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Acknowledged</div>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center col-span-2">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {priority?.escalationStatusBreakdown.resolved ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Resolved Critical Escalations</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-primary">Signals Consumed</div>
                <p className="text-[11px] leading-relaxed">
                  Calculated from Own ML prediction, high-hazard categories, environmental alerts in jurisdiction, citizen severity, rework count, and board coverage gaps.
                </p>
              </div>
            </Panel>

            {/* Critical by Category */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">Critical Incidents by Category</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-hazard distributions requiring urgent action.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {(priority?.criticalByCategory || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No critical incidents recorded.</p>
                ) : (
                  (priority?.criticalByCategory || []).map((cat) => (
                    <MetricBar
                      key={cat.category}
                      label={CATEGORY_NAMES[cat.category] || cat.category}
                      value={cat.count}
                      max={priority?.priorityDistribution.critical.count || 1}
                      sublabel={`${cat.count} critical cases`}
                      colorClass="bg-rose-500"
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* Active Critical Escalations List with Direct Actions */}
          <Panel className="p-5 space-y-4">
            <div className="border-b pb-2.5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flame className="size-4 text-rose-500" />
                <span>Recent Critical Escalations & Governance Actions</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Direct acknowledgment and triage controls for critical risk cases.
              </p>
            </div>

            {(priority?.recentEscalations || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active critical escalations requiring attention.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(priority?.recentEscalations || []).map((esc) => (
                  <div
                    key={esc.id}
                    className="p-4 rounded-xl border border-rose-500/30 bg-card hover:border-rose-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          #{esc.complaintId.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">
                          Score: {esc.priorityScore}/100
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {esc.title}
                        </span>
                        <span className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-muted border font-medium">
                          {esc.escalationStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="capitalize">{esc.cityId}</span>
                        <span>·</span>
                        <span>Contributing signals: {esc.reasons.join("; ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {esc.escalationStatus === "escalated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeEscalation.mutate(esc.complaintId)}
                          disabled={acknowledgeEscalation.isPending}
                          className="text-xs h-8 gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          <Check className="size-3" />
                          <span>Acknowledge</span>
                        </Button>
                      )}
                      {esc.escalationStatus !== "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveEscalation.mutate(esc.complaintId)}
                          disabled={resolveEscalation.isPending}
                          className="text-xs h-8 gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="size-3" />
                          <span>Resolve</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        asChild
                        className="text-xs h-8 gap-1.5 shadow-xs"
                      >
                        <Link to={`/admin/complaints?id=${esc.complaintId}&tab=escalation` as any}>
                          <span>Inspect</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ── TAB 3: OWN ML INTELLIGENCE ── */}
        <TabsContent value="ml" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Confidence Distribution */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Brain className="size-4 text-primary" />
                  <span>Confidence Distribution</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Observed confidence tiers from real Own ML predictions.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <MetricBar
                  label="High Confidence"
                  value={ml?.confidenceDistribution.high.count ?? 0}
                  max={ml?.successfulPredictions || 1}
                  sublabel={`${ml?.confidenceDistribution.high.percentage ?? 0}% (≥ 70%)`}
                  colorClass="bg-emerald-500"
                />
                <MetricBar
                  label="Moderate Confidence"
                  value={ml?.confidenceDistribution.moderate.count ?? 0}
                  max={ml?.successfulPredictions || 1}
                  sublabel={`${ml?.confidenceDistribution.moderate.percentage ?? 0}% (45%–69%)`}
                  colorClass="bg-amber-500"
                />
                <MetricBar
                  label="Low Confidence"
                  value={ml?.confidenceDistribution.low.count ?? 0}
                  max={ml?.successfulPredictions || 1}
                  sublabel={`${ml?.confidenceDistribution.low.percentage ?? 0}% (< 45%)`}
                  colorClass="bg-rose-500"
                />
              </div>

              <div className="pt-3 border-t text-[11px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Inferences:</span>
                  <span className="font-semibold text-foreground">{ml?.totalPredictions ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful Predictions:</span>
                  <span className="font-semibold text-foreground">{ml?.successfulPredictions ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prediction Failure Rate:</span>
                  <span className="font-semibold text-foreground">{100 - (ml?.successRate ?? 100)}%</span>
                </div>
              </div>
            </Panel>

            {/* Predicted Categories */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">Predicted Categories</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category distribution classified by Own ML model.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {(ml?.predictedCategories || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No prediction data available.</p>
                ) : (
                  (ml?.predictedCategories || []).map((cat) => (
                    <MetricBar
                      key={cat.category}
                      label={CATEGORY_NAMES[cat.category] || cat.category}
                      value={cat.count}
                      max={ml?.successfulPredictions || 1}
                      sublabel={`${cat.percentage}% · avg ${Math.round(cat.avgConfidence * 100)}%`}
                    />
                  ))
                )}
              </div>
            </Panel>

            {/* Model Versions & Diagnostics */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">Model Architecture & Versions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active model versions persisting complaint intelligence.
                </p>
              </div>

              <div className="space-y-3">
                {(ml?.modelVersions || []).map((mv) => (
                  <div key={mv.version} className="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">{mv.version}</div>
                      <div className="text-[10px] text-muted-foreground">Rule-based NLP + Keyword Model</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold tabular-nums">{mv.count} inferences</div>
                      <div className="text-[10px] text-muted-foreground">{mv.percentage}% volume</div>
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-primary">Ground-Truth Note</div>
                  <p className="text-[11px] leading-relaxed">
                    Displayed statistics represent actual prediction outputs generated across complaints. Real accuracy requires human-labeled verification ground truth.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── TAB 4: SMART ROUTING & OVERRIDES ── */}
        <TabsContent value="routing" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Routing Performance */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Route className="size-4 text-primary" />
                  <span>Smart Routing Performance</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated candidate matching and assignment outcomes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {routing?.autoAssigned ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Auto-Assigned</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {routing?.pendingRouting ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Pending Routing</div>
                </div>
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {routing?.failedRouting ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Routing Failures</div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-foreground">Confidence Tier Outcomes</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/50">
                    <span className="font-medium">High Tier (≥ 70%)</span>
                    <span className="font-semibold">{routing?.confidenceTierBreakdown.high.assignedCount} / {routing?.confidenceTierBreakdown.high.count} auto-assigned ({routing?.confidenceTierBreakdown.high.rate}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/50">
                    <span className="font-medium">Moderate Tier (45%–69%)</span>
                    <span className="font-semibold">{routing?.confidenceTierBreakdown.moderate.assignedCount} / {routing?.confidenceTierBreakdown.moderate.count} auto-assigned ({routing?.confidenceTierBreakdown.moderate.rate}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border/50">
                    <span className="font-medium">Low Tier (&lt; 45%)</span>
                    <span className="font-semibold">{routing?.confidenceTierBreakdown.low.assignedCount} / {routing?.confidenceTierBreakdown.low.count} auto-assigned ({routing?.confidenceTierBreakdown.low.rate}%)</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Human Override Intelligence */}
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>Human Override & Governance Actions</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit trail of manual vs automatic assignment operations.
                </p>
              </div>

              <div className="space-y-3">
                <MetricBar
                  label="Automatic Smart Routing"
                  value={routing?.humanOverrides.automaticAssignments ?? 0}
                  max={routing?.humanOverrides.totalComplaints || 1}
                  sublabel="System-assigned"
                  colorClass="bg-emerald-500"
                />
                <MetricBar
                  label="Manual Administrator Assignment"
                  value={routing?.humanOverrides.manualAssignments ?? 0}
                  max={routing?.humanOverrides.totalComplaints || 1}
                  sublabel="Admin assigned"
                  colorClass="bg-primary"
                />
                <MetricBar
                  label="Manual Reassignment"
                  value={routing?.humanOverrides.manualReassignments ?? 0}
                  max={routing?.humanOverrides.totalComplaints || 1}
                  sublabel="Reassigned after triage/rework"
                  colorClass="bg-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between text-xs mt-4">
                <div>
                  <span className="font-semibold text-foreground">Manual Intervention Rate</span>
                  <p className="text-[11px] text-muted-foreground">Proportion of cases requiring admin override</p>
                </div>
                <span className="text-base font-bold text-foreground tabular-nums">
                  {routing?.humanOverrides.manualInterventionRate ?? 0}%
                </span>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── TAB 5: REWORK & CITIZEN REVIEW ── */}
        <TabsContent value="rework" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw className="size-4 text-primary" />
                  <span>Citizen Review & Rework Overview</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acceptance rates and rework cycle frequencies.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="text-xs text-muted-foreground font-medium">Citizen Acceptance Rate</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {rework?.acceptanceVsReworkRatio.acceptanceRate ?? 100}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {rework?.acceptanceVsReworkRatio.accepted ?? 0} accepted / {rework?.totalReworkCases ?? 0} rework requests
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="text-xs text-muted-foreground font-medium">Avg Resolution Cycles</div>
                  <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {rework?.avgResolutionCycles ?? 1.0}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {rework?.repeatedReworkCount ?? 0} repeated rework cases (&gt; 1 cycle)
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-muted-foreground">Currently Awaiting Citizen Review:</span>
                  <span className="font-semibold text-foreground">{rework?.awaitingCitizenReview ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-muted-foreground">Active Rework Exception Queue:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{rework?.currentReworkQueue ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-muted-foreground">Admin Verified Resolutions:</span>
                  <span className="font-semibold text-foreground">{rework?.adminVerifiedCount ?? 0}</span>
                </div>
              </div>
            </Panel>

            <Panel className="p-5 space-y-4">
              <div className="border-b pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">Rework by Issue Category</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Categories experiencing resolution rework requests.
                </p>
              </div>

              <div className="space-y-3">
                {(rework?.reworkByCategory || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No rework cases recorded.</p>
                ) : (
                  (rework?.reworkByCategory || []).map((cat) => (
                    <MetricBar
                      key={cat.category}
                      label={CATEGORY_NAMES[cat.category] || cat.category}
                      value={cat.count}
                      max={rework?.totalReworkCases || 1}
                      sublabel={`${cat.rate}% of rework`}
                      colorClass="bg-amber-500"
                    />
                  ))
                )}
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── TAB 6: BOARD COVERAGE ── */}
        <TabsContent value="coverage" className="space-y-4 mt-0">
          <Panel className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Authority Board Operational Coverage</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Jurisdiction readiness and real-time coverage gap monitoring (reusing Automation 4).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-8 gap-1.5"
              >
                <Link to="/command-center">
                  <span>Open Mission Control</span>
                  <ExternalLink className="size-3" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium">Board Status</div>
                <div className={cn(
                  "text-lg font-bold mt-1 capitalize",
                  board?.boardStatus === "optimal" ? "text-emerald-600 dark:text-emerald-400" : board?.boardStatus === "warning" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
                )}>
                  {board?.boardStatus || "Optimal"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">System-wide health</div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium">Workforce Availability</div>
                <div className="text-lg font-bold text-foreground mt-1 tabular-nums">
                  {board?.availableAuthorities ?? 0} / {board?.totalAuthorities ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Officers currently available</div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium">Coverage Gaps</div>
                <div className={cn(
                  "text-lg font-bold mt-1 tabular-nums",
                  (board?.coverageGaps.length ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                )}>
                  {board?.coverageGaps.length ?? 0} cities
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">0 available officers</div>
              </div>
            </div>

            {(board?.coverageGaps.length ?? 0) > 0 && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                  <AlertTriangle className="size-4" />
                  <span>Critical Coverage Gap Detected</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The following cities currently have no available officers assigned to receive automated complaint routing:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {board?.coverageGaps.map((cityId) => (
                    <span
                      key={cityId}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30 uppercase"
                    >
                      {cityId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
