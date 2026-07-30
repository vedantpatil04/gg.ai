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
  Loader2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, Panel, EmptyState } from "@/components/ui-bits";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCitizenStats, useMyCitizenComplaints } from "./citizen-queries";
import { getStatusMeta, humanizeIssueType, monthLabel, safeFormatDate } from "./citizen-status-utils";
import type { CitizenComplaint } from "./citizen-queries";

// ─── Stat skeleton ────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-2.5 w-20 rounded bg-muted" />
      <div className="h-8 w-14 rounded bg-muted" />
      <div className="h-2 w-24 rounded bg-muted" />
    </div>
  );
}

// ─── Mini spark bar chart ─────────────────────────────────────────────────────

function SparkBars({
  data = [],
}: {
  data?: Array<{ year: number; month: number; count: number }>;
}) {
  const safeData = data ?? [];
  const max = Math.max(...safeData.map((d) => d.count ?? 0), 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {safeData.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-primary/60 transition-all"
            style={{ height: `${Math.max(4, ((d.count ?? 0) / max) * 44)}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Recent activity item ─────────────────────────────────────────────────────

function ActivityRow({ complaint }: { complaint: CitizenComplaint }) {
  const events = complaint.events ?? [];
  const latestEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const statusMeta = getStatusMeta(complaint.status);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="size-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{complaint.title}</div>
        <div className="text-xs text-muted-foreground">
          {latestEvent
            ? `${(latestEvent.message ?? "").slice(0, 60)} · ${safeFormatDate(latestEvent.timestamp, "MMM d")}`
            : safeFormatDate(complaint.createdAt, "MMM d, yyyy")}
        </div>
      </div>
      <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
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
  const { data: complaintsData, isLoading: complaintsLoading } = useMyCitizenComplaints({
    limit: 5,
    page: 1,
  });

  const stats = statsData?.stats;
  const recentComplaints = complaintsData?.complaints ?? [];
  const monthlyTrend = statsData?.monthlyTrend ?? [];
  const categoryBreakdown = useMemo(
    () => statsData?.categoryBreakdown ?? [],
    [statsData],
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
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            {greeting}, {userName.split(" ")[0]}.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your environmental complaints and contribution.
          </p>
        </div>
        <Button onClick={onNewComplaint} className="gap-2 shrink-0">
          <Plus className="size-4" />
          New Complaint
        </Button>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statsLoading ? (
          Array.from({ length: 7 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Submitted"
              value={stats?.total ?? 0}
              accent="primary"
              icon={<FileText className="size-4" />}
            />
            <StatCard
              label="Pending Review"
              value={stats?.pending ?? 0}
              accent="warning"
              icon={<Clock className="size-4" />}
              hint="Awaiting assignment"
            />
            <StatCard
              label="Under Investigation"
              value={stats?.active ?? 0}
              accent="info"
              icon={<Search className="size-4" />}
            />
            <StatCard
              label="Awaiting Verification"
              value={stats?.resolved ?? 0}
              accent="primary"
              icon={<AlertCircle className="size-4" />}
              hint="Resolution submitted"
            />
            <StatCard
              label="Closed"
              value={stats?.closed ?? 0}
              accent="success"
              icon={<CheckCircle2 className="size-4" />}
            />
            <StatCard
              label="This Month"
              value={stats?.thisMonth ?? 0}
              accent="info"
              icon={<Calendar className="size-4" />}
            />
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
        {/* ── Recent activity ── */}
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Recent"
            title="Latest Activity"
            action={
              <Button variant="ghost" size="sm" className="text-xs" onClick={onViewHistory}>
                View all
              </Button>
            }
          >
            {complaintsLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : recentComplaints.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-4" />}
                title="No complaints yet"
                description="Submit your first environmental complaint to get started."
                action={
                  <Button size="sm" onClick={onNewComplaint}>
                    <Plus className="size-3.5 mr-1.5" />
                    Submit Complaint
                  </Button>
                }
              />
            ) : (
              <div>
                {recentComplaints.map((c) => (
                  <div
                    key={c._id}
                    className="cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                    onClick={() => onOpenComplaint(c._id)}
                  >
                    <ActivityRow complaint={c} />
                  </div>
                ))}
              </div>
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
              >
                <User className="size-5" />
                Profile
              </Link>
              <Link
                to="/environment"
                className="flex flex-col items-center gap-2 rounded-xl p-4 border border-border bg-muted/30 hover:bg-muted/60 text-center text-sm font-medium transition-colors"
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
                {categoryBreakdown.slice(0, 5).map((c) => {
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
