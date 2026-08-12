import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertOctagon,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Calendar,
  Camera,
  X,
  Upload,
  Loader2,
  RefreshCw,
  Shield,
  MessageSquare,
  ChevronRight,
  Edit3,
  Save,
  AlertTriangle,
  Info,
  ExternalLink,
  Trash2,
  UserCheck,
  RotateCcw,
  Lock,
  CheckSquare,
  ImageOff,
} from "lucide-react";
import { complaintApi } from "@/lib/api/services.api";
import { Panel, Pill, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAssetUrl } from "@/components/profile/profile-utils";
import type { AuthUser } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface ComplaintEventEntry {
  type: string;
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

export interface ComplaintRecord {
  _id: string;
  title: string;
  description: string;
  issueType: string;
  severity: string;
  status: string;
  cityId: string;
  location?: { address?: string; lat?: number; lng?: number };
  images: string[];
  internalNotes?: string;
  events?: ComplaintEventEntry[];
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: { _id?: string; name?: string; email?: string; role?: string };
  assignedTo?: { _id?: string; name?: string; email?: string };
  assignedBy?: { _id?: string; name?: string; email?: string };
  assignedAt?: string;
  assignedByName?: string;
  assignmentSource?: "automatic" | "manual";
  // Phase 3C — verification
  verifiedBy?: { _id?: string; name?: string; email?: string };
  verifiedAt?: string;
  verifiedByName?: string;
  // Phase 3C — rework
  reworkReason?: string;
  reworkComments?: string;
  reworkCount?: number;
}

// ─── Constant maps ────────────────────────────────────────────────────────────
export const ISSUE_LABELS: Record<string, string> = {
  air_pollution: "Air Pollution",
  water_contamination: "Water Contamination",
  open_burning: "Open Burning",
  noise: "Noise",
  waste_dumping: "Waste Dumping",
  chemical_spill: "Chemical Spill",
  other: "Other",
};
export const SEVERITY_TONE: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
};
export const STATUS_TONE: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> =
  {
    pending: "warning",
    "in-progress": "info",
    resolved: "info", // awaiting verification
    rework: "destructive",
    rejected: "muted",
    closed: "success",
  };
export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  resolved: "Awaiting Verification",
  rework: "Returned for Rework",
  rejected: "Rejected",
  closed: "Closed",
};

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

const CHECKLIST_ITEMS = [
  "Verified complaint details and description",
  "Contacted the reporter if needed",
  "Visited or assessed the reported location",
  "Collected photographic evidence",
  "Assessed environmental impact severity",
  "Cross-referenced related open complaints",
  "Drafted resolution notes",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ageLabel(d: string) {
  const h = (Date.now() - new Date(d).getTime()) / 3_600_000;
  if (h < 1) return { text: "Just now", urgent: false, critical: false };
  if (h < 24) return { text: `${Math.floor(h)}h ago`, urgent: false, critical: false };
  const days = Math.floor(h / 24);
  return { text: `${days}d ago`, urgent: days >= 2, critical: days >= 5 };
}
function timeAgo(d: string): string {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
      >
        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          src={url}
          alt="Evidence"
          className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain cursor-default"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"
        >
          <X className="size-5 text-white" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Phase 3C: Rework notice ──────────────────────────────────────────────────
function ReworkNotice({ complaint }: { complaint: ComplaintRecord }) {
  if (complaint.status !== "rework" || !complaint.reworkReason) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-full bg-destructive/15 grid place-items-center shrink-0">
          <RotateCcw className="size-3.5 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-semibold text-destructive">Returned for Rework</p>
          {complaint.reworkCount && complaint.reworkCount > 1 && (
            <p className="text-[10px] text-destructive/70">
              Rework request #{complaint.reworkCount}
            </p>
          )}
        </div>
      </div>
      <div className="pl-8 space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Rejection Reason
          </p>
          <p className="text-sm leading-relaxed">{complaint.reworkReason}</p>
        </div>
        {complaint.reworkComments && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Administrator Comments
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {complaint.reworkComments}
            </p>
          </div>
        )}
      </div>
      <p className="pl-8 text-xs text-destructive/70">
        Upload additional evidence, update your notes, and resubmit when ready.
      </p>
    </motion.div>
  );
}

// ─── Phase 3C: Closed notice ──────────────────────────────────────────────────
function ClosedNotice({ complaint }: { complaint: ComplaintRecord }) {
  if (complaint.status !== "closed") return null;
  return (
    <div className="rounded-xl border border-success/30 bg-success/8 p-4 flex items-start gap-3">
      <div className="size-6 rounded-full bg-success/15 grid place-items-center shrink-0 mt-0.5">
        <Lock className="size-3.5 text-success" />
      </div>
      <div>
        <p className="text-sm font-semibold text-success">Complaint Closed</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Administrator approved the resolution.
          {complaint.verifiedByName && ` Verified by ${complaint.verifiedByName}.`}
          {complaint.verifiedAt &&
            ` ${new Date(complaint.verifiedAt).toLocaleDateString(undefined, { dateStyle: "long" })}.`}
        </p>
      </div>
    </div>
  );
}

// Single evidence tile with a clean project-consistent fallback (instead of a
// raw browser broken-image icon) if the resolved URL fails to load — mirrors
// the same treatment used on the Administrator side (complaint-detail-panel.tsx,
// resolution-verification-workspace.tsx) so both roles behave consistently.
function EvidenceCard({
  img,
  index,
  canEdit,
  removing,
  onOpen,
  onRemove,
}: {
  img: string;
  index: number;
  canEdit: boolean;
  removing: boolean;
  onOpen: (src: string) => void;
  onRemove: () => void;
}) {
  const src = resolveAssetUrl(img) ?? img;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 aspect-video text-muted-foreground">
        <ImageOff className="size-5" />
        <span className="text-[10px] uppercase tracking-wider">Evidence unavailable</span>
        {canEdit && (
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-background/80 hover:bg-destructive/90 hover:text-white grid place-items-center border border-border transition-colors"
          >
            {removing ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
          </button>
        )}
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
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1.5 right-1.5 size-7 rounded-full bg-destructive/90 hover:bg-destructive grid place-items-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        >
          {removing ? (
            <Loader2 className="size-3.5 animate-spin text-white" />
          ) : (
            <X className="size-3.5 text-white" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Evidence panel ───────────────────────────────────────────────────────────
function EvidencePanel({
  complaint,
  canEdit,
  onRefetch,
}: {
  complaint: ComplaintRecord;
  canEdit: boolean;
  onRefetch: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => complaintApi.uploadImages(complaint._id, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint", complaint._id] });
      onRefetch();
    },
  });
  const removeMutation = useMutation({
    mutationFn: (url: string) => complaintApi.removeImage(complaint._id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint", complaint._id] });
      onRefetch();
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 5);
      if (arr.length) uploadMutation.mutate(arr);
    },
    [uploadMutation],
  );

  return (
    <>
      {lightbox && <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />}
      <Panel eyebrow="Evidence" title="Photographic Evidence">
        {complaint.images?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {complaint.images.map((img, i) => (
              <EvidenceCard
                key={i}
                img={img}
                index={i}
                canEdit={canEdit}
                removing={removeMutation.isPending}
                onOpen={setLightbox}
                onRemove={() => removeMutation.mutate(img)}
              />
            ))}
          </div>
        )}
        {canEdit && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/70 hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading…</p>
              </>
            ) : (
              <>
                <div className="size-10 rounded-full bg-primary/10 grid place-items-center">
                  <Upload className="size-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WEBP · 5 MB · max 5 files
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        {!complaint.images?.length && !canEdit && (
          <p className="text-sm text-muted-foreground text-center py-6">No evidence attached.</p>
        )}
      </Panel>
    </>
  );
}

// ─── Internal notes panel ─────────────────────────────────────────────────────
function InternalNotesPanel({
  complaint,
  canEdit,
  onSaved,
}: {
  complaint: ComplaintRecord;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(complaint.internalNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (t: string) => complaintApi.updateNotes(complaint._id, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint", complaint._id] });
      setSaved(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Panel
      eyebrow="Internal Notes"
      title="Investigation Notes"
      action={
        canEdit && !editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
          >
            <Edit3 className="size-3.5" />
            Edit
          </button>
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-3">
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus
            placeholder="Add investigation notes, observations, contact logs…"
            className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setNotes(complaint.internalNotes ?? "");
                setEditing(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Cancel
            </button>
            <Button size="sm" onClick={() => mutation.mutate(notes)} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {saved && (
            <div className="flex items-center gap-2 text-xs text-success mb-3">
              <CheckCircle2 className="size-3.5" />
              Saved
            </div>
          )}
          {notes.trim() ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {canEdit ? "No notes yet. Click Edit to add." : "No internal notes."}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

// ─── Investigation checklist ──────────────────────────────────────────────────
function InvestigationChecklist({ complaintId }: { complaintId: string }) {
  const key = `investigation-checklist-${complaintId}`;
  const [checked, setChecked] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  });
  const toggle = (i: number) => {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    setChecked(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* quota */
    }
  };
  const pct = Math.round((checked.length / CHECKLIST_ITEMS.length) * 100);
  return (
    <Panel eyebrow="Investigation Checklist" title="Standard Operating Procedure">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80 }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {checked.length}/{CHECKLIST_ITEMS.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={cn(
              "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
              checked.includes(i)
                ? "bg-primary/8"
                : "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <div
              className={cn(
                "size-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all",
                checked.includes(i) ? "bg-primary border-primary" : "border-border/70",
              )}
            >
              {checked.includes(i) && <CheckSquare className="size-3 text-primary-foreground" />}
            </div>
            <span className={cn("text-sm", checked.includes(i) && "line-through opacity-60")}>
              {item}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ─── Activity timeline ────────────────────────────────────────────────────────
function ActivityTimeline({ complaint }: { complaint: ComplaintRecord }) {
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
    <Panel eyebrow="Activity Timeline" title="Complete Investigation History">
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
    </Panel>
  );
}

// ─── Action panel (sticky sidebar) ───────────────────────────────────────────
function ActionPanel({
  complaint,
  currentUser,
  resolution,
  setResolution,
  onAction,
}: {
  complaint: ComplaintRecord;
  currentUser: AuthUser;
  resolution: string;
  setResolution: (v: string) => void;
  onAction: () => void;
}) {
  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: (data: { status: string; resolution?: string }) =>
      complaintApi.update(complaint._id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint", complaint._id] });
      onAction();
    },
  });

  const isTerminal = complaint.status === "closed" || complaint.status === "rejected";
  const isRework = complaint.status === "rework";
  const isAssigned = complaint.assignedTo?._id === currentUser._id;
  const canAct = !isTerminal && (currentUser.role === "administrator" || isAssigned);

  function transition(status: string) {
    const p: { status: string; resolution?: string } = { status };
    if (status === "resolved" && resolution.trim()) p.resolution = resolution.trim();
    statusMutation.mutate(p);
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <Panel eyebrow="Current Status" title={STATUS_LABEL[complaint.status] ?? complaint.status}>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{
              background:
                complaint.status === "closed"
                  ? "var(--color-success)"
                  : complaint.status === "rework"
                    ? "var(--color-destructive)"
                    : complaint.status === "resolved"
                      ? "var(--color-info)"
                      : complaint.status === "in-progress"
                        ? "var(--color-info)"
                        : complaint.status === "rejected"
                          ? "var(--color-muted-foreground)"
                          : "var(--color-warning)",
            }}
          />
          <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Pill>
          <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>{complaint.severity}</Pill>
        </div>

        {canAct && (
          <div className="space-y-2">
            {complaint.status === "pending" && (
              <Button
                className="w-full justify-start"
                onClick={() => transition("in-progress")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="size-4 mr-2" />
                )}
                Start Investigation
              </Button>
            )}
            {(complaint.status === "in-progress" || isRework) && (
              <Button
                className="w-full justify-start"
                onClick={() => transition("resolved")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4 mr-2" />
                )}
                {isRework ? "Resubmit Resolution" : "Submit Resolution"}
              </Button>
            )}
            {(complaint.status === "pending" || complaint.status === "in-progress" || isRework) && (
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => transition("rejected")}
                disabled={statusMutation.isPending}
              >
                <X className="size-4 mr-2" />
                Reject Complaint
              </Button>
            )}
          </div>
        )}

        {/* Terminal states */}
        {complaint.status === "closed" && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-sm flex items-center gap-2 text-success">
            <Lock className="size-4 shrink-0" />
            Complaint closed — investigation verified.
          </div>
        )}
        {complaint.status === "rejected" && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
            <Info className="size-4 shrink-0" />
            Complaint rejected.
          </div>
        )}
        {complaint.status === "resolved" && (
          <div className="rounded-lg bg-info/10 px-3 py-2 text-sm flex items-center gap-2 text-info">
            <CheckCircle2 className="size-4 shrink-0" />
            Submitted — awaiting administrator verification.
          </div>
        )}
      </Panel>

      {/* Assignment — Phase 3B: read-only, shows ownership metadata */}
      <Panel eyebrow="Assignment" title="Assigned Officer">
        {complaint.assignedTo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full aurora grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
                {(complaint.assignedTo.name ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{complaint.assignedTo.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {complaint.assignedTo.email}
                </div>
              </div>
              {isAssigned && <Pill tone="primary">You</Pill>}
            </div>
            {(complaint.assignedByName || complaint.assignedAt) && (
              <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                {complaint.assignedByName && (
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="size-3 shrink-0" />
                    Assigned by {complaint.assignedByName}
                  </div>
                )}
                {complaint.assignedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3 shrink-0" />
                    {new Date(complaint.assignedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No officer assigned yet.</p>
        )}
      </Panel>

      {/* Resolution notes input (in-progress or rework) */}
      {canAct && (complaint.status === "in-progress" || isRework) && (
        <Panel
          eyebrow="Resolution"
          title={isRework ? "Updated Resolution Notes" : "Resolution Notes"}
        >
          {isRework && complaint.resolution && (
            <div className="mb-3 p-2.5 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1 text-[10px] uppercase tracking-wider">
                Previous Resolution
              </p>
              <p className="leading-relaxed">{complaint.resolution}</p>
            </div>
          )}
          <textarea
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={
              isRework
                ? "Update your resolution addressing the rework request…"
                : "Document actions taken, findings, and outcome…"
            }
            className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Included when you submit{isRework ? " / resubmit" : ""} above.
          </p>
        </Panel>
      )}

      {/* Existing resolution (read-only) */}
      {complaint.resolution && !isRework && (
        <Panel eyebrow="Resolution Record" title="Submitted Resolution">
          <p className="text-sm leading-relaxed">{complaint.resolution}</p>
          {complaint.resolvedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(complaint.resolvedAt).toLocaleString()}
            </p>
          )}
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
export function InvestigationWorkspace({
  complaintId,
  currentUser,
  onBack,
}: {
  complaintId: string;
  currentUser: AuthUser;
  onBack: () => void;
}) {
  const [resolution, setResolution] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complaint", complaintId],
    queryFn: () => complaintApi.getOne(complaintId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const complaint: ComplaintRecord | undefined = (
    data as unknown as { data?: { complaint?: ComplaintRecord } }
  )?.data?.complaint;

  // Phase 3C: allow editing in rework status in addition to in-progress
  const canEdit =
    (currentUser.role === "authority" || currentUser.role === "administrator") &&
    !["resolved", "rejected", "closed"].includes(complaint?.status ?? "");

  const age = complaint ? ageLabel(complaint.createdAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to queue
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {complaint && (
            <>
              {age?.critical && (
                <Pill tone="destructive">
                  <AlertTriangle className="size-2.5" />
                  Overdue — {age.text}
                </Pill>
              )}
              {age?.urgent && !age.critical && <Pill tone="warning">{age.text}</Pill>}
              <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>{complaint.severity}</Pill>
              <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
                {STATUS_LABEL[complaint.status]}
              </Pill>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("size-3.5 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <WorkspaceSkeleton />
      ) : !complaint ? (
        <Panel>
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <AlertOctagon className="size-8" />
            <p className="text-sm">Complaint not found or access denied.</p>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to queue
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          {/* Phase 3C: rework / closed status banners */}
          <ReworkNotice complaint={complaint} />
          <ClosedNotice complaint={complaint} />

          <WorkspaceHeader
            eyebrow={`COMPLAINT #${complaint._id.slice(-8).toUpperCase()} · ${ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}`}
            title={complaint.title}
            description={complaint.description}
            stats={[
              {
                label: "City",
                value: complaint.cityId.charAt(0).toUpperCase() + complaint.cityId.slice(1),
                tone: "muted",
              },
              {
                label: "Filed",
                value: age?.text ?? "—",
                tone: age?.critical ? "destructive" : age?.urgent ? "warning" : "muted",
              },
              { label: "Images", value: complaint.images?.length ?? 0, tone: "info" },
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <Panel eyebrow="Complaint Details" title="Filed Information">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {[
                    {
                      label: "Issue Type",
                      value: ISSUE_LABELS[complaint.issueType] ?? complaint.issueType,
                    },
                    { label: "Severity", value: complaint.severity },
                    { label: "Status", value: STATUS_LABEL[complaint.status] },
                    { label: "City", value: complaint.cityId },
                    { label: "Location", value: complaint.location?.address ?? "Not specified" },
                    { label: "Filed", value: new Date(complaint.createdAt).toLocaleDateString() },
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
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                    {complaint.location.address}
                  </div>
                )}
              </Panel>
              <EvidencePanel complaint={complaint} canEdit={canEdit} onRefetch={() => refetch()} />
              <InvestigationChecklist complaintId={complaintId} />
              <InternalNotesPanel
                complaint={complaint}
                canEdit={canEdit}
                onSaved={() => refetch()}
              />
              <ActivityTimeline complaint={complaint} />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-[8.5rem] space-y-4">
                <ActionPanel
                  complaint={complaint}
                  currentUser={currentUser}
                  resolution={resolution}
                  setResolution={setResolution}
                  onAction={() => refetch()}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
