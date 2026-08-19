import { useState } from "react";
import { Loader2, AlertTriangle, Send, Users, Clock, Inbox } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useSendEmergencyBroadcast, useEmergencyHistory } from "./communication-hub-queries";

type Severity = "low" | "medium" | "high" | "critical";
type Audience = "all" | "citizen" | "authority" | "administrator";

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "var(--color-info)", medium: "var(--color-warning)",
  high: "var(--color-destructive)", critical: "var(--color-destructive)",
};

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Everyone (citizens, authorities, administrators)",
  citizen: "Citizens only",
  authority: "Authorities only",
  administrator: "Administrators only",
};

function timeAgo(iso: string): string {
  const d   = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function EmergencyPanel() {
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("high");
  const [audience, setAudience] = useState<Audience>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const send = useSendEmergencyBroadcast();
  const { data: history, isLoading: historyLoading } = useEmergencyHistory();

  const canSubmit = title.trim().length >= 3 && message.trim().length >= 5;

  const handleConfirm = () => {
    send.mutate(
      { title: title.trim(), message: message.trim(), severity, audience },
      { onSuccess: () => { setTitle(""); setMessage(""); setConfirmOpen(false); } },
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Compose */}
      <Panel title="Send Emergency Alert" eyebrow="Broadcast" surface="card">
        <div className="flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/15 p-3 mb-4 text-xs text-muted-foreground">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <span>This immediately notifies every user in the selected audience. Use only for genuine, time-sensitive emergencies.</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Severe air quality alert — City Center" maxLength={200} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">Message</label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="What's happening and what should people do?" rows={4} maxLength={1000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Severity</label>
              <Select value={severity} onValueChange={v => setSeverity(v as Severity)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Audience</label>
              <Select value={audience} onValueChange={v => setAudience(v as Audience)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="citizen">Citizens</SelectItem>
                  <SelectItem value="authority">Authorities</SelectItem>
                  <SelectItem value="administrator">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="size-3.5" />
            Review &amp; Send
          </Button>
        </div>
      </Panel>

      {/* History */}
      <Panel title="Emergency History" eyebrow="Recent broadcasts" surface="card">
        {historyLoading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> <span className="text-sm">Loading…</span>
          </div>
        )}
        {history && history.length === 0 && (
          <EmptyState icon={<Inbox className="size-5" />} title="No emergency alerts sent yet" />
        )}
        {history && history.length > 0 && (
          <div className="space-y-2.5">
            {history.map(h => (
              <div key={h._id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    style={{ color: SEVERITY_COLOR[h.priority], background: `color-mix(in oklab, ${SEVERITY_COLOR[h.priority]} 14%, transparent)` }}
                  >
                    {h.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                    <Clock className="size-3" /> {timeAgo(h.createdAt)}
                  </span>
                </div>
                <div className="text-sm font-semibold leading-snug">{h.title.replace(/^Emergency Alert:\s*/, "")}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.summary}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                  <Users className="size-3" /> Sent to {h.recipientCount} recipient{h.recipientCount === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this emergency alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately notify <strong className="text-foreground">{AUDIENCE_LABEL[audience]}</strong> with a{" "}
              <strong className="text-foreground capitalize">{severity}</strong>-severity alert titled
              {" "}"<strong className="text-foreground">{title}</strong>". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={send.isPending}
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {send.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Send Alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
