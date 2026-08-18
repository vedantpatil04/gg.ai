/**
 * Phase 8 — Enterprise Activity Feed
 *
 * Shared chronological event timeline used by citizen, authority, and admin
 * portals. Derives events from the complaint events[] array that already
 * exists on every complaint record — no new backend endpoints needed.
 *
 * Shows: complaint submitted, assigned, investigation started, evidence added,
 * resolution submitted, verified, closed, rework requested, and env alerts.
 */

import { useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  FileText,
  UserCheck,
  Search,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Lock,
  RotateCcw,
  AlertTriangle,
  Plus,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { NoActivityEmpty } from "./empty-states";
import { QueryError } from "./error-states";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  entityId?: string;
  entityTitle?: string;
}

// ─── Event type metadata ──────────────────────────────────────────────────────

const EVENT_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  submitted: { icon: Plus, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  assigned: { icon: UserCheck, color: "text-violet-500", bgColor: "bg-violet-500/10" },
  reassigned: { icon: UserCheck, color: "text-violet-500", bgColor: "bg-violet-500/10" },
  status_change: { icon: Activity, color: "text-slate-500", bgColor: "bg-slate-500/10" },
  "in-progress": { icon: Search, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  image_added: { icon: Camera, color: "text-teal-500", bgColor: "bg-teal-500/10" },
  image_removed: { icon: Camera, color: "text-slate-400", bgColor: "bg-slate-400/10" },
  resolved: { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  resubmitted: { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  verified: { icon: ShieldCheck, color: "text-green-600", bgColor: "bg-green-600/10" },
  closed: { icon: Lock, color: "text-green-600", bgColor: "bg-green-600/10" },
  rework_requested: { icon: RotateCcw, color: "text-red-500", bgColor: "bg-red-500/10" },
  citizen_accepted: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-600/10" },
  rejected: { icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
  note_updated: { icon: FileText, color: "text-slate-500", bgColor: "bg-slate-500/10" },
  environmental_alert: { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  default: { icon: Activity, color: "text-muted-foreground", bgColor: "bg-muted" },
};

function getEventMeta(type: string) {
  return EVENT_META[type] ?? EVENT_META.default;
}

// ─── Single event row ─────────────────────────────────────────────────────────

function EventRow({
  event,
  isLast,
  onClick,
}: {
  event: ActivityEvent;
  isLast: boolean;
  onClick?: (entityId?: string) => void;
}) {
  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const isClickable = !!onClick && !!event.entityId;

  return (
    <div
      className={cn(
        "flex gap-3 relative rounded-xl transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/30 p-1.5 -ml-1.5",
      )}
      onClick={isClickable ? () => onClick(event.entityId) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(event.entityId);
              }
            }
          : undefined
      }
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" aria-hidden />
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative size-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-background",
          meta.bgColor,
        )}
      >
        <Icon className={cn("size-3.5", meta.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {event.detail}
            </p>
          </div>
          <time
            className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5"
            title={format(new Date(event.timestamp), "PPpp")}
          >
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function ActivityFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 pb-4">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActivityFeedProps {
  events: ActivityEvent[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEventClick?: (entityId?: string) => void;
  maxItems?: number;
  className?: string;
  compact?: boolean;
}

export function ActivityFeed({
  events,
  isLoading,
  isError,
  onRetry,
  onEventClick,
  maxItems = 20,
  className,
  compact,
}: ActivityFeedProps) {
  const displayEvents = useMemo(
    () => events.slice(0, maxItems),
    [events, maxItems],
  );

  if (isLoading) return <ActivityFeedSkeleton rows={compact ? 3 : 5} />;
  if (isError) return <QueryError onRetry={onRetry} compact={compact} />;
  if (displayEvents.length === 0) return <NoActivityEmpty compact={compact} />;

  return (
    <div className={cn("space-y-0", className)}>
      {displayEvents.map((event, i) => (
        <EventRow
          key={event.id}
          event={event}
          isLast={i === displayEvents.length - 1}
          onClick={onEventClick}
        />
      ))}
    </div>
  );
}

// ─── Adapter: convert complaint events[] to ActivityEvent[] ──────────────────

interface RawComplaintEvent {
  type: string;
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

export function complaintEventsToActivityFeed(
  events: RawComplaintEvent[],
  complaintTitle: string,
  complaintId: string,
): ActivityEvent[] {
  const TYPE_TITLES: Record<string, string> = {
    submitted: "Complaint Submitted",
    assigned: "Complaint Assigned",
    reassigned: "Complaint Reassigned",
    status_change: "Status Updated",
    "in-progress": "Investigation Started",
    image_added: "Evidence Uploaded",
    image_removed: "Evidence Removed",
    resolved: "Resolution Submitted",
    resubmitted: "Resolution Resubmitted",
    verified: "Resolution Verified",
    closed: "Complaint Closed",
    rework_requested: "Rework Requested",
    citizen_accepted: "Resolution Accepted",
    rejected: "Complaint Rejected",
    note_updated: "Notes Updated",
  };

  return events.map((e, i) => ({
    id: `${complaintId}-event-${i}`,
    type: e.type,
    title: TYPE_TITLES[e.type] ?? e.type,
    detail: e.message,
    timestamp: e.timestamp,
    entityId: complaintId,
    entityTitle: complaintTitle,
  }));
}

// ─── Multi-complaint activity adapter ────────────────────────────────────────

interface ComplaintWithEvents {
  _id: string;
  title: string;
  events?: RawComplaintEvent[];
  createdAt: string;
  status: string;
}

export function complaintsToActivityFeed(
  complaints: ComplaintWithEvents[],
  limit = 20,
): ActivityEvent[] {
  const allEvents: ActivityEvent[] = [];

  for (const complaint of complaints) {
    // Always include the submission itself
    allEvents.push({
      id: `${complaint._id}-submitted`,
      type: "submitted",
      title: "Complaint Submitted",
      detail: complaint.title,
      timestamp: complaint.createdAt,
      entityId: complaint._id,
      entityTitle: complaint.title,
    });

    // Add all recorded events
    for (const event of complaint.events ?? []) {
      allEvents.push({
        id: `${complaint._id}-${event.type}-${event.timestamp}`,
        type: event.type,
        title: event.type.charAt(0).toUpperCase() + event.type.slice(1).replace(/_/g, " "),
        detail: `${complaint.title} — ${event.message}`,
        timestamp: event.timestamp,
        entityId: complaint._id,
        entityTitle: complaint.title,
      });
    }
  }

  return allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
