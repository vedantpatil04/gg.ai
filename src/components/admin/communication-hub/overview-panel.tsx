import {
  Ticket, Bug, Lightbulb, MessageCircle, Inbox, CircleDot,
  CheckCircle2, RotateCcw, MailWarning, Sparkles, Loader2, AlertCircle,
} from "lucide-react";
import { StatCard, EmptyState } from "@/components/ui-bits";
import { useCommOverview } from "./communication-hub-queries";
import type { CommTypeKey } from "@/lib/api/communication-hub.api";

const TYPE_META: Record<CommTypeKey, { label: string; icon: typeof Ticket }> = {
  tickets:  { label: "Tickets",          icon: Ticket },
  bugs:     { label: "Bug Reports",      icon: Bug },
  features: { label: "Feature Requests", icon: Lightbulb },
  feedback: { label: "Feedback",         icon: MessageCircle },
};

function timeAgo(iso: string): string {
  const d   = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60000);
  if (min < 2)  return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

export function CommunicationOverviewPanel({ onJumpTo }: { onJumpTo: (type: CommTypeKey, id: string) => void }) {
  const { data, isLoading, isError, refetch } = useCommOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading overview…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-5" />}
        title="Couldn't load the overview"
        description="Something went wrong fetching Communication Hub stats."
        action={
          <button onClick={() => refetch()} className="text-xs font-semibold text-primary hover:underline">
            Try again
          </button>
        }
      />
    );
  }

  const { totals, byType, recent } = data;

  return (
    <div className="space-y-6">
      {/* Top-line totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="New (24h)" value={totals.new} icon={<Sparkles className="size-4" />} accent="info" />
        <StatCard label="Unread" value={totals.unread} icon={<MailWarning className="size-4" />} accent="warning" />
        <StatCard label="Open" value={totals.open} icon={<CircleDot className="size-4" />} accent="primary" />
        <StatCard label="Resolved" value={totals.resolved} icon={<CheckCircle2 className="size-4" />} accent="success" />
        <StatCard label="Reopened" value={totals.reopened} icon={<RotateCcw className="size-4" />} accent="destructive" />
        <StatCard label="Total" value={totals.total} icon={<Inbox className="size-4" />} accent="primary" />
      </div>

      {/* Per-type breakdown */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">By Type</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {byType.map((t) => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            return (
              <button
                key={t.type}
                onClick={() => onJumpTo(t.type, "")}
                className="text-left rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="size-4 text-primary" />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  {t.unread > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {t.unread} unread
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold tabular-nums">{t.open}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Open</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: "var(--color-success)" }}>{t.resolved}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Resolved</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums" style={{ color: "var(--color-destructive)" }}>{t.reopened}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Reopened</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Recent Activity</div>
        {recent.length === 0 ? (
          <EmptyState icon={<Inbox className="size-5" />} title="No communications yet" description="New tickets, bug reports, feature requests, and feedback will show up here." />
        ) : (
          <div className="space-y-1.5">
            {recent.map((r) => {
              const meta = TYPE_META[r.type];
              const Icon = meta.icon;
              const isReopened = r.status === "reopened";
              const isResolved = ["resolved", "closed", "fixed", "shipped", "wontfix", "declined"].includes(r.status);
              const badgeColor = isReopened ? "var(--color-destructive)" : isResolved ? "var(--color-success)" : "var(--color-muted-foreground)";
              return (
                <button
                  key={`${r.type}-${r._id}`}
                  onClick={() => onJumpTo(r.type, r._id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {meta.label} · {r.submittedBy?.name ?? "Unknown user"} · {timeAgo(r.updatedAt)}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize"
                    style={{ color: badgeColor, background: `color-mix(in oklab, ${badgeColor} 12%, transparent)` }}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
