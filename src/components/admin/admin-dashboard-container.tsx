import type { ComponentType, ReactNode } from "react";
import { BarChart3, BellRing, RefreshCw, Activity, Layers, Radio, Sparkles } from "lucide-react";
import { Panel, Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Polished empty state for dashboard slots that await future module rollout.
 */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  badgeText = "Coming soon",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badgeText?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2.5 py-7 px-4 rounded-xl border border-dashed border-border/50 bg-muted/10">
      <div className="size-10 rounded-xl bg-muted/80 border border-border/50 grid place-items-center text-muted-foreground shadow-2xs">
        <Icon className="size-4.5" />
      </div>
      <div>
        <div className="text-xs font-semibold text-foreground tracking-tight">{title}</div>
        <div className="text-[11px] text-muted-foreground/80 max-w-[260px] mx-auto mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
      <Pill tone="muted" className="text-[9.5px] px-2 py-0.5 mt-1 font-mono">
        {badgeText}
      </Pill>
    </div>
  );
}

function ComingSoonPill() {
  return <Pill tone="muted" className="text-[9.5px] font-mono">In Staging</Pill>;
}

export interface AdminDashboardContainerProps {
  /** Stat card row. */
  statsCards?: ReactNode;
  /** Environmental Intelligence panel. */
  environmentalIntelligence?: ReactNode;
  /** Complaint Intelligence Summary panel. */
  complaintSummary?: ReactNode;
  /** Authority Overview panel. */
  authorityOverview?: ReactNode;
  /** Chart panel. */
  charts?: ReactNode;
  /** Recent activity feed. */
  recentActivity?: ReactNode;
  /** Quick action shortcuts. */
  quickActions?: ReactNode;
  /** Notification summary. */
  notificationSummary?: ReactNode;
  /** System status. */
  systemStatus?: ReactNode;
  /** Refreshes every live query on the dashboard. */
  onRefresh?: () => void;
  /** Spins the refresh icon while a refresh is in flight. */
  isRefreshing?: boolean;
}

/**
 * Reusable shell for the Administrator Command Center.
 * Arranges all operational modules into a cohesive, responsive layout.
 */
export function AdminDashboardContainer({
  statsCards,
  environmentalIntelligence,
  complaintSummary,
  authorityOverview,
  charts,
  recentActivity,
  quickActions,
  notificationSummary,
  systemStatus,
  onRefresh,
  isRefreshing,
}: AdminDashboardContainerProps) {
  return (
    <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4.5 sm:space-y-5 max-w-full overflow-hidden">
      {/* ── 1. COMMAND CENTER EXECUTIVE HEADER ──────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations Telemetry
            </span>
            <span>&middot;</span>
            <span>Admin Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
            Platform Command Center
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-2xl leading-relaxed">
            Real-time executive oversight across environmental monitoring, complaints governance, authority workforce, and platform infrastructure.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8.5 text-xs font-medium border-border/70 hover:border-border hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5 text-primary", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? "Syncing..." : "Sync Data"}</span>
            </Button>
          )}
        </div>
      </section>

      {/* ── 2. KEY PLATFORM TELEMETRY (TOP STATS) ───────────────────────── */}
      <section aria-label="Platform Statistics Overview">
        {statsCards}
      </section>

      {/* ── 3. CORE OPERATIONAL INTELLIGENCE (3 TIERS) ──────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Environmental Intelligence */}
        <Panel
          title="Environmental Intelligence"
          eyebrow="Network Telemetry"
          surface="card"
          className="border border-border/70 bg-card/60"
        >
          {environmentalIntelligence}
        </Panel>

        {/* Complaint Intelligence */}
        <Panel
          title="Complaint Intelligence"
          eyebrow="Governance & Backlog"
          surface="card"
          className="border border-border/70 bg-card/60"
        >
          {complaintSummary}
        </Panel>

        {/* Authority Overview */}
        <Panel
          title="Authority Workforce"
          eyebrow="Field Operations"
          surface="card"
          className="md:col-span-2 xl:col-span-1 border border-border/70 bg-card/60"
        >
          {authorityOverview}
        </Panel>
      </section>

      {/* ── 4. ANALYTICS & LIVE EVENT FEED ───────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Analytics Section */}
        <Panel
          title="Platform Analytics & Trend Intelligence"
          eyebrow="Telemetry Engine"
          action={<ComingSoonPill />}
          surface="card"
          className="lg:col-span-2 border border-border/70 bg-card/60"
        >
          {charts ?? (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left opacity-75">
                <div className="p-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Pollution Trends</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">AQI & PM2.5 Dynamics</div>
                </div>
                <div className="p-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Resolution Velocity</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">Mean Time to Resolve</div>
                </div>
                <div className="p-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Agency Performance</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">SLA Compliance Rate</div>
                </div>
              </div>

              <AdminEmptyState
                icon={BarChart3}
                title="Historical Telemetry Engine in Staging"
                description="Comparative multi-city pollution modeling, time-series forecasting, and agency SLA analytics deploy with the dedicated Analytics module."
                badgeText="Phase 4 Module"
              />
            </div>
          )}
        </Panel>

        {/* Live Activity Feed */}
        <Panel
          title="Recent Activity"
          eyebrow="Live Stream"
          surface="card"
          className="border border-border/70 bg-card/60"
        >
          {recentActivity}
        </Panel>
      </section>

      {/* ── 5. INFRASTRUCTURE & RAPID ACTIONS ────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Quick Actions */}
        <Panel
          title="Quick Actions"
          eyebrow="Admin Shortcuts"
          surface="card"
          className="border border-border/70 bg-card/60"
        >
          {quickActions}
        </Panel>

        {/* Notification Summary */}
        <Panel
          title="Notification Summary"
          eyebrow="Channel Rollup"
          action={<ComingSoonPill />}
          surface="card"
          className="border border-border/70 bg-card/60"
        >
          {notificationSummary ?? (
            <AdminEmptyState
              icon={BellRing}
              title="Notification Stream Listening"
              description="Real-time multi-channel broadcast summary, emergency advisories, and escalation rollups deploy with the Notification Center."
              badgeText="Phase 5 Module"
            />
          )}
        </Panel>

        {/* System Health */}
        <Panel
          title="Infrastructure Health"
          eyebrow="Diagnostics"
          surface="card"
          className="md:col-span-2 lg:col-span-1 border border-border/70 bg-card/60"
        >
          {systemStatus}
        </Panel>
      </section>
    </div>
  );
}

