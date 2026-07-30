import { useMemo } from "react";
import { BarChart3, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionTitle, Panel, EmptyState } from "@/components/ui-bits";
import { Pill } from "@/components/ui-bits";
import { usePlatformAnalytics } from "../platform-admin-api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_TONE: Record<string, "warning" | "info" | "primary" | "success" | "destructive" | "muted"> = {
  pending: "warning", "in-progress": "info", resolved: "primary",
  rework: "info", closed: "success", rejected: "destructive",
};

const SEV_LABEL: Record<string, string> = {
  air_pollution: "Air Pollution", water_contamination: "Water", open_burning: "Burning",
  noise: "Noise", waste_dumping: "Waste", chemical_spill: "Chemical", other: "Other",
};

const ROLE_TONE: Record<string, "info" | "primary" | "muted"> = { citizen: "info", authority: "primary", administrator: "muted" };

function BarChart({ data, labelKey, valueKey, maxValue, colorClass = "bg-primary/70" }: {
  data: Record<string, unknown>[];
  labelKey: string; valueKey: string; maxValue: number; colorClass?: string;
}) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const label = item[labelKey] as string;
        const value = item[valueKey] as number;
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground truncate text-right shrink-0">{label}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                <div className={`h-full rounded-md transition-all ${colorClass}`} style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
              <span className="text-xs font-semibold w-6 text-right">{value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SparkBars({ data }: { data: Array<{ year: number; month: number; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground tabular-nums">{d.count}</span>
          <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
            <div className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-colors" style={{ height: `${Math.max(4, (d.count / max) * 76)}px` }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{MONTHS[(d.month - 1) % 12]}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsCenterPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = usePlatformAnalytics();

  const categoryData = useMemo(() =>
    (data?.complaintsByCategory ?? []).map(c => ({ label: SEV_LABEL[c.issueType] ?? c.issueType, count: c.count })),
    [data]);

  const maxCat = Math.max(...categoryData.map(d => d.count), 1);
  const maxCity = Math.max(...(data?.cityComplaintCounts ?? []).map(d => d.count), 1);

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Intelligence"
        title="Analytics Center"
        action={
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["pa-analytics"] })}>
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : isError || !data ? (
        <EmptyState icon={<BarChart3 className="size-4" />} title="Analytics unavailable." description="Couldn't load analytics data." />
      ) : (
        <div className="space-y-5">
          {/* Monthly trend */}
          {data.complaintsByMonth.length > 0 && (
            <Panel eyebrow="Trend" title="Monthly Complaint Submissions" action={<div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="size-3" />Last {data.complaintsByMonth.length} months</div>}>
              <SparkBars data={data.complaintsByMonth} />
            </Panel>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By status */}
            {data.complaintsByStatus.length > 0 && (
              <Panel eyebrow="Breakdown" title="Complaints by Status">
                <div className="space-y-2">
                  {data.complaintsByStatus.map(d => (
                    <div key={d.status} className="flex items-center justify-between gap-3">
                      <Pill tone={STATUS_TONE[d.status] ?? "muted"}>{d.status}</Pill>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(d.count / Math.max(...data.complaintsByStatus.map(x => x.count), 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* By category */}
            {categoryData.length > 0 && (
              <Panel eyebrow="Breakdown" title="Complaints by Category">
                <BarChart data={categoryData} labelKey="label" valueKey="count" maxValue={maxCat} />
              </Panel>
            )}

            {/* Users by role */}
            {data.usersByRole.length > 0 && (
              <Panel eyebrow="Breakdown" title="Users by Role">
                <div className="space-y-3">
                  {data.usersByRole.map(d => (
                    <div key={d.role} className="flex items-center justify-between gap-3">
                      <Pill tone={ROLE_TONE[d.role] ?? "muted"}>{d.role}</Pill>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(d.count / Math.max(...data.usersByRole.map(x => x.count), 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Top cities by complaints */}
            {data.cityComplaintCounts.length > 0 && (
              <Panel eyebrow="Breakdown" title="Top Cities by Complaint Volume">
                <BarChart data={data.cityComplaintCounts.map(c => ({ label: c.cityId, count: c.count }))} labelKey="label" valueKey="count" maxValue={maxCity} colorClass="bg-info/70" />
              </Panel>
            )}
          </div>

          {/* Authority performance */}
          {data.authorityPerformance.length > 0 && (
            <Panel eyebrow="Performance" title="Authority Resolution Leaderboard">
              <div className="space-y-2.5">
                {data.authorityPerformance.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${idx === 0 ? "bg-warning/15 text-warning" : idx === 1 ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground"}`}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.name ?? "Unknown"}</div>
                      <div className="text-[11px] text-muted-foreground">{a.total} assigned · {a.closed} closed</div>
                    </div>
                    <div className="text-sm font-semibold text-success shrink-0">{a.resolutionRate}%</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
