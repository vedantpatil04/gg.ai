/**
 * Phase 8 — Shared empty state components
 *
 * Provides meaningful, actionable empty states for every major section.
 * Consistent design: icon + title + description + optional CTA.
 */

import type { ComponentType, ReactNode } from "react";
import {
  FileText,
  Bell,
  Users,
  BarChart3,
  Search,
  Map,
  Inbox,
  AlertTriangle,
  ClipboardList,
  Building2,
  Activity,
  ShieldCheck,
  Leaf,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Base component ───────────────────────────────────────────────────────────

interface EmptyStateBaseProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyStateBase({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateBaseProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-2" : "py-16 gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-muted/60 grid place-items-center text-muted-foreground",
          compact ? "size-10" : "size-14",
        )}
      >
        <Icon className={compact ? "size-4" : "size-6"} />
      </div>
      <div className="space-y-1 max-w-[260px]">
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>{title}</p>
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ─── Domain-specific empty states ─────────────────────────────────────────────

export function NoComplaintsEmpty({
  onSubmit,
  compact,
}: {
  onSubmit?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyStateBase
      icon={ClipboardList}
      title="No complaints yet"
      description="You haven't submitted any complaints. When you do, they'll appear here."
      compact={compact}
      action={
        onSubmit && (
          <Button size="sm" onClick={onSubmit} className="gap-1.5">
            <MessageSquarePlus className="size-3.5" />
            Submit a Complaint
          </Button>
        )
      }
    />
  );
}

export function NoSearchResultsEmpty({
  query,
  onClear,
  compact,
}: {
  query?: string;
  onClear?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyStateBase
      icon={Search}
      title="No results found"
      description={
        query
          ? `No matches for "${query}". Try different keywords or clear the filter.`
          : "No items match the current filter. Try adjusting your search."
      }
      compact={compact}
      action={
        onClear && (
          <Button size="sm" variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        )
      }
    />
  );
}

export function NoNotificationsEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Bell}
      title="All caught up"
      description="No notifications right now. New activity will appear here."
      compact={compact}
    />
  );
}

export function NoAuthoritiesEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Users}
      title="No authorities found"
      description="No authority accounts match the current filter."
      compact={compact}
    />
  );
}

export function NoReportsEmpty({
  onGenerate,
  compact,
}: {
  onGenerate?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyStateBase
      icon={FileText}
      title="No reports generated"
      description="Generate an AI-powered report to see platform intelligence summaries here."
      compact={compact}
      action={
        onGenerate && (
          <Button size="sm" onClick={onGenerate} className="gap-1.5">
            Generate Report
          </Button>
        )
      }
    />
  );
}

export function NoAnalyticsEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={BarChart3}
      title="No analytics data yet"
      description="Analytics will populate as complaints are submitted and processed."
      compact={compact}
    />
  );
}

export function NoAlertsEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={AlertTriangle}
      title="No active alerts"
      description="Environmental conditions are within normal ranges. Alerts appear here when thresholds are exceeded."
      compact={compact}
    />
  );
}

export function NoCitiesEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Building2}
      title="No cities configured"
      description="Add cities to start monitoring environmental data and managing complaints."
      compact={compact}
    />
  );
}

export function NoActivityEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Activity}
      title="No recent activity"
      description="Platform activity will appear here as complaints are submitted and processed."
      compact={compact}
    />
  );
}

export function NoInvestigationsEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={ShieldCheck}
      title="No assignments yet"
      description="When complaints are assigned to you, they'll appear here for investigation."
      compact={compact}
    />
  );
}

export function NoMapDataEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Map}
      title="No map data available"
      description="Select a city with environmental data to see it on the map."
      compact={compact}
    />
  );
}

export function NoEnvironmentalDataEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Leaf}
      title="No environmental data"
      description="Environmental readings will appear here once monitoring begins for this city."
      compact={compact}
    />
  );
}

export function InboxEmpty({ compact }: { compact?: boolean }) {
  return (
    <EmptyStateBase
      icon={Inbox}
      title="Inbox is empty"
      description="No pending items require your attention."
      compact={compact}
    />
  );
}
