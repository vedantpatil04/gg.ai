/**
 * Phase 8 — Citizen Dashboard (polished)
 *
 * Changes vs original:
 * - Replaced manual activity list with shared ActivityFeed (shows full
 *   complaint event timeline, not just the latest event per complaint)
 * - Replaced StatSkeleton animate-pulse with shared StatCardSkeleton
 * - Added QueryError for recent complaints error state
 * - Improved grid responsiveness (single col on xs, 2 col on sm, etc.)
 * - Added aria-labels to quick action buttons
 * - Minor spacing and typography polish
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, Panel } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCitizenStats, useMyCitizenComplaints } from "@/components/citizen/citizen-queries";
import { humanizeIssueType, monthLabel } from "@/components/citizen/citizen-status-utils";
import {
  ActivityFeed,
  complaintsToActivityFeed,
} from "@/components/shared/activity-feed";
import { StatCardSkeleton } from "@/components/shared/skeletons";
import { NoComplaintsEmpty } from "@/components/shared/empty-states";

// ─── Mini spark bar chart ─────────────────────────────────────────────────────

function SparkBars({ data = [] }: { data?: Array<{ year: number; month: number; count: number }> }) {
  const safeData = data ?? [];
  const max = Math.max(...safeData.map((d) => d.count ?? 0), 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {safeData.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${monthLabel(d.month)}: ${d.count}`}>
          <div
            className="w-full rounded-sm bg-primary/60 hover:bg-primary transition-colors"
            style={{ height: `${Math.max(4, ((d.count ?? 0) / max) * 44)}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CitizenDashboardProps {
  userName: string;
  onNewComplaint: () => void;
  onViewHistory: () => void;
  onOpenComplaint: (id: string) => void;
}

export function CitizenDashboard({
  userName,
  onNewComplaint,
  onViewHistory,
  onOpenComplaint,
}: CitizenDashboardProps) {
  const { data: statsData, isLoading: statsLoading } = useCitizenStats();
  const {
    data: complaintsData,
    isLoading: complaintsLoading,
    isError: complaintsError,
    refetch: refetchComplaints,
  } = useMyCitizenComplaints({ limit: 10, page: 1 });

  const stats = statsData?.stats;
  const recentComplaints = complaintsData?.complaints ?? [];
  const monthlyTrend = statsData?.monthlyTrend ?? [];
  const categoryBreakdown = useMemo(() => statsData?.categoryBreakdown ?? [], [statsData]);

  // Build activity feed from all events in the recent complaints
  const activityEvents = useMemo(
    () => complaintsToActivityFeed(recentComplaints, 12),
    [recentComplaints],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Welcome ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Citizen Hub
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-1">
            {greeting}, {userName.split(" ")[0]}.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your environmental complaints and contributions.
          </p>
        </div>
        <Button onClick={onNewComplaint} className="gap-2 shrink-0" aria-label="Submit new complaint">
          <Plus className="size-4" />
          New Complaint
        </Button>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statsLoading ? (
          Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Submitted" value={stats?.total ?? 0} accent="primary" icon={<FileText className="size-4" />} />
            <StatCard label="Pending Review" value={stats?.pending ?? 0} accent="warning" icon={<Clock className="size-4" />} hint="Awaiting assignment" />
            <StatCard label="Under Investigation" value={stats?.active ?? 0} accent="info" icon={<Search className="size-4" />} />
            <StatCard label="Awaiting Verification" value={stats?.resolved ?? 0} accent="primary" icon={<AlertCircle className="size-4" />} hint="Resolution submitted" />
            <StatCard label="Closed" value={stats?.closed ?? 0} accent="success" icon={<CheckCircle2 className="size-4" />} />
            <StatCard label="This Month" value={stats?.thisMonth ?? 0} accent="info" icon={<Calendar className="size-4" />} />
            <StatCard
              label="Avg Resolution"
              value={stats?.avgResolutionDays != null ? stats.avgResolutionDays : "—"}
              unit={stats?.avgResolutionDays != null ? "days" : undefined}
              accent="success"
              icon={<TrendingUp className="size-4" />}
              hint="Closed complaints"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Activity timeline ── */}
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Timeline"
            title="Recent Activity"
            action={
              <Button variant="ghost" size="sm" className="text-xs" onClick={onViewHistory}>
                View all
              </Button>
            }
          >
            {recentComplaints.length === 0 && !complaintsLoading && !complaintsError ? (
              <NoComplaintsEmpty onSubmit={onNewComplaint} compact />
            ) : (
              <ActivityFeed
                events={activityEvents}
                isLoading={complaintsLoading}
                isError={complaintsError}
                onRetry={() => refetchComplaints()}
                maxItems={10}
                compact
              />
            )}
          </Panel>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Panel eyebrow="Navigation" title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Complaint", icon: Plus, action: onNewComplaint, primary: true },
                { label: "My History", icon: FileText, action: onViewHistory, primary: false },
              ].map(({ label, icon: Icon, action, primary }) => (
                <button
                  key={label}
                  onClick={action}
                  aria-label={label}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors text-sm font-medium",
                    primary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border bg-muted/30 hover:bg-muted/60",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
              <Link
                to="/profile"
                className="flex flex-col items-center gap-2 rounded-xl p-4 border border-border bg-muted/30 hover:bg-muted/60 text-center text-sm font-medium transition-colors"
                aria-label="Go to profile"
              >
                <User className="size-5" />
                Profile
              </Link>
              <Link
                to="/environment"
                className="flex flex-col items-center gap-2 rounded-xl p-4 border border-border bg-muted/30 hover:bg-muted/60 text-center text-sm font-medium transition-colors"
                aria-label="Check city status"
              >
                <Search className="size-5" />
                City Status
              </Link>
            </div>
          </Panel>

          {/* Monthly trend */}
          {monthlyTrend.length > 0 && (
            <Panel eyebrow="Analytics" title="Monthly Submissions">
              <SparkBars data={monthlyTrend} />
            </Panel>
          )}

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <Panel eyebrow="Breakdown" title="By Category">
              <div className="space-y-2">
                {categoryBreakdown.slice(0, 5).map((c: { issueType: string; count: number }) => {
                  const max = categoryBreakdown[0].count;
                  return (
                    <div key={c.issueType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground/70">{humanizeIssueType(c.issueType)}</span>
                        <span className="font-medium">{c.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(c.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
