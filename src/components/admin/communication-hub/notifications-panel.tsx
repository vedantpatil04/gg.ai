import { formatDistanceToNow } from "date-fns";
import { Loader2, AlertCircle, Inbox, CheckCheck, Ticket, Bug, Lightbulb, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkAsRead, useMarkAllRead } from "@/hooks/use-notifications";
import type { CommTypeKey } from "@/lib/api/communication-hub.api";

const ENTITY_TO_TYPE: Record<string, CommTypeKey> = {
  ticket: "tickets", bug: "bugs", feature: "features", feedback: "feedback",
};

const ENTITY_ICON: Record<string, typeof Ticket> = {
  ticket: Ticket, bug: Bug, feature: Lightbulb, feedback: MessageCircle,
};

const PRIORITY_DOT: Record<string, string> = {
  low: "var(--color-muted-foreground)", medium: "var(--color-info)",
  high: "var(--color-warning)", critical: "var(--color-destructive)",
};

export function CommunicationNotificationsPanel({ onJumpTo }: { onJumpTo: (type: CommTypeKey, id: string) => void }) {
  const { data, isLoading, isError, refetch } = useNotifications({ category: "support", limit: 30, sort: "newest" });
  const markAsRead  = useMarkAsRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];

  const handleClick = (id: string, status: string, entityType?: string, entityId?: string) => {
    if (status === "unread") markAsRead.mutate(id);
    if (entityType && entityId && ENTITY_TO_TYPE[entityType]) {
      onJumpTo(ENTITY_TO_TYPE[entityType], entityId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading notifications…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-5" />}
        title="Couldn't load notifications"
        action={<button onClick={() => refetch()} className="text-xs font-semibold text-primary hover:underline">Try again</button>}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data?.unreadCount ? `${data.unreadCount} unread` : "All caught up"} · new tickets, bug reports, feature requests, and feedback appear here
        </p>
        {!!data?.unreadCount && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate("support")} disabled={markAllRead.isPending}>
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Inbox className="size-5" />} title="No communication notifications yet" />
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const Icon = (n.entityType && ENTITY_ICON[n.entityType]) || Inbox;
            const isUnread = n.status === "unread";
            return (
              <button
                key={n._id}
                onClick={() => handleClick(n._id, n.status, n.entityType, n.entityId)}
                className={cn(
                  "w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-colors",
                  isUnread ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/40",
                )}
              >
                <div className="relative shrink-0 mt-0.5">
                  <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-background"
                    style={{ background: PRIORITY_DOT[n.priority] ?? PRIORITY_DOT.low }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-snug", isUnread ? "font-semibold" : "font-medium")}>{n.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.summary}</p>
                </div>
                {isUnread && <span className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
