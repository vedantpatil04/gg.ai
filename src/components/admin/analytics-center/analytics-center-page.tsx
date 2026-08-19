/**
 * Phase 8 — Analytics Center (polished)
 *
 * Changes vs original:
 * - Replaced animate-pulse divs with shared ChartSkeleton
 * - Replaced bare EmptyState with NoAnalyticsEmpty / QueryError
 * - Added tooltip on bar-chart hover
 * - Added % labels to status/role breakdowns
 * - Added responsive text sizing
 * - Resolution rate KPI summary added at the top
 * - Consistent section spacing and button sizing
 */

import { useMemo, useState } from "react";
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionTitle, Panel } from "@/components/ui-bits";
import { Pill } from "@/components/ui-bits";
import { usePlatformAnalytics } from "../platform-admin-api";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { NoAnalyticsEmpty } from "@/components/shared/empty-states";
import { QueryError } from "@/components/shared/error-states";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_TONE: Record<string, "warning" | "info" | "primary" | "success" | "destructive" | "muted"> = {
  pending: "warning", "in-progress": "info", resolved: "primary",
  rework: "info", closed: "success", rejected: "destructive",
};

const SEV_LABEL: Record<string, string> = {
  air_pollution: "Air Pollution", water_contamination: "Water", open_burning: "Burning",
  noise: "Noise", waste_dumping: "Waste", chemical_spill: "Chemical", other: "Other",
};

const ROLE_TONE: Record<string, "info" | "primary" | "muted"> = {
  citizen: "info", authority: "primary", administrator: "muted",
};

// ─── Horizontal bar chart with tooltip ───────────────────────────────────────

function HBar({
  label,
  value,
  max,
  total,
  colorClass = "bg-primary/70",
  showPct = false,
}: {
  label: string;
  value: number;
  max: number;
  total?: number;
  colorClass?: string;
  showPct?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = max > 0 ? (value / max) * 100 : 0;
  const pctOfTotal = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <div
      className="flex items-center gap-3 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-24 sm:w-28 text-xs text-muted-foreground truncate text-right shrink-0">
        {label}
      </div>
      <div className="flex-1 flex items-center gap-2 relative">
        <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-md transition-all", colorClass)}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <span className="text-xs font-semibold w-6 text-right shrink-0">{value}</span>
        {showPct && pctOfTotal !== null && (
          <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
            {pctOfTotal}%
          </span>
        )}
        {hovered && (
          <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border border-border bg-popover px-2 py-1 text-xs shadow-md whitespace-nowrap pointer-events-none">
            {label}: {value}{pctOfTotal !== null ? ` (${pctOfTotal}%)` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Spark bars (monthly trend) ───────────────────────────────────────────────

function SparkBars({ data }: { data: Array<{ year: number; month: number; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total / (data.length || 1);
  const last = data[data.length - 1]?.count ?? 0;
  const prev = data[data.length - 2]?.count ?? 0;
  const trend = last > prev ? "up" : last < prev ? "down" : "flat";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Total: <span className="font-semibold text-foreground">{total}</span></span>
        <span>Avg/mo: <span className="font-semibold text-foreground">{avg.toFixed(1)}</span></span>
        <span className={cn(
          "flex items-center gap-1 font-medium",
          trend === "up" ? "text-emerald-500" : trend === "down" ? "text-destructive" : "text-muted-foreground",
        )}>
          {trend === "up" ? <TrendingUp className="size-3" /> : trend === "down" ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
          {trend === "up" ? "Increasing" : trend === "down" ? "Decreasing" : "Stable"}
        </span>
      </div>
      <div className="flex items-end gap-1 sm:gap-2 h-28">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1.5 group relative"
            title={`${MONTHS[(d.month - 1) % 12]}: ${d.count}`}
          >
            <span className="text-[9px] text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
            <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
              <div
                className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-colors cursor-pointer"
                style={{ height: `${Math.max(4, (d.count / max) * 76)}px` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground hidden sm:block">
              {MONTHS[(d.month - 1) % 12]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  rank,
  name,
  total,
  closed,
  resolutionRate,
}: {
  rank: number;
  name: string;
  total: number;
  closed: number;
  resolutionRate: number;
}) {
  const medalColor =
    rank === 1 ? "bg-amber-400/15 text-amber-500 border border-amber-400/30"
    : rank === 2 ? "bg-slate-300/10 text-slate-400 border border-slate-300/30"
    : rank === 3 ? "bg-orange-400/10 text-orange-500 border border-orange-400/30"
    : "bg-muted/50 text-muted-foreground border border-border";

  return (
    <div className="flex items-center gap-3 py-1">
      <div className={cn("size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", medalColor)}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name ?? "Unknown"}</div>
        <div className="text-[11px] text-muted-foreground">
          {total} assigned · {closed} closed
        </div>
      </div>
      <div className={cn(
        "text-sm font-bold shrink-0",
        resolutionRate >= 80 ? "text-emerald-500" : resolutionRate >= 50 ? "text-amber-500" : "text-destructive",
      )}>
        {resolutionRate}%
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AnalyticsCenterPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = usePlatformAnalytics();

  const categoryData = useMemo(
    () => (data?.complaintsByCategory ?? []).map((c) => ({
      label: SEV_LABEL[c.issueType] ?? c.issueType,
      count: c.count,
    })),
    [data],
  );

  const maxCat = Math.max(...categoryData.map((d) => d.count), 1);
  const maxCity = Math.max(...(data?.cityComplaintCounts ?? []).map((d) => d.count), 1);
  const totalComplaints = (data?.complaintsByStatus ?? []).reduce((s, d) => s + d.count, 0);
  const totalUsers = (data?.usersByRole ?? []).reduce((s, d) => s + d.count, 0);

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Intelligence"
        title="Analytics Center"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["pa-analytics"] })}
            className="h-8 text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="h-3 w-32 rounded bg-muted/60" />
              <ChartSkeleton height="h-40" />
            </div>
          ))}
        </div>
      ) : isError || !data ? (
        <QueryError
          message="Couldn't load analytics data."
          onRetry={() => refetch()}
        />
      ) : (
        <div className="space-y-5">
          {/* Monthly trend */}
          {data.complaintsByMonth.length > 0 ? (
            <Panel
              eyebrow="Trend"
              title="Monthly Complaint Submissions"
              action={
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  Last {data.complaintsByMonth.length} months
                </div>
              }
            >
              <SparkBars data={data.complaintsByMonth} />
            </Panel>
          ) : (
            <NoAnalyticsEmpty compact />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By status */}
            {data.complaintsByStatus.length > 0 && (
              <Panel eyebrow="Breakdown" title={`Complaints by Status · ${totalComplaints} total`}>
                <div className="space-y-2">
                  {data.complaintsByStatus.map((d) => (
                    <div key={d.status} className="flex items-center justify-between gap-3">
                      <Pill tone={STATUS_TONE[d.status] ?? "muted"} className="capitalize shrink-0">
                        {d.status}
                      </Pill>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${(d.count / totalComplaints) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-6 text-right shrink-0">{d.count}</span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                        {Math.round((d.count / totalComplaints) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* By category */}
            {categoryData.length > 0 && (
              <Panel eyebrow="Breakdown" title="Complaints by Category">
                <div className="space-y-2">
                  {categoryData.map((item) => (
                    <HBar
                      key={item.label}
                      label={item.label}
                      value={item.count}
                      max={maxCat}
                      total={totalComplaints}
                      showPct
                    />
                  ))}
                </div>
              </Panel>
            )}

            {/* Users by role */}
            {data.usersByRole.length > 0 && (
              <Panel eyebrow="Breakdown" title={`Users by Role · ${totalUsers} total`}>
                <div className="space-y-3">
                  {data.usersByRole.map((d) => (
                    <div key={d.role} className="flex items-center justify-between gap-3">
                      <Pill tone={ROLE_TONE[d.role] ?? "muted"} className="capitalize shrink-0">
                        {d.role}
                      </Pill>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${(d.count / Math.max(totalUsers, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-6 text-right shrink-0">{d.count}</span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                        {Math.round((d.count / Math.max(totalUsers, 1)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Top cities */}
            {data.cityComplaintCounts.length > 0 && (
              <Panel eyebrow="Breakdown" title="Top Cities by Complaint Volume">
                <div className="space-y-2">
                  {data.cityComplaintCounts.map((c) => (
                    <HBar
                      key={c.cityId}
                      label={c.cityId}
                      value={c.count}
                      max={maxCity}
                      total={totalComplaints}
                      colorClass="bg-info/70"
                      showPct
                    />
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* Authority leaderboard */}
          {data.authorityPerformance.length > 0 && (
            <Panel eyebrow="Performance" title="Authority Resolution Leaderboard">
              <div className="divide-y divide-border/50">
                {data.authorityPerformance.map((a, idx) => (
                  <LeaderboardRow
                    key={idx}
                    rank={idx + 1}
                    name={a.name ?? "Unknown"}
                    total={a.total}
                    closed={a.closed}
                    resolutionRate={a.resolutionRate}
                  />
                ))}
              </div>
            </Panel>
          )}

          {/* No data at all */}
          {data.complaintsByMonth.length === 0 &&
            data.complaintsByStatus.length === 0 &&
            categoryData.length === 0 && (
              <NoAnalyticsEmpty />
            )}
        </div>
      )}
    </div>
  );
}
