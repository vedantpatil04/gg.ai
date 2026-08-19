import type { ComponentType, ReactNode } from "react";
import { BarChart3, BellRing, RefreshCw } from "lucide-react";
import { Panel, SectionTitle, Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Generic empty state for any dashboard slot that doesn't have real content
 * yet. Shared here (rather than redefined per-slot) so future phases can
 * reuse it too instead of inventing their own "coming soon" markup.
 */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-8 px-4">
      <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground max-w-[240px]">{description}</div>
    </div>
  );
}

function ComingSoonPill() {
  return <Pill tone="muted">Coming soon</Pill>;
}

export interface AdminDashboardContainerProps {
  /** Stat card row. */
  statsCards?: ReactNode;
  /** Environmental Intelligence panel (Phase 2.2). */
  environmentalIntelligence?: ReactNode;
  /** Complaint Intelligence Summary panel (Phase 2.2). */
  complaintSummary?: ReactNode;
  /** Authority Overview panel (Phase 2.2). */
  authorityOverview?: ReactNode;
  /** Chart panel — pass a real chart once Analytics exists. */
  charts?: ReactNode;
  /** Recent activity feed. */
  recentActivity?: ReactNode;
  /** Quick action shortcuts. */
  quickActions?: ReactNode;
  /** Notification summary — pass a real summary once the Notification Center exists. */
  notificationSummary?: ReactNode;
  /** System status. */
  systemStatus?: ReactNode;
  /** Refreshes every live query on the dashboard. Omit to hide the control. */
  onRefresh?: () => void;
  /** Spins the refresh icon while a refresh is in flight. */
  isRefreshing?: boolean;
}

/**
 * Reusable shell for the Administrator dashboard. Every slot is optional and
 * falls back to a labeled placeholder — Phase 2.1 built the container and
 * shape; Phase 2.2 fills statsCards, the three intelligence panels,
 * recentActivity, quickActions, and systemStatus with live data. `charts`
 * and `notificationSummary` remain placeholders — Analytics and the
 * Notification Center are each their own future phase.
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
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-full overflow-hidden">
      <section>
        <SectionTitle
          eyebrow="Platform"
          title="Statistics"
          action={
            onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="h-8 text-xs shrink-0">
                <RefreshCw className={cn("size-3.5 mr-1.5", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            )
          }
        />
        {statsCards}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <Panel title="Environmental Intelligence" eyebrow="Network">
          {environmentalIntelligence}
        </Panel>
        <Panel title="Complaint Intelligence" eyebrow="Summary">
          {complaintSummary}
        </Panel>
        <Panel title="Authority Overview" eyebrow="Workforce" className="md:col-span-2 lg:col-span-1">
          {authorityOverview}
        </Panel>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <Panel
          title="Analytics"
          eyebrow="Charts"
          action={<ComingSoonPill />}
          className="lg:col-span-2"
        >
          {charts ?? (
            <AdminEmptyState
              icon={BarChart3}
              title="Charts will appear here"
              description="Environmental, complaint, and platform trend charts arrive with the Analytics module."
            />
          )}
        </Panel>

        <Panel title="Recent Activity" eyebrow="Live feed">
          {recentActivity}
        </Panel>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <Panel title="Quick Actions" eyebrow="Shortcuts">
          {quickActions}
        </Panel>

        <Panel title="Notification Summary" eyebrow="Alerts" action={<ComingSoonPill />}>
          {notificationSummary ?? (
            <AdminEmptyState
              icon={BellRing}
              title="Nothing to summarize yet"
              description="A rollup of platform notifications arrives with the Notification Center."
            />
          )}
        </Panel>

        <Panel title="System Health" eyebrow="Live" className="md:col-span-2 lg:col-span-1">
          {systemStatus}
        </Panel>
      </section>
    </div>
  );
}
