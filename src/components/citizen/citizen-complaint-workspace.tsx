import { useState } from "react";
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
import {
  useCitizenComplaint,
  useAcceptResolution,
  useCitizenRequestRework,
} from "./citizen-queries";
import {
  getStatusMeta,
  getSeverityMeta,
  humanizeIssueType,
  humanizeEventType,
} from "./citizen-status-utils";
import { API_BASE } from "@/lib/api/client";
import type { CitizenComplaint, ComplaintEvent } from "./citizen-queries";

// ─── Evidence gallery ─────────────────────────────────────────────────────────

function EvidenceGallery({ images }: { images: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2 rounded-xl border border-dashed">
        <ImageIcon className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>
      </div>
    );
  }

  const apiBase = API_BASE.replace(/\/api\/?$/, "");
  const fullUrl = (url: string) =>
    url.startsWith("http") ? url : `${apiBase}${url}`;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            className="relative group aspect-square rounded-xl overflow-hidden border border-border"
            onClick={() => setLightboxIdx(i)}
          >
            <img
              src={fullUrl(img)}
              alt={`Evidence ${i + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="size-6" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white disabled:opacity-30"
            disabled={lightboxIdx === 0}
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.max(0, (i ?? 1) - 1)); }}
          >
            <ChevronLeft className="size-8" />
          </button>
          <img
            src={fullUrl(images[lightboxIdx])}
            alt={`Evidence ${lightboxIdx + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white disabled:opacity-30"
            disabled={lightboxIdx === images.length - 1}
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.min(images.length - 1, (i ?? 0) + 1)); }}
          >
            <ChevronRight className="size-8" />
          </button>
          <div className="absolute bottom-4 text-white/60 text-sm">
            {lightboxIdx + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineItem({ event, isLast }: { event: ComplaintEvent; isLast: boolean }) {
  const isMilestone = ["created", "assigned", "resolved", "verified", "closed"].includes(
    event.type,
  );

  return (
    <div className={cn("relative pl-6", !isLast && "pb-4")}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border" />
      )}
      {/* Dot */}
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
          <span className={cn("text-sm font-medium", isMilestone && "text-primary")}>
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

// ─── Info field ───────────────────────────────────────────────────────────────

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
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-sm mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-3/4 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-2 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ─── Citizen Review — Accept / Request Rework ─────────────────────────────────

function ReviewResolutionPanel({ complaintId }: { complaintId: string }) {
  const [mode, setMode] = useState<"idle" | "rework">("idle");
  const [reason, setReason] = useState("");
  const accept = useAcceptResolution();
  const requestRework = useCitizenRequestRework();

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold">Review Resolution</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Was your complaint resolved satisfactorily?
        </p>
      </div>

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => accept.mutate(complaintId)}
            disabled={accept.isPending || requestRework.isPending}
          >
            {accept.isPending ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5 mr-1.5" />
            )}
            Accept Resolution
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("rework")}
            disabled={accept.isPending || requestRework.isPending}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Request Rework
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="rework-reason">
            What still needs to be addressed? (minimum 10 characters)
          </label>
          <Textarea
            id="rework-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what wasn't resolved..."
            rows={3}
          />
          {reasonTooShort && (
            <p className="text-[11px] text-destructive">
              Please provide at least 10 characters.
            </p>
          )}
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
            >
              {requestRework.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
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
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Workspace ────────────────────────────────────────────────────────────────

interface CitizenComplaintWorkspaceProps {
  complaintId: string | null;
  onClose: () => void;
}

export function CitizenComplaintWorkspace({
  complaintId,
  onClose,
}: CitizenComplaintWorkspaceProps) {
  const [tab, setTab] = useState("overview");
  const { data: complaint, isLoading } = useCitizenComplaint(complaintId);

  const statusMeta = complaint ? getStatusMeta(complaint.status) : null;
  const severityMeta = complaint ? getSeverityMeta(complaint.severity) : null;
  const assignedAuth = complaint?.assignedTo as
    | { name?: string; email?: string; phone?: string }
    | null;
  const verifiedByUser = complaint?.verifiedBy as { name?: string } | null;

  // Images are only shown when there are any and the status allows it
  // (complaint.images is always the server-filtered list).
  const canShowEvidence =
    complaint &&
    complaint.images.length > 0 &&
    ["in-progress", "awaiting_citizen_review", "resolved", "closed", "rework"].includes(
      complaint.status,
    );

  return (
    <Sheet open={!!complaintId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {isLoading || !complaint ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>Loading complaint</SheetTitle>
              <SheetDescription>Loading complaint details</SheetDescription>
            </SheetHeader>
            <WorkspaceSkeleton />
          </>
        ) : (
          <>
            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
              <SheetHeader className="text-left">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base leading-snug pr-8">
                      {complaint.title}
                    </SheetTitle>
                    <SheetDescription className="text-xs mt-1">
                      #{complaint._id.slice(-8).toUpperCase()} · {humanizeIssueType(complaint.issueType)}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {statusMeta && <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>}
                  {severityMeta && <Pill tone={severityMeta.tone}>{severityMeta.label} Priority</Pill>}
                </div>
              </SheetHeader>
            </div>

            {/* ── Tabs ── */}
            <Tabs value={tab} onValueChange={setTab}>
              <div className="px-6 pt-3 border-b">
                <TabsList className="w-full justify-start gap-0 bg-transparent p-0 h-auto">
                  {[
                    { value: "overview", label: "Overview" },
                    { value: "timeline", label: "Timeline" },
                    { value: "investigation", label: "Investigation" },
                    { value: "evidence", label: `Evidence (${complaint.images.length})` },
                    ...(complaint.status === "closed" ||
                    complaint.status === "awaiting_citizen_review" ||
                    complaint.status === "resolved" ||
                    complaint.resolution
                      ? [{ value: "resolution", label: "Resolution" }]
                      : []),
                  ].map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent capitalize pb-2.5 text-xs shrink-0"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* ── Overview ── */}
                <TabsContent value="overview" className="mt-0 space-y-5">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                      value={severityMeta?.label}
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
                      label="Submitted"
                      value={format(new Date(complaint.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    />
                    <InfoField
                      icon={Clock}
                      label="Last Updated"
                      value={format(new Date(complaint.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Status explainer */}
                  {complaint.status === "awaiting_citizen_review" ? (
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold">Ready for Review</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The authority has submitted a resolution. Please review the response
                        and let us know whether the issue has been resolved.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setTab("resolution")}
                        className="w-full sm:w-auto"
                      >
                        Review Resolution
                      </Button>
                    </div>
                  ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {complaint.status === "closed" ? (
                        <CheckCircle2 className="size-4 text-success shrink-0" />
                      ) : (
                        <Clock className="size-4 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        {statusMeta?.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {complaint.status === "pending" &&
                        (assignedAuth
                          ? "Your complaint has been assigned to an authority and is awaiting investigation."
                          : "Your complaint has been received and is awaiting assignment to an authority.")}
                      {complaint.status === "in-progress" &&
                        "An authority is currently investigating your complaint."}
                      {complaint.status === "rework" &&
                        "An authority is continuing to investigate your complaint."}
                      {complaint.status === "resolved" &&
                        "A revised resolution has been submitted. An administrator is reviewing it."}
                      {complaint.status === "closed" &&
                        "Your complaint has been resolved and verified. Thank you for reporting."}
                      {complaint.status === "rejected" &&
                        "This complaint was not approved for investigation."}
                    </p>
                  </div>
                  )}
                </TabsContent>

                {/* ── Timeline ── */}
                <TabsContent value="timeline" className="mt-0">
                  {complaint.events.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
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

                {/* ── Investigation ── */}
                <TabsContent value="investigation" className="mt-0 space-y-5">
                  {!assignedAuth ? (
                    <div className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed">
                      Not yet assigned to an authority.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Assigned Authority
                        </h4>
                        <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                          <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                            {(assignedAuth.name ?? "A").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{assignedAuth.name}</div>
                            {complaint.assignedAt && (
                              <div className="text-xs text-muted-foreground">
                                Assigned {format(new Date(complaint.assignedAt), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Never fabricate contact data — disabled when absent. */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!assignedAuth.phone}
                            asChild={!!assignedAuth.phone}
                          >
                            {assignedAuth.phone ? (
                              <a
                                href={`tel:${assignedAuth.phone.replace(/[^\d+]/g, "")}`}
                                aria-label={`Call ${assignedAuth.name}`}
                              >
                                <Phone className="size-3.5" aria-hidden="true" /> Call Authority
                              </a>
                            ) : (
                              <span>
                                <Phone className="size-3.5" aria-hidden="true" /> Call Authority
                              </span>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!assignedAuth.email}
                            asChild={!!assignedAuth.email}
                          >
                            {assignedAuth.email ? (
                              <a
                                href={`mailto:${assignedAuth.email}`}
                                aria-label={`Email ${assignedAuth.name}`}
                              >
                                <Mail className="size-3.5" aria-hidden="true" /> Email Authority
                              </a>
                            ) : (
                              <span>
                                <Mail className="size-3.5" aria-hidden="true" /> Email Authority
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>

                      {complaint.resolvedAt && (
                        <InfoField
                          icon={Clock}
                          label="Resolution Submitted"
                          value={format(new Date(complaint.resolvedAt), "MMMM d, yyyy 'at' h:mm a")}
                        />
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ── Evidence ── */}
                <TabsContent value="evidence" className="mt-0">
                  {canShowEvidence ? (
                    <EvidenceGallery images={complaint.images} />
                  ) : complaint.images.length > 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed">
                      Evidence will be available once investigation is underway.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2 rounded-xl border border-dashed">
                      <ImageIcon className="size-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Resolution ── */}
                {(complaint.status === "closed" ||
                  complaint.status === "awaiting_citizen_review" ||
                  complaint.status === "resolved" ||
                  complaint.resolution) && (
                  <TabsContent value="resolution" className="mt-0 space-y-5">
                    {complaint.resolution ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Resolution Summary
                        </h4>
                        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {complaint.resolution}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {complaint.status === "awaiting_citizen_review" && (
                      <ReviewResolutionPanel complaintId={complaint._id} />
                    )}

                    <div className="space-y-3">
                      {complaint.resolvedAt && (
                        <InfoField
                          icon={CheckCircle2}
                          label="Resolved On"
                          value={format(new Date(complaint.resolvedAt), "MMMM d, yyyy")}
                        />
                      )}
                      {complaint.verifiedAt && (
                        <InfoField
                          icon={CheckCircle2}
                          label="Verified On"
                          value={format(new Date(complaint.verifiedAt), "MMMM d, yyyy")}
                        />
                      )}
                      {verifiedByUser?.name && (
                        <InfoField
                          icon={User}
                          label="Verified By"
                          value="Administrator"
                        />
                      )}
                    </div>

                    {complaint.status === "closed" && (
                      <div className="rounded-xl border border-success/20 bg-success/8 p-4 flex items-start gap-3">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-success">
                            Complaint successfully closed
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            This complaint has been resolved and verified by an administrator.
                            Thank you for helping improve your city.
                          </p>
                        </div>
                      </div>
                    )}
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
