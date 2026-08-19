import { useState, useEffect } from "react";
import {
  Search, Loader2, AlertCircle, Inbox, ShieldCheck, Send,
  CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, Mail, MailOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  useCommList, useCommDetail, useReplyToCommunication, useResolveCommunication, useReopenCommunication,
} from "./communication-hub-queries";
import type { CommTypeKey, CommDetailItem } from "@/lib/api/communication-hub.api";

// ─── Per-type config ────────────────────────────────────────────────────────

const STATUS_OPTIONS: Record<CommTypeKey, string[]> = {
  tickets:  ["open", "in_progress", "waiting", "resolved", "closed", "reopened"],
  bugs:     ["open", "acknowledged", "fixed", "wontfix", "resolved", "reopened"],
  features: ["submitted", "planned", "in_progress", "shipped", "declined", "resolved", "reopened"],
  feedback: ["open", "resolved", "reopened"],
};

const RESOLVED_LIKE = new Set(["resolved", "closed", "fixed", "shipped", "wontfix", "declined"]);

function statusColor(status: string): string {
  if (status === "reopened")        return "var(--color-destructive)";
  if (RESOLVED_LIKE.has(status))    return "var(--color-success)";
  if (status === "acknowledged" || status === "in_progress" || status === "planned") return "var(--color-warning)";
  return "var(--color-info)";
}

function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0"
      style={{ color: c, background: `color-mix(in oklab, ${c} 12%, transparent)` }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function timeAgo(iso: string): string {
  const d   = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60000);
  if (min < 2)  return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function detailTitle(type: CommTypeKey, item: CommDetailItem): string {
  if (type === "tickets")  return item.subject ?? "";
  if (type === "feedback") return item.category ?? "Feedback";
  return item.title ?? "";
}

// ─── List + toolbar ─────────────────────────────────────────────────────────

export function CommunicationTypePanel({
  type,
  initialSelectedId,
  typeLabel,
}: {
  type: CommTypeKey;
  initialSelectedId?: string | null;
  typeLabel: string;
}) {
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState<string>("all");
  const [unread, setUnread]   = useState<"all" | "true" | "false">("all");
  const [page, setPage]       = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  // Re-apply a deep-linked id if the caller passes a new one (e.g. clicking
  // a different notification while the Hub is already open on this tab).
  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  const { data, isLoading, isError, refetch } = useCommList(type, {
    page, limit: 20,
    status: status === "all" ? undefined : status,
    unread: unread === "all" ? undefined : unread,
    search: search.trim() || undefined,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={`Search ${typeLabel.toLowerCase()}, reference ID, or user…`}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS[type].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={unread} onValueChange={v => { setUnread(v as typeof unread); setPage(1); }}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Read state" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Read & unread</SelectItem>
            <SelectItem value="true">Unread only</SelectItem>
            <SelectItem value="false">Read only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading {typeLabel.toLowerCase()}…</span>
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<AlertCircle className="size-5" />}
          title={`Couldn't load ${typeLabel.toLowerCase()}`}
          action={<button onClick={() => refetch()} className="text-xs font-semibold text-primary hover:underline">Try again</button>}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title={`No ${typeLabel.toLowerCase()} found`}
          description={search || status !== "all" || unread !== "all" ? "Try adjusting your filters." : `Submitted ${typeLabel.toLowerCase()} will appear here.`}
        />
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-1.5">
          {data.items.map(item => (
            <button
              key={item._id}
              onClick={() => setSelectedId(item._id)}
              className="w-full text-left flex items-start gap-3 px-3.5 py-3 rounded-xl border border-border hover:border-primary/25 hover:bg-muted/20 transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                {item.adminRead ? <MailOpen className="size-4 text-muted-foreground" /> : <Mail className="size-4 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{item._id.slice(-8).toUpperCase()}</span>
                  <StatusBadge status={item.status} />
                  {item.priority && <span className="text-[10px] text-muted-foreground capitalize">{item.priority} priority</span>}
                  {item.severity && <span className="text-[10px] text-muted-foreground capitalize">{item.severity}</span>}
                </div>
                <div className="text-sm font-semibold truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.submittedBy?.name ?? "Unknown user"} ({item.submittedBy?.email ?? "—"}) · {timeAgo(item.createdAt)}
                  {item.commentCount > 0 && ` · ${item.commentCount} ${item.commentCount === 1 ? "reply" : "replies"}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="size-3.5" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground">Page {data.page} of {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      <CommunicationDetailSheet
        type={type}
        id={selectedId}
        onOpenChange={open => { if (!open) setSelectedId(null); }}
      />
    </div>
  );
}

// ─── Detail sheet ───────────────────────────────────────────────────────────

function CommunicationDetailSheet({
  type, id, onOpenChange,
}: {
  type: CommTypeKey;
  id: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: item, isLoading, isError } = useCommDetail(type, id);
  const reply   = useReplyToCommunication(type);
  const resolve = useResolveCommunication(type);
  const reopen  = useReopenCommunication(type);
  const [replyBody, setReplyBody] = useState("");

  const canResolve = item && !RESOLVED_LIKE.has(item.status);
  const canReopen  = item && RESOLVED_LIKE.has(item.status);

  const handleReply = () => {
    if (!id || !replyBody.trim()) return;
    reply.mutate({ id, body: replyBody.trim() }, { onSuccess: () => setReplyBody("") });
  };

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Couldn't load this communication.</p>
          </div>
        )}
        {item && (
          <div className="flex flex-col h-full">
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{item._id.slice(-8).toUpperCase()}</span>
                <StatusBadge status={item.status} />
                {item.priority && <span className="text-[10px] text-muted-foreground capitalize">{item.priority} priority</span>}
                {item.severity && <span className="text-[10px] text-muted-foreground capitalize">{item.severity}</span>}
              </div>
              <SheetTitle className="text-lg leading-snug">{detailTitle(type, item)}</SheetTitle>
              <SheetDescription className="text-xs">
                {item.submittedBy?.name ?? "Unknown user"} ({item.submittedBy?.email ?? "—"}) · Opened {timeAgo(item.createdAt)} · Updated {timeAgo(item.updatedAt)}
              </SheetDescription>
            </SheetHeader>

            {/* Body */}
            <div className="mt-4 space-y-3">
              {(item.description || item.comment) && (
                <div className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.description ?? item.comment}
                </div>
              )}

              {type === "bugs" && (
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {item.steps    && <Field label="Steps to reproduce" value={item.steps} full />}
                  {item.expected && <Field label="Expected" value={item.expected} />}
                  {item.actual   && <Field label="Actual" value={item.actual} />}
                  {(item.platform || item.browser || item.device) && (
                    <Field label="Environment" value={[item.platform, item.browser, item.device].filter(Boolean).join(" · ")} full />
                  )}
                </div>
              )}

              {type === "features" && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {typeof item.voteCount === "number" && <span>{item.voteCount} citizen vote{item.voteCount === 1 ? "" : "s"}</span>}
                  {item.tags && item.tags.length > 0 && item.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-muted">{t}</span>
                  ))}
                </div>
              )}

              {type === "feedback" && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {typeof item.rating === "number" && <span>Rating: <strong className="text-foreground">{item.rating}/5</strong></span>}
                  {typeof item.nps === "number" && item.nps >= 0 && <span>NPS: <strong className="text-foreground">{item.nps}/10</strong></span>}
                  {typeof item.uiSatisfaction === "number" && item.uiSatisfaction > 0 && <span>UI: <strong className="text-foreground">{item.uiSatisfaction}/5</strong></span>}
                  {typeof item.aiSatisfaction === "number" && item.aiSatisfaction > 0 && <span>AI: <strong className="text-foreground">{item.aiSatisfaction}/5</strong></span>}
                </div>
              )}

              {item.category && type !== "feedback" && (
                <div className="text-xs text-muted-foreground">Category: <span className="text-foreground">{item.category}</span></div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              {canResolve && (
                <Button size="sm" onClick={() => id && resolve.mutate(id)} disabled={resolve.isPending}>
                  {resolve.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Resolve
                </Button>
              )}
              {canReopen && (
                <Button size="sm" variant="outline" onClick={() => id && reopen.mutate(id)} disabled={reopen.isPending}>
                  {reopen.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                  Reopen
                </Button>
              )}
            </div>

            {/* Conversation */}
            <div className="mt-5 flex-1 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Conversation</div>
              {item.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No replies yet.</p>
              ) : (
                item.comments.map(c => (
                  <div
                    key={c._id}
                    className={cn(
                      "rounded-xl p-3 text-xs leading-relaxed",
                      c.authorRole === "administrator" ? "bg-primary/5 border border-primary/15" : "bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {c.authorRole === "administrator" && <ShieldCheck className="size-3 text-primary" />}
                      <span className="font-semibold">
                        {c.isSystem ? "Communication Hub" : c.authorRole === "administrator" ? `${c.authorName} · Administrator` : c.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="mt-4 pt-4 border-t border-border flex items-end gap-2">
              <Textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Reply to this citizen…"
                rows={2}
                className="flex-1 text-sm resize-none"
              />
              <Button
                size="icon"
                onClick={handleReply}
                disabled={!replyBody.trim() || reply.isPending}
                className="shrink-0"
              >
                {reply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <div className="text-foreground/90 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
