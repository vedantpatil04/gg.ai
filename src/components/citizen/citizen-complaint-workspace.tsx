/**
 * citizen-complaint-workspace.tsx
 *
 * Citizen Complaint Detail & Workspace.
 *
 * Features:
 * 1. Mobile back button (← Back to My Complaints)
 * 2. Case Overview, Status explanation & Timeline
 * 3. Evidence gallery with interactive lightbox
 * 4. Assigned Authority info with Direct Contact (Call, Email, In-App Message)
 * 5. Complaint-scoped Citizen ↔ Authority Messaging (reusing backend Message architecture)
 * 6. Resolution review (Accept resolution / Request rework)
 * 7. Official PDF Report generation & Android-compatible download for completed complaints
 */

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  X,
  MapPin,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  Phone,
  Mail,
  RotateCcw,
  MessageSquare,
  Send,
  Lock,
  Download,
  ArrowLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import {
  useCitizenComplaint,
  useAcceptResolution,
  useCitizenRequestRework,
  useComplaintMessages,
  useSendComplaintMessage,
  useMarkComplaintMessagesRead,
  type CitizenComplaint,
  type ComplaintEvent,
  type MessageRecord,
} from "./citizen-queries";
import {
  getStatusMeta,
  getSeverityMeta,
  humanizeIssueType,
  humanizeEventType,
} from "./citizen-status-utils";
import { exportComplaintPdf } from "@/lib/complaint-pdf-export";
import { toast } from "sonner";

// ─── Evidence Gallery Component ──────────────────────────────────────────────

function EvidenceGallery({ images }: { images: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/10">
        <ImageIcon className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">No photographic evidence uploaded</p>
        <p className="text-xs text-muted-foreground">Photographs attached by citizen will appear here.</p>
      </div>
    );
  }

  const apiBase = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:5000";
  const fullUrl = (url: string) => (url.startsWith("http") ? url : `${apiBase}${url}`);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            className="relative group aspect-square rounded-xl overflow-hidden border border-border/80 bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => setLightboxIdx(i)}
            aria-label={`View evidence photo ${i + 1}`}
          >
            <img
              src={fullUrl(img)}
              alt={`Evidence ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <ZoomIn className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close photo preview"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 flex items-center justify-center"
            disabled={lightboxIdx === 0}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx((i) => Math.max(0, (i ?? 1) - 1));
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-6" />
          </button>
          <img
            src={fullUrl(images[lightboxIdx])}
            alt={`Evidence ${lightboxIdx + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 flex items-center justify-center"
            disabled={lightboxIdx === images.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx((i) => Math.min(images.length - 1, (i ?? 0) + 1));
            }}
            aria-label="Next photo"
          >
            <ChevronRight className="size-6" />
          </button>
          <div className="absolute bottom-4 text-white/70 text-xs font-medium">
            Photo {lightboxIdx + 1} of {images.length}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Timeline Item Component ──────────────────────────────────────────────────

function TimelineItem({ event, isLast }: { event: ComplaintEvent; isLast: boolean }) {
  const isMilestone = ["created", "assigned", "resolved", "verified", "closed"].includes(event.type);

  return (
    <div className={cn("relative pl-6", !isLast && "pb-4")}>
      {!isLast && <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border/80" />}
      <div
        className={cn(
          "absolute left-0 top-1 size-3.5 rounded-full border-2",
          isMilestone
            ? "border-primary bg-primary/20"
            : "border-muted-foreground/40 bg-background",
        )}
      />
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs font-semibold", isMilestone && "text-primary")}>
            {humanizeEventType(event.type)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.message}</p>
        {event.userName && (
          <p className="text-[10px] text-muted-foreground/60">by {event.userName}</p>
        )}
      </div>
    </div>
  );
}

// ─── Info Field Component ─────────────────────────────────────────────────────

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-sm mt-0.5 font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ─── Citizen ↔ Authority Messages Tab Component ──────────────────────────────

function ComplaintMessagesTab({
  complaint,
}: {
  complaint: CitizenComplaint;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messageData, isLoading, isError } = useComplaintMessages(complaint._id);
  const sendMutation = useSendComplaintMessage();
  const markReadMutation = useMarkComplaintMessagesRead();

  const messages: MessageRecord[] = messageData?.messages ?? [];
  const canSend =
    complaint.status !== "closed" &&
    complaint.status !== "rejected" &&
    !!complaint.assignedTo;

  // Mark read when messages load
  useEffect(() => {
    if (messages.length > 0) {
      markReadMutation.mutate(complaint._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint._id, messages.length]);

  // Scroll to bottom when message count changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(
      { complaintId: complaint._id, body },
      {
        onSuccess: () => setDraft(""),
      },
    );
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3 py-6">
          <div className="h-10 w-2/3 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-10 w-1/2 rounded-xl bg-muted/60 animate-pulse ml-auto" />
          <div className="h-10 w-3/5 rounded-xl bg-muted/60 animate-pulse" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs">
          <AlertCircle className="size-4 shrink-0" />
          <span>Could not load messages for this complaint.</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-10 space-y-2 rounded-2xl border border-dashed border-border/80 bg-muted/10">
          <MessageSquare className="size-7 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {complaint.assignedTo
              ? "You can send a message directly to the assigned authority regarding this report."
              : "Messaging will open once an authority is assigned to investigate this report."}
          </p>
        </div>
      ) : (
        <div ref={listRef} className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
          {messages.map((m) => {
            const isCitizen = m.senderRole === "citizen";
            return (
              <div
                key={m._id}
                className={cn("flex flex-col max-w-[85%]", isCitizen ? "ml-auto items-end" : "items-start")}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {isCitizen ? "You (Citizen)" : m.senderName || "Authority"}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words shadow-2xs",
                    isCitizen
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-tl-sm",
                  )}
                >
                  {m.body}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 px-1">
                  {format(new Date(m.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input row or read-only explanation */}
      {!canSend ? (
        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          <span>
            {!complaint.assignedTo
              ? "Messaging will be enabled as soon as an authority is assigned."
              : "This complaint is closed. The conversation history is preserved as read-only."}
          </span>
        </div>
      ) : (
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message to the authority..."
              className="text-xs resize-none rounded-xl"
              maxLength={2000}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              className="h-auto px-4 rounded-xl shrink-0"
              aria-label="Send message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1">
            <span>Press Enter to send</span>
            <span>{draft.length}/2000</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Citizen Review Panel (Accept / Request Rework) ───────────────────────────

function ReviewResolutionPanel({ complaintId }: { complaintId: string }) {
  const [mode, setMode] = useState<"idle" | "rework">("idle");
  const [reason, setReason] = useState("");
  const accept = useAcceptResolution();
  const requestRework = useCitizenRequestRework();

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3.5">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Review Authority Resolution</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          The assigned authority has marked this issue as resolved. Please review the outcome.
        </p>
      </div>

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => accept.mutate(complaintId)}
            disabled={accept.isPending || requestRework.isPending}
            className="gap-1.5 text-xs"
          >
            {accept.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Accept Resolution & Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("rework")}
            disabled={accept.isPending || requestRework.isPending}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Request Rework
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          <label className="text-xs font-medium text-foreground/80" htmlFor="rework-reason">
            What still needs attention? (minimum 10 characters)
          </label>
          <Textarea
            id="rework-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what still needs to be resolved..."
            rows={3}
            className="text-xs rounded-xl"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={reason.trim().length < 10 || requestRework.isPending}
              onClick={() =>
                requestRework.mutate(
                  { id: complaintId, reason: reason.trim() },
                  { onSuccess: () => setMode("idle") },
                )
              }
              className="gap-1.5 text-xs"
            >
              {requestRework.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Submit Rework Request
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMode("idle");
                setReason("");
              }}
              disabled={requestRework.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PDF Report Action Button ─────────────────────────────────────────────────

function PdfReportAction({
  complaint,
  cityName,
}: {
  complaint: CitizenComplaint;
  cityName: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await exportComplaintPdf({ complaint, cityName });
      toast.success("Complaint report generated and downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report.";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h4 className="text-xs font-semibold text-foreground">Official Complaint Report</h4>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Download a verified PDF document containing the case overview, timeline, and resolution.
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleDownload}
        disabled={isGenerating}
        className="gap-2 shrink-0 text-xs font-medium shadow-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="size-3.5" />
            Download PDF Report
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Workspace Component ──────────────────────────────────────────────────────

interface CitizenComplaintWorkspaceProps {
  complaintId: string | null;
  onClose: () => void;
}

export function CitizenComplaintWorkspace({
  complaintId,
  onClose,
}: CitizenComplaintWorkspaceProps) {
  const { city } = useCity();
  const [tab, setTab] = useState("overview");
  const { data: complaint, isLoading } = useCitizenComplaint(complaintId);

  const assignedAuth = complaint?.assignedTo as
    | { name?: string; email?: string; phone?: string }
    | null;
  const statusMeta = complaint ? getStatusMeta(complaint.status, !!assignedAuth) : null;
  const severityMeta = complaint ? getSeverityMeta(complaint.severity) : null;
  const verifiedByUser = complaint?.verifiedBy as { name?: string } | null;

  const isCompletedOrResolved =
    complaint &&
    (complaint.status === "closed" ||
      complaint.status === "resolved" ||
      complaint.status === "awaiting_citizen_review" ||
      !!complaint.resolution);

  const cityNameDisplay = city.name || complaint?.cityId || "Assigned City";

  return (
    <Sheet open={!!complaintId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {isLoading || !complaint ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-6 w-3/4 rounded-xl bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <div className="space-y-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Sticky Top Header with Mobile Back Button ── */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-3.5 space-y-2.5">
              {/* Mandatory Back to My Complaints Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline group"
                  aria-label="Back to complaints list"
                >
                  <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to My Complaints</span>
                </button>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                  #{complaint._id.slice(-8).toUpperCase()}
                </span>
              </div>

              <SheetHeader className="text-left space-y-1">
                <SheetTitle className="text-base font-semibold leading-snug">
                  {complaint.title}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {humanizeIssueType(complaint.issueType)} · {cityNameDisplay}
                </SheetDescription>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {statusMeta && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                        statusMeta.tone === "success" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
                        statusMeta.tone === "warning" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                        statusMeta.tone === "info" && "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
                        statusMeta.tone === "primary" && "border-primary/30 text-primary bg-primary/5",
                        statusMeta.tone === "destructive" && "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
                        statusMeta.tone === "muted" && "border-border text-muted-foreground bg-muted/40",
                      )}
                    >
                      <span>{statusMeta.symbol}</span>
                      <span>{statusMeta.label}</span>
                    </span>
                  )}
                  {severityMeta && (
                    <Pill tone={severityMeta.tone}>{severityMeta.label} Priority</Pill>
                  )}
                </div>
              </SheetHeader>
            </div>

            {/* ── Tabs ── */}
            <Tabs value={tab} onValueChange={setTab}>
              <div className="px-5 pt-2.5 border-b overflow-x-auto">
                <TabsList className="w-full justify-start gap-1 bg-transparent p-0 h-auto">
                  {[
                    { value: "overview", label: "Overview" },
                    { value: "timeline", label: "Timeline" },
                    { value: "evidence", label: `Evidence (${complaint.images.length})` },
                    { value: "authority", label: "Authority" },
                    { value: "messages", label: "Messages" },
                    ...(isCompletedOrResolved ? [{ value: "resolution", label: "Resolution" }] : []),
                  ].map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent capitalize pb-2 text-xs shrink-0 font-medium"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* ── TAB: OVERVIEW ── */}
                <TabsContent value="overview" className="mt-0 space-y-5">
                  {/* PDF Download Quick Action when completed */}
                  {complaint.status === "closed" && (
                    <PdfReportAction complaint={complaint} cityName={cityNameDisplay} />
                  )}

                  {/* Status explainer banner */}
                  {complaint.status === "awaiting_citizen_review" ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground">Action Required: Review Resolution</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The investigating authority has submitted a resolution for this report.
                        Please review it and confirm if the issue is resolved.
                      </p>
                      <Button size="sm" onClick={() => setTab("resolution")} className="text-xs h-8">
                        Review Resolution
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                      <div className="flex items-center gap-2">
                        {complaint.status === "closed" ? (
                          <CheckCircle2 className="size-4 text-success shrink-0" />
                        ) : (
                          <Clock className="size-4 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-semibold">{statusMeta?.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {complaint.status === "pending" &&
                          (assignedAuth
                            ? "Assigned to an authority — awaiting investigation."
                            : "Received by city dispatch — awaiting assignment.")}
                        {complaint.status === "in-progress" &&
                          "An authority is currently investigating the issue."}
                        {complaint.status === "rework" &&
                          "Rework requested — an administrator is reviewing your feedback."}
                        {complaint.status === "resolved" &&
                          "Resolution submitted — undergoing administrative verification."}
                        {complaint.status === "closed" &&
                          "Complaint resolved and officially closed. Thank you for your civic contribution."}
                        {complaint.status === "rejected" &&
                          "This complaint was reviewed and closed without action."}
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Details
                    </h4>
                    <InfoField
                      icon={FileText}
                      label="Category"
                      value={humanizeIssueType(complaint.issueType)}
                    />
                    <InfoField
                      icon={AlertCircle}
                      label="Priority"
                      value={`${severityMeta?.label} Priority`}
                    />
                    {complaint.location?.address && (
                      <InfoField
                        icon={MapPin}
                        label="Location"
                        value={complaint.location.address}
                      />
                    )}
                    <InfoField
                      icon={Calendar}
                      label="Submitted On"
                      value={format(new Date(complaint.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    />
                    <InfoField
                      icon={Clock}
                      label="Last Updated"
                      value={format(new Date(complaint.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Citizen Observation
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/15 p-3.5">
                      {complaint.description}
                    </p>
                  </div>
                </TabsContent>

                {/* ── TAB: TIMELINE ── */}
                <TabsContent value="timeline" className="mt-0">
                  {complaint.events.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8">
                      No events recorded yet.
                    </div>
                  ) : (
                    <div className="pt-1">
                      {complaint.events.map((evt, i) => (
                        <TimelineItem
                          key={i}
                          event={evt}
                          isLast={i === complaint.events.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB: EVIDENCE ── */}
                <TabsContent value="evidence" className="mt-0 space-y-4">
                  <EvidenceGallery images={complaint.images} />
                </TabsContent>

                {/* ── TAB: AUTHORITY ── */}
                <TabsContent value="authority" className="mt-0 space-y-4">
                  {!assignedAuth ? (
                    <div className="text-center py-10 rounded-2xl border border-dashed border-border/80 bg-muted/10 space-y-1.5">
                      <User className="size-6 text-muted-foreground/50 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Not yet assigned to a specific authority.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                        <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {(assignedAuth.name ?? "A").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{assignedAuth.name}</div>
                          {complaint.assignedAt && (
                            <div className="text-[11px] text-muted-foreground">
                              Assigned on {format(new Date(complaint.assignedAt), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Direct contact buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!assignedAuth.phone}
                          asChild={!!assignedAuth.phone}
                          className="text-xs h-9 gap-1.5"
                        >
                          {assignedAuth.phone ? (
                            <a href={`tel:${assignedAuth.phone.replace(/[^\d+]/g, "")}`}>
                              <Phone className="size-3.5" /> Call Authority
                            </a>
                          ) : (
                            <span>
                              <Phone className="size-3.5" /> Call Authority
                            </span>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!assignedAuth.email}
                          asChild={!!assignedAuth.email}
                          className="text-xs h-9 gap-1.5"
                        >
                          {assignedAuth.email ? (
                            <a href={`mailto:${assignedAuth.email}`}>
                              <Mail className="size-3.5" /> Email Authority
                            </a>
                          ) : (
                            <span>
                              <Mail className="size-3.5" /> Email Authority
                            </span>
                          )}
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setTab("messages")}
                          className="text-xs h-9 gap-1.5"
                        >
                          <MessageSquare className="size-3.5" /> Open Messages
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB: MESSAGES (CITIZEN ↔ AUTHORITY) ── */}
                <TabsContent value="messages" className="mt-0">
                  <ComplaintMessagesTab complaint={complaint} />
                </TabsContent>

                {/* ── TAB: RESOLUTION ── */}
                {isCompletedOrResolved && (
                  <TabsContent value="resolution" className="mt-0 space-y-4">
                    {complaint.resolution && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Resolution Summary
                        </h4>
                        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                          {complaint.resolution}
                        </div>
                      </div>
                    )}

                    {complaint.status === "awaiting_citizen_review" && (
                      <ReviewResolutionPanel complaintId={complaint._id} />
                    )}

                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {complaint.resolvedAt && (
                        <InfoField
                          icon={CheckCircle2}
                          label="Resolved On"
                          value={format(new Date(complaint.resolvedAt), "MMMM d, yyyy 'at' h:mm a")}
                        />
                      )}
                      {complaint.verifiedAt && (
                        <InfoField
                          icon={CheckCircle2}
                          label="Verified On"
                          value={format(new Date(complaint.verifiedAt), "MMMM d, yyyy 'at' h:mm a")}
                        />
                      )}
                      {verifiedByUser?.name && (
                        <InfoField icon={User} label="Verified By" value="Municipal Administrator" />
                      )}
                    </div>

                    {/* PDF Report trigger in resolution tab */}
                    <PdfReportAction complaint={complaint} cityName={cityNameDisplay} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
