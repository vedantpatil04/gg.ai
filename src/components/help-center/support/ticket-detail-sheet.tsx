import { useState } from "react";
import { Loader2, AlertCircle, Send, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge, PriorityBadge } from "./support-ui";
import { useTicketDetail, useAddTicketComment } from "./support-store";
import { supportTicketApi } from "@/lib/api/support.api";
import { useQueryClient } from "@tanstack/react-query";
import { supportKeys } from "./support-store";

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

export function TicketDetailSheet({
  ticketId,
  onOpenChange,
}: {
  ticketId:     string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: ticket, isLoading, isError } = useTicketDetail(ticketId);
  const addComment = useAddTicketComment(ticketId ?? "");
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [reopening, setReopening] = useState(false);

  const canReopen = ticket && (ticket.status === "resolved" || ticket.status === "closed");

  const handleSend = () => {
    if (!reply.trim()) return;
    addComment.mutate(reply.trim(), { onSuccess: () => setReply("") });
  };

  const handleReopen = async () => {
    if (!ticketId) return;
    setReopening(true);
    try {
      const updated = await supportTicketApi.update(ticketId, { status: "reopened" });
      qc.setQueryData(supportKeys.ticket(ticketId), updated);
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    } finally {
      setReopening(false);
    }
  };

  return (
    <Sheet open={!!ticketId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading ticket…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ticket not found or could not be loaded.</p>
          </div>
        )}

        {ticket && (
          <div className="flex flex-col h-full">
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{ticket._id.slice(-8).toUpperCase()}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
              <SheetTitle className="text-lg leading-snug">{ticket.subject}</SheetTitle>
              <SheetDescription className="text-xs">
                {ticket.category} · Opened {timeAgo(ticket.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>

            {/* Conversation */}
            <div className="mt-5 flex-1 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Conversation</div>
              {ticket.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No replies yet — our team typically responds within {ticket.estimatedResponse ?? "a few hours"}.</p>
              ) : (
                ticket.comments.map(c => (
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
                        {c.isSystem ? "GreenGuard" : c.authorRole === "administrator" ? `${c.authorName} · Administrator` : c.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reopen */}
            {canReopen && (
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-60"
              >
                {reopening ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                Reopen this ticket
              </button>
            )}

            {/* Reply box */}
            <div className="mt-4 pt-4 border-t border-border flex items-end gap-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Add a reply…"
                rows={2}
                className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || addComment.isPending}
                className="shrink-0 size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {addComment.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
