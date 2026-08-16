import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  Loader2,
  BookOpen,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import { commandApi, type ExecutiveReportData, type AuthorityAnalyticsData } from "@/lib/api/command.api";
import { Panel, WorkspaceHeader, Pill, StatCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ISSUE_LABELS } from "./investigation-workspace";
import { STATUS_LABELS, titleCase, fmtHours } from "./authority-analytics";
import { useAuth } from "@/lib/auth-context";

type ReportType = "Weekly" | "Monthly" | "Sustainability" | "City";

const REPORT_TYPES: Array<{ key: ReportType; label: string; description: string }> = [
  { key: "Weekly", label: "Weekly Report", description: "7-day environmental snapshot with KPIs" },
  {
    key: "Monthly",
    label: "Monthly Report",
    description: "30-day trend analysis with city rankings",
  },
  {
    key: "Sustainability",
    label: "Sustainability Report",
    description: "Eco scores, carbon footprint and green initiatives",
  },
  { key: "City", label: "City Report", description: "Single-city deep-dive performance report" },
];

function ReportSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function GeneratedReport({
  data,
  selectedType,
}: {
  data: ExecutiveReportData;
  selectedType: ReportType;
}) {
  const { report, kpis, chartData } = data;

  const downloadMutation = useMutation({
    mutationFn: () => commandApi.exportReportPdf({ type: selectedType }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `greenguard-${selectedType.toLowerCase()}-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const radarData = chartData.aqiRanking.slice(0, 6).map((c) => ({
    city: c.city.length > 8 ? c.city.slice(0, 7) + "…" : c.city,
    AQI: Math.min(c.aqi, 300),
    Risk: c.risk,
    Eco: c.eco,
  }));

  const tooltipStyle = {
    contentStyle: {
      background: "var(--color-card)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      fontSize: 12,
    },
  };

  return (
    <div className="space-y-5">
      {/* Report header */}
      <div className="glass rounded-2xl p-6 border border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary mb-1">
              GOVERNMENT ENVIRONMENTAL INTELLIGENCE
            </div>
            <h2 className="text-xl font-bold tracking-tight">{report.title}</h2>
            <div className="text-sm text-muted-foreground mt-1">
              Reporting Period: {report.period}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success pulse-dot" />
              <span className="text-xs text-muted-foreground">Official</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
              className="gap-1.5"
            >
              {downloadMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              {downloadMutation.isPending ? "Generating PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
        {downloadMutation.isError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5" />
            PDF generation failed. Please try again.
          </div>
        )}
        {downloadMutation.isSuccess && !downloadMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 text-xs text-success">
            <CheckCircle className="size-3.5" />
            PDF downloaded successfully.
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Cities Monitored", value: kpis.cityCount, accent: "primary" as const },
          {
            label: "Network Avg AQI",
            value: kpis.avgAqi,
            accent: kpis.avgAqi > 150 ? ("destructive" as const) : ("warning" as const),
          },
          { label: "Active Alerts", value: kpis.activeAlerts, accent: "destructive" as const },
          {
            label: "Resolution Rate",
            value: `${kpis.resolutionRate}%`,
            accent: "success" as const,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl p-3 text-center">
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: `var(--color-${kpi.accent})` }}
            >
              {kpi.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel eyebrow="City Rankings" title="AQI by City">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData.aqiRanking.slice(0, 8)}
              margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="city" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="aqi" name="AQI" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Risk vs Eco Analysis" title="City Performance Radar">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis
                dataKey="city"
                tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
              />
              <Radar
                name="AQI"
                dataKey="AQI"
                stroke="var(--color-destructive)"
                fill="var(--color-destructive)"
                fillOpacity={0.1}
              />
              <Radar
                name="Risk"
                dataKey="Risk"
                stroke="var(--color-warning)"
                fill="var(--color-warning)"
                fillOpacity={0.1}
              />
              <Radar
                name="Eco"
                dataKey="Eco"
                stroke="var(--color-success)"
                fill="var(--color-success)"
                fillOpacity={0.1}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Report body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <div className="space-y-4">
            <ReportSection icon={FileText} eyebrow="Section 1" title="Executive Summary">
              <p className="text-sm text-foreground leading-relaxed">{report.executiveSummary}</p>
            </ReportSection>
            <div className="border-t border-border/50" />
            <ReportSection icon={TrendingUp} eyebrow="Section 2" title="Network Health Assessment">
              <p className="text-sm text-foreground leading-relaxed">
                {report.networkHealthAssessment}
              </p>
            </ReportSection>
          </div>
        </Panel>

        <Panel>
          <div className="space-y-4">
            <ReportSection icon={CheckCircle} eyebrow="Section 3" title="Key Findings">
              <ul className="space-y-1.5">
                {report.keyFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-semibold text-primary shrink-0">{i + 1}.</span>
                    {f}
                  </li>
                ))}
              </ul>
            </ReportSection>
            <div className="border-t border-border/50" />
            <ReportSection
              icon={TrendingUp}
              eyebrow="Section 4"
              title="City Performance Highlights"
            >
              <ul className="space-y-1.5">
                {report.cityPerformanceHighlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </ReportSection>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <ReportSection icon={Target} eyebrow="Section 5" title="Action Items">
            <ul className="space-y-2">
              {report.actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-3.5 text-warning mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </ReportSection>
        </Panel>
        <Panel>
          <ReportSection icon={Lightbulb} eyebrow="Section 6" title="Recommendations">
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="size-3.5 text-success mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </ReportSection>
        </Panel>
      </div>

      <Panel eyebrow="Conclusion" title="Report Conclusion" className="border border-primary/10">
        <p className="text-sm leading-relaxed">{report.conclusion}</p>
        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <span>Generated {new Date(data.generatedAt).toLocaleString()} · GreenGuard AI v6.0</span>
          <Pill tone="primary">Official Report</Pill>
        </div>
      </Panel>
    </div>
  );
}

// ─── Complaint Operations Report (Phase 8) ───────────────────────────────────
// Unlike the Gemini-narrated Environmental Intelligence reports above, this
// is a real-data-only operational report — the exact same authority-scoped
// dataset shown on the Analytics → My Workload tab, formatted as a report
// and exportable as a PDF built server-side from the identical figures.
function OperationsReportSection() {
  const { user } = useAuth();
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data: res, isLoading, isError, refetch } = useQuery({
    queryKey: ["authority-analytics", days],
    queryFn: () => commandApi.getAuthorityAnalytics(days),
    staleTime: 60_000,
  });
  const d = res?.data as AuthorityAnalyticsData | undefined;

  const downloadMutation = useMutation({
    mutationFn: () => commandApi.exportOperationsReportPdf(days),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `greenguard-operations-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="space-y-6">
      <Panel eyebrow="Report Configuration" title="Reporting Period">
        <div className="flex flex-wrap items-center gap-3">
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
                {n} Days
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending || !d}
            className="gap-1.5"
          >
            {downloadMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {downloadMutation.isPending ? "Generating PDF…" : "Download PDF"}
          </Button>
        </div>
        {downloadMutation.isError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5" />
            PDF generation failed. Please try again.
          </div>
        )}
        {downloadMutation.isSuccess && !downloadMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 text-xs text-success">
            <CheckCircle className="size-3.5" />
            PDF downloaded successfully.
          </div>
        )}
      </Panel>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Compiling report…</span>
        </div>
      ) : isError || !d ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="Unable to load report data" />
      ) : d.kpis.totalAssigned === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No complaint data for this period"
          description={
            d.scope === "assigned"
              ? "No complaints have been assigned to you yet."
              : "No complaints exist in the network yet."
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="glass rounded-2xl p-6 border border-primary/20">
            <div className="text-[10px] uppercase tracking-widest text-primary mb-1">
              COMPLAINT OPERATIONS
            </div>
            <h2 className="text-xl font-bold tracking-tight">Complaint Operations Report</h2>
            <div className="text-sm text-muted-foreground mt-1">
              Reporting Period: Last {d.period.days} days · Scope:{" "}
              {d.scope === "assigned" ? `Assigned to ${user?.name ?? "you"}` : "Network-wide"}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Total" value={d.kpis.totalAssigned} accent="info" />
            <StatCard label="In Progress" value={d.kpis.inProgress} accent="warning" />
            <StatCard label="Awaiting Review" value={d.kpis.awaitingCitizenReview} accent="info" />
            <StatCard label="Rework" value={d.kpis.rework} accent="destructive" />
            <StatCard label="Closed" value={d.kpis.closed} accent="success" hint={`${d.kpis.resolutionRate}% rate`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel eyebrow="Status Distribution" title="Complaints by Status">
              <div className="space-y-1.5">
                {d.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <span>{STATUS_LABELS[s.status] ?? titleCase(s.status)}</span>
                    <span className="tabular-nums text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel eyebrow="Category Breakdown" title="Complaints by Category">
              <div className="space-y-1.5">
                {d.byCategory.map((c) => (
                  <div key={c.issueType} className="flex items-center justify-between text-sm">
                    <span>{ISSUE_LABELS[c.issueType] ?? titleCase(c.issueType)}</span>
                    <span className="tabular-nums text-muted-foreground">{c.count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel eyebrow="Location Analysis" title="Complaints by City">
            <div className="space-y-1.5">
              {d.byCity.slice(0, 10).map((c) => (
                <div key={c.cityId} className="flex items-center justify-between text-sm">
                  <span>{titleCase(c.cityId)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.total} total · {c.resolved} resolved
                    {c.aqi !== undefined ? ` · AQI ${c.aqi}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel eyebrow="Rework" title="Rework Summary">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold tabular-nums">{d.rework.total}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total</div>
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{d.rework.percentage}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Rate</div>
                </div>
              </div>
            </Panel>
            <Panel eyebrow="Citizen Review" title="Citizen Review Summary">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold tabular-nums">{d.citizenReview.awaiting}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Awaiting</div>
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{d.citizenReview.accepted}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Accepted</div>
                </div>
                <div>
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

          <Panel className="border border-primary/10">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Generated {new Date(d.generatedAt).toLocaleString()} · GreenGuard AI v6.0</span>
              <Pill tone="primary">Real Data — No AI Narrative</Pill>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

type ReportMode = "environmental" | "operations";

export function ExecutiveReports() {
  const [mode, setMode] = useState<ReportMode>("environmental");
  const [selectedType, setSelectedType] = useState<ReportType>("Monthly");
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);

  const mutation = useMutation({
    mutationFn: (type: ReportType) => commandApi.generateExecutiveReport({ type }),
    onSuccess: (res) => {
      if (res?.data) setReportData(res.data as ExecutiveReportData);
    },
  });

  const handleGenerate = () => {
    setReportData(null);
    mutation.mutate(selectedType);
  };

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ─────────────────────────────────────────────── */}
      {/* Phase 3A.3: replaces SectionTitle. No stats (report is on-demand). */}
      <WorkspaceHeader
        eyebrow="REPORTS · REPORTING & EXPORT"
        title="Intelligence Reports"
        description="Generate and export official environmental intelligence and complaint operations reports."
      />

      <div
        className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border"
        role="tablist"
        aria-label="Report category"
      >
        <button
          onClick={() => setMode("environmental")}
          role="tab"
          aria-selected={mode === "environmental"}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "environmental"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="size-3.5" />
          Environmental Reports
        </button>
        <button
          onClick={() => setMode("operations")}
          role="tab"
          aria-selected={mode === "operations"}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "operations"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ClipboardList className="size-3.5" />
          Complaint Operations Report
        </button>
      </div>

      {mode === "operations" ? (
        <OperationsReportSection />
      ) : (
        <>
      {/* Report type selector */}
      <Panel eyebrow="Report Configuration" title="Select Report Type">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.key}
              onClick={() => {
                setSelectedType(rt.key);
                setReportData(null);
              }}
              aria-pressed={selectedType === rt.key}
              className={cn(
                "text-left rounded-xl p-4 border transition-all",
                selectedType === rt.key
                  ? "border-primary bg-primary/8 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText
                  className={cn(
                    "size-4",
                    selectedType === rt.key ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="font-medium text-sm">{rt.label}</span>
                {selectedType === rt.key && <Pill tone="primary">Selected</Pill>}
              </div>
              <p className="text-xs text-muted-foreground">{rt.description}</p>
            </button>
          ))}
        </div>

        <Button onClick={handleGenerate} disabled={mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Generating {selectedType} Report…
            </>
          ) : (
            <>
              <BookOpen className="size-4 mr-2" />
              Generate {selectedType} Report
            </>
          )}
        </Button>

        {mutation.isPending && (
          <p className="text-xs text-muted-foreground mt-2">
            Gemini is compiling intelligence from all monitored cities. This may take 15–20 seconds.
          </p>
        )}
      </Panel>

      {mutation.isError && (
        <Panel className="border border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="size-4" />
            Failed to generate report. Please try again.
          </div>
        </Panel>
      )}

      {reportData && !mutation.isPending && (
        <GeneratedReport data={reportData} selectedType={selectedType} />
      )}
        </>
      )}
    </div>
  );
}
