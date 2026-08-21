import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  MapPin,
  User,
  Calendar,
  Shield,
  MessageSquare,
  AlertOctagon,
  ExternalLink,
  Clock,
  ChevronRight,
  Lock,
  RotateCcw,
  AlertTriangle,
  Edit3,
  Camera,
  Trash2,
  UserCheck,
  ImageOff,
} from "lucide-react";
import { complaintApi } from "@/lib/api/services.api";
import { Panel, Pill, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAssetUrl, extractComplaintImages } from "@/components/profile/profile-utils";
import {
  ISSUE_LABELS,
  SEVERITY_TONE,
  STATUS_TONE,
  STATUS_LABEL,
  type ComplaintRecord,
} from "@/components/command-center/investigation-workspace";
import { useVerifyResolution, useRequestRework } from "./complaint-governance-queries";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string): string {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const EVENT_ICON: Record<string, typeof CheckCircle2> = {
  created: Camera,
  assigned: UserCheck,
  reassigned: UserCheck,
  status_change: Clock,
  image_added: Camera,
  image_removed: Trash2,
  note_updated: Edit3,
  resolved: ChevronRight,
  resubmitted: RotateCcw,
  verified: CheckCircle2,
  closed: Lock,
  rework_requested: RotateCcw,
  rejected: X,
};
const EVENT_COLOR: Record<string, string> = {
  created: "var(--color-muted-foreground)",
  assigned: "var(--color-success)",
  reassigned: "var(--color-info)",
  status_change: "var(--color-primary)",
  image_added: "var(--color-success)",
  image_removed: "var(--color-warning)",
  note_updated: "var(--color-primary)",
  resolved: "var(--color-info)",
  resubmitted: "var(--color-info)",
  verified: "var(--color-success)",
  closed: "var(--color-success)",
  rework_requested: "var(--color-destructive)",
  rejected: "var(--color-muted-foreground)",
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function VerificationSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Evidence gallery (read-only in verification context) ─────────────────────
function EvidenceGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!images.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No evidence images uploaded.</p>
    );
  }
  return (
    <>
      {lightbox && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Evidence"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 size-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"
            >
              <X className="size-5 text-white" />
            </button>
          </motion.div>
        </AnimatePresence>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <EvidenceTile key={i} img={img} index={i} onOpen={setLightbox} />
        ))}
      </div>
    </>
  );
}

// Single evidence tile with a clean fallback if the image fails to load,
// instead of a raw broken-image icon — matches EvidenceThumb's treatment in
// complaint-detail-panel.tsx and the Authority-side investigation workspace.
function EvidenceTile({
  img,
  index,
  onOpen,
}: {
  img: string;
  index: number;
  onOpen: (src: string) => void;
}) {
  const src = resolveAssetUrl(img) ?? img;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 aspect-video text-muted-foreground">
        <ImageOff className="size-5" />
        <span className="text-[10px] uppercase tracking-wider">Evidence unavailable</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(src)}
      className="relative group rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video cursor-pointer"
    >
      <img
        src={src}
        alt={`Evidence ${index + 1}`}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="size-5 text-white drop-shadow" />
      </div>
    </div>
  );
}

// ─── Activity timeline ─────────────────────────────────────────────────────────
function Timeline({ complaint }: { complaint: ComplaintRecord }) {
  type Entry = { type: string; message: string; userName?: string; ts: string };
  const entries: Entry[] = [
    {
      type: "created",
      message: `Complaint filed by ${complaint.submittedBy?.name ?? "citizen"}`,
      ts: complaint.createdAt,
    },
  ];
  for (const ev of complaint.events ?? [])
    entries.push({ type: ev.type, message: ev.message, userName: ev.userName, ts: ev.timestamp });
  if (
    complaint.resolvedAt &&
    !entries.some((e) => e.type === "resolved" || e.type === "resubmitted")
  )
    entries.push({ type: "resolved", message: "Resolution submitted", ts: complaint.resolvedAt });
  entries.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const Icon = EVENT_ICON[entry.type] ?? Clock;
        const color = EVENT_COLOR[entry.type] ?? "var(--color-muted-foreground)";
        const isLast = i === entries.length - 1;
        return (
          <div key={i} className="flex gap-3 relative">
            {!isLast && (
              <div
                className="absolute left-[13px] top-7 bottom-0 w-px"
                style={{ background: "var(--color-border)" }}
              />
            )}
            <div
              className="size-7 rounded-full border-2 grid place-items-center shrink-0 bg-background relative z-10"
              style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
            >
              <Icon className="size-3.5" style={{ color }} />
            </div>
            <div className={cn("pb-5 min-w-0 flex-1", isLast && "pb-0")}>
              <p className="text-sm leading-snug">{entry.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.userName && (
                  <span className="text-xs text-muted-foreground">{entry.userName}</span>
                )}
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {new Date(entry.ts).toLocaleString()} · {timeAgo(entry.ts)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Verification action panel ────────────────────────────────────────────────
function VerificationActionPanel({
  complaint,
  onVerified,
  onReworked,
}: {
  complaint: ComplaintRecord;
  onVerified: () => void;
  onReworked: () => void;
}) {
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState("");
  const [reworkComments, setReworkComments] = useState("");
  const [reasonError, setReasonError] = useState("");

  const verifyMutation = useVerifyResolution();
  const reworkMutation = useRequestRework();

  const isClosed = complaint.status === "closed";
  const isReworked = complaint.status === "rework";

  function handleVerify() {
    verifyMutation.mutate(complaint._id, { onSuccess: onVerified });
  }

  function handleRework() {
    if (reworkReason.trim().length < 10) {
      setReasonError("Reason must be at least 10 characters.");
      return;
    }
    setReasonError("");
    reworkMutation.mutate(
      {
        id: complaint._id,
        reason: reworkReason.trim(),
        comments: reworkComments.trim() || undefined,
      },
      { onSuccess: onReworked },
    );
  }

  return (
    <div className="space-y-4">
      {/* Resolution summary */}
      <Panel eyebrow="Authority Resolution" title="Submitted Resolution">
        {complaint.resolution ? (
          <p className="text-sm leading-relaxed text-foreground">{complaint.resolution}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No resolution text submitted.</p>
        )}
        {complaint.resolvedAt && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            Submitted {new Date(complaint.resolvedAt).toLocaleString()}
          </p>
        )}
        {(complaint.reworkCount ?? 0) > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5 text-xs text-warning">
            <RotateCcw className="size-3 shrink-0" />
            Resubmission #{complaint.reworkCount} — review carefully
          </div>
        )}
      </Panel>

      {/* Assigned authority */}
      {complaint.assignedTo && (
        <Panel eyebrow="Investigating Officer" title="Assigned Authority">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full aurora grid place-items-center text-primary-foreground text-xs font-bold shrink-0">
              {(complaint.assignedTo.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{complaint.assignedTo.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {complaint.assignedTo.email}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Verdict — closed */}
      {isClosed && (
        <div className="rounded-xl border border-success/30 bg-success/8 p-4 space-y-1">
          <div className="flex items-center gap-2 text-success">
            <Lock className="size-4 shrink-0" />
            <span className="text-sm font-semibold">Complaint Closed</span>
          </div>
          {complaint.verifiedByName && (
            <p className="text-xs text-muted-foreground pl-6">
              Verified by {complaint.verifiedByName}
              {complaint.verifiedAt && ` on ${new Date(complaint.verifiedAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      )}

      {/* Verdict — already returned */}
      {isReworked && (
        <div className="rounded-xl border border-warning/30 bg-warning/8 p-4">
          <div className="flex items-center gap-2 text-warning">
            <RotateCcw className="size-4 shrink-0" />
            <span className="text-sm font-semibold">Returned for Rework</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 pl-6">
            Awaiting authority resubmission.
          </p>
        </div>
      )}

      {/* Action panel — only when status is "resolved" */}
      {!isClosed && !isReworked && (
        <Panel eyebrow="Verification Decision" title="Review Outcome">
          <div className="space-y-3">
            <Button
              className="w-full justify-start"
              onClick={handleVerify}
              disabled={verifyMutation.isPending || reworkMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Approve Resolution &amp; Close
            </Button>

            <button
              onClick={() => {
                setReworkOpen((v) => !v);
                setReasonError("");
              }}
              disabled={verifyMutation.isPending || reworkMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                reworkOpen
                  ? "border-destructive/50 bg-destructive/8 text-destructive"
                  : "border-border hover:border-destructive/40 hover:bg-destructive/5 text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="size-4" />
                Request Rework
              </span>
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  reworkOpen && "rotate-90",
                )}
              />
            </button>

            {/* Rework form — expandable */}
            <AnimatePresence>
              {reworkOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-1 space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-destructive font-medium block mb-1.5">
                        Rejection Reason <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={reworkReason}
                        onChange={(e) => {
                          setReworkReason(e.target.value);
                          setReasonError("");
                        }}
                        placeholder="Describe what is missing or needs improvement…"
                        className={cn(
                          "w-full rounded-xl border bg-background/50 px-3 py-2.5 text-sm resize-none outline-none transition-all",
                          reasonError
                            ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                            : "border-border focus:border-destructive/50 focus:ring-2 focus:ring-destructive/20",
                        )}
                      />
                      {reasonError && (
                        <p className="text-xs text-destructive mt-1">{reasonError}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
                        Improvement Comments <span className="opacity-60">(optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={reworkComments}
                        onChange={(e) => setReworkComments(e.target.value)}
                        placeholder="Specific guidance for the authority officer…"
                        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm resize-none outline-none focus:border-destructive/50 focus:ring-2 focus:ring-destructive/20 transition-all"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleRework}
                      disabled={reworkMutation.isPending}
                    >
                      {reworkMutation.isPending ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4 mr-2" />
                      )}
                      Send for Rework
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Approving closes the complaint and notifies the citizen. Requesting rework returns it
              to the assigned authority with your feedback.
            </p>
          </div>
        </Panel>
      )}

      {/* Reporter */}
      {complaint.submittedBy && (
        <Panel eyebrow="Reporter" title="Filed By">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-muted-foreground" />
              {complaint.submittedBy.name ?? "—"}
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {complaint.submittedBy.email ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {new Date(complaint.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
              </span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ResolutionVerificationWorkspace({
  complaintId,
  onBack,
}: {
  complaintId: string;
  onBack: () => void;
}) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complaint", complaintId],
    queryFn: () => complaintApi.getOne(complaintId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const complaint: ComplaintRecord | undefined = (data as any)?.data?.complaint;
  const isClosed = complaint?.status === "closed";
  const isReworked = complaint?.status === "rework";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Back bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:text-primary transition-colors group py-1"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          <span className="font-medium">Back to verification queue</span>
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {complaint && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {isClosed && (
                <Pill tone="success">
                  <Lock className="size-2.5" />
                  Closed
                </Pill>
              )}
              {isReworked && (
                <Pill tone="warning">
                  <RotateCcw className="size-2.5" />
                  Rework Requested
                </Pill>
              )}
              {!isClosed && !isReworked && <Pill tone="info">Awaiting Verification</Pill>}
              <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>{complaint.severity}</Pill>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-8 text-xs shrink-0">
            <RefreshCw className={cn("size-3.5 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <VerificationSkeleton />
      ) : !complaint ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground glass rounded-2xl">
          <AlertOctagon className="size-8" />
          <p className="text-sm">Complaint not found or access denied.</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to queue
          </Button>
        </div>
      ) : (
        <>
          {/* Workspace header */}
          <WorkspaceHeader
            eyebrow={`VERIFICATION #${complaint._id.slice(-8).toUpperCase()} · ${ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}`}
            title={complaint.title}
            description={complaint.description}
            stats={[
              {
                label: "City",
                value: complaint.cityId.charAt(0).toUpperCase() + complaint.cityId.slice(1),
                tone: "muted",
              },
              { label: "Images", value: complaint.images?.length ?? 0, tone: "info" },
              {
                label: "Severity",
                value: complaint.severity,
                tone: SEVERITY_TONE[complaint.severity] ?? "muted",
              },
              ...(complaint.reworkCount
                ? [
                    {
                      label: "Rework #",
                      value: complaint.reworkCount,
                      tone: "destructive" as const,
                    },
                  ]
                : []),
            ]}
          />

          {/* Rework history notice */}
          {(complaint.reworkCount ?? 0) > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  This is resubmission #{complaint.reworkCount}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the updated evidence and notes carefully before making a final decision.
                </p>
              </div>
            </div>
          )}

          {/* Split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left — complaint detail */}
            <div className="lg:col-span-2 space-y-4">
              {/* Complaint details */}
              <Panel eyebrow="Complaint Information" title="Original Complaint">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
                  {[
                    {
                      label: "Issue Type",
                      value: ISSUE_LABELS[complaint.issueType] ?? complaint.issueType,
                    },
                    { label: "Severity", value: complaint.severity },
                    { label: "City", value: complaint.cityId },
                    { label: "Filed", value: new Date(complaint.createdAt).toLocaleDateString() },
                    { label: "Status", value: STATUS_LABEL[complaint.status] },
                    { label: "Location", value: complaint.location?.address ?? "Not specified" },
                  ].map((f) => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </div>
                      <div className="font-medium capitalize truncate">{f.value}</div>
                    </div>
                  ))}
                </div>
                {complaint.location?.address && (
                  <div className="pt-3 border-t border-border/50 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                    {complaint.location.address}
                  </div>
                )}
              </Panel>

              {/* Internal notes — admin read-only view */}
              {complaint.internalNotes && (
                <Panel eyebrow="Investigation Notes" title="Authority's Internal Notes">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {complaint.internalNotes}
                  </p>
                </Panel>
              )}

              {/* Evidence gallery */}
              <Panel eyebrow="Evidence" title="Uploaded Evidence">
                <EvidenceGallery images={extractComplaintImages(complaint)} />
              </Panel>

              {/* Activity timeline */}
              <Panel eyebrow="Activity Timeline" title="Complete Investigation History">
                <Timeline complaint={complaint} />
              </Panel>
            </div>

            {/* Right — sticky verification panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-[8.5rem]">
                <VerificationActionPanel
                  complaint={complaint}
                  onVerified={() => refetch()}
                  onReworked={() => refetch()}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
