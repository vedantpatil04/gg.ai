import { useMemo } from "react";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui-bits";
import { Pill } from "@/components/ui-bits";
import { useCitizenStats, useMyCitizenComplaints } from "./citizen-queries";
import {
  humanizeIssueType,
  monthLabel,
  getStatusMeta,
} from "./citizen-status-utils";

// ─── Simple bar chart ─────────────────────────────────────────────────────────

function BarChart({
  data,
  labelKey,
  valueKey,
  maxValue,
  colorClass = "bg-primary",
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  maxValue: number;
  colorClass?: string;
}) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const label = item[labelKey] as string;
        const value = item[valueKey] as number;
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground truncate text-right shrink-0">
              {label}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-md transition-all ${colorClass}`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-6 text-right">{value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monthly trend ────────────────────────────────────────────────────────────

function MonthlyTrendChart({
  data,
}: {
  data: Array<{ year: number; month: number; count: number }>;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-28 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground tabular-nums">{d.count}</span>
          <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
            <div
              className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-colors"
              style={{ height: `${Math.max(4, (d.count / max) * 76)}px` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">
            {monthLabel(d.month)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Status donut (simple text-based) ────────────────────────────────────────

function StatusBreakdown({
  data,
}: {
  data: Array<{ status: string; count: number }>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const meta = getStatusMeta(d.status);
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
        return (
          <div key={d.status} className="flex items-center justify-between gap-3">
            <Pill tone={meta.tone}>{meta.label}</Pill>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="font-medium">{d.count}</span>
              <span className="text-muted-foreground">({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CitizenAnalytics() {
  const { data: statsData, isLoading: statsLoading } = useCitizenStats();
  const { data: complaintsData, isLoading: complaintsLoading } = useMyCitizenComplaints({
    limit: 200,
    page: 1,
  });

  const isLoading = statsLoading || complaintsLoading;

  // Category breakdown from backend
  const categoryData = useMemo(
    () =>
      (statsData?.categoryBreakdown ?? []).map((c) => ({
        label: humanizeIssueType(c.issueType),
        count: c.count,
      })),
    [statsData],
  );
  const maxCategory = Math.max(...categoryData.map((d) => d.count), 1);

  // Status breakdown from local complaints
  const statusData = useMemo(() => {
    const complaints = complaintsData?.complaints ?? [];
    const counts: Record<string, number> = {};
    for (const c of complaints) {
      // Normalize rework to in-progress for citizen view
      const displayStatus = c.status === "rework" ? "in-progress" : c.status;
      counts[displayStatus] = (counts[displayStatus] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [complaintsData]);

  const monthlyTrend = statsData?.monthlyTrend ?? [];
  const totalComplaints = statsData?.stats.total ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalComplaints === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-4" />}
        title="No data yet"
        description="Analytics will appear once you've submitted your first complaint."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Monthly trend */}
      {monthlyTrend.length > 0 && (
        <Panel
          eyebrow="Trend"
          title="Monthly Submissions"
          action={
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3" />
              Last {monthlyTrend.length} months
            </div>
          }
        >
          <MonthlyTrendChart data={monthlyTrend} />
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By category */}
        {categoryData.length > 0 && (
          <Panel eyebrow="Breakdown" title="Complaints by Category">
            <BarChart
              data={categoryData}
              labelKey="label"
              valueKey="count"
              maxValue={maxCategory}
              colorClass="bg-primary/70"
            />
          </Panel>
        )}

        {/* By status */}
        {statusData.length > 0 && (
          <Panel eyebrow="Breakdown" title="Complaints by Status">
            <StatusBreakdown data={statusData} />
          </Panel>
        )}
      </div>

      {/* Summary */}
      <Panel eyebrow="Summary" title="Your Contribution">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: "Total Submitted", value: statsData?.stats.total ?? 0 },
            { label: "Closed", value: statsData?.stats.closed ?? 0 },
            { label: "This Month", value: statsData?.stats.thisMonth ?? 0 },
            {
              label: "Avg Resolution",
              value:
                statsData?.stats.avgResolutionDays != null
                  ? `${statsData.stats.avgResolutionDays}d`
                  : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-muted/40 p-4">
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
