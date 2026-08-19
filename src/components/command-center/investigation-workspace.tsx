import { useState, useRef, useCallback, useEffect } from "react";
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
  Send,
  Building,
  Mail,
  FileText,
  Check,
} from "lucide-react";
import { complaintApi, messageApi } from "@/lib/api/services.api";
import { Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export interface MessageRecord {
  _id: string;
  complaintId: string;
  senderId: string;
  senderRole: "citizen" | "authority";
  senderName: string;
  body: string;
  attachments: string[];
  readBy: string[];
  createdAt: string;
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

export const STATUS_TONE: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
  pending: "warning",
  "in-progress": "info",
  awaiting_citizen_review: "info",
  resolved: "info",
  rework: "destructive",
  rejected: "muted",
  closed: "success",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  awaiting_citizen_review: "Resolution Submitted — Awaiting Citizen Review",
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
  citizen_accepted: CheckCircle2,
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
  citizen_accepted: "var(--color-success)",
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

function formatFullDate(d: string): string {
  try {
    return new Date(d).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Evidence preview"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 cursor-zoom-out"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative max-w-4xl max-h-[85vh] flex items-center justify-center cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={url}
            alt="Evidence"
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain border border-border/40"
          />
          <button
            onClick={onClose}
            aria-label="Close image preview"
            className="absolute top-2 right-2 size-8 rounded-full bg-black/70 hover:bg-black text-white grid place-items-center transition-colors border border-white/20"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Phase 3C: Rework notice ──────────────────────────────────────────────────
function ReworkNotice({ complaint }: { complaint: ComplaintRecord }) {
  if (complaint.status !== "rework" || !complaint.reworkReason) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-destructive/30 bg-destructive/8 p-3.5 sm:p-4 text-xs space-y-2"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-destructive/15 grid place-items-center shrink-0">
            <RotateCcw className="size-3 text-destructive" />
          </div>
          <p className="font-semibold text-destructive text-sm">Returned for Rework</p>
        </div>
        {complaint.reworkCount && complaint.reworkCount > 1 && (
          <span className="text-[10px] font-medium text-destructive/80 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
            Rework Cycle #{complaint.reworkCount}
          </span>
        )}
      </div>
      <div className="pl-7 space-y-1.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Rejection Reason
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            {complaint.reworkReason}
          </p>
        </div>
        {complaint.reworkComments && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Administrator Comments
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {complaint.reworkComments}
            </p>
          </div>
        )}
        <p className="text-[11px] text-destructive/80 pt-0.5">
          Please update your investigation evidence and notes, then resubmit resolution.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Phase 3C: Closed notice ──────────────────────────────────────────────────
function ClosedNotice({ complaint }: { complaint: ComplaintRecord }) {
  if (complaint.status !== "closed") return null;
  return (
    <div className="rounded-xl border border-success/30 bg-success/8 p-3.5 sm:p-4 flex items-start gap-2.5 text-xs">
      <div className="size-5 rounded-full bg-success/15 grid place-items-center shrink-0 mt-0.5">
        <Lock className="size-3 text-success" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-success text-sm">Complaint Closed — Investigation Verified</p>
        <p className="text-muted-foreground mt-0.5 leading-snug">
          Resolution approved by Administrator.
          {complaint.verifiedByName && ` Verified by ${complaint.verifiedByName}.`}
          {complaint.verifiedAt && ` (${formatFullDate(complaint.verifiedAt)})`}
        </p>
      </div>
    </div>
  );
}

// ─── Single Evidence Card ────────────────────────────────────────────────────
function EvidenceTile({
  img,
  index,
  canRemove,
  isRemoving,
  onOpen,
  onRemove,
}: {
  img: string;
  index: number;
  canRemove?: boolean;
  isRemoving?: boolean;
  onOpen: (src: string) => void;
  onRemove?: () => void;
}) {
  const src = resolveAssetUrl(img) ?? img;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/20 aspect-video text-muted-foreground p-2 text-center">
        <ImageOff className="size-4" />
        <span className="text-[10px] uppercase tracking-wider">Unavailable</span>
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            aria-label="Remove evidence"
            className="absolute top-1 right-1 size-5 rounded-full bg-background/80 hover:bg-destructive hover:text-white grid place-items-center border border-border text-xs transition-colors"
          >
            {isRemoving ? <Loader2 className="size-2.5 animate-spin" /> : <X className="size-2.5" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(src)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(src);
        }
      }}
      aria-label={`View evidence photo ${index + 1}`}
      className="group relative rounded-lg overflow-hidden border border-border/60 bg-muted/20 aspect-video cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all hover:border-border"
    >
      <img
        src={src}
        alt={`Evidence photo ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <ExternalLink className="size-4 text-white drop-shadow" />
      </div>
      {canRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove evidence"
          className="absolute top-1.5 right-1.5 size-6 rounded-full bg-destructive/90 hover:bg-destructive grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-white"
        >
          {isRemoving ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        </button>
      )}
    </div>
  );
}

// ─── SOP Checklist Hook ───────────────────────────────────────────────────────
function useInvestigationChecklist(complaintId: string) {
  const key = `investigation-checklist-${complaintId}`;
  const [checked, setChecked] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  });

  const toggle = useCallback(
    (i: number) => {
      setChecked((prev) => {
        const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* quota */
        }
        return next;
      });
    },
    [key],
  );

  return { checked, toggle };
}

// ─── Compact Complaint Header ─────────────────────────────────────────────────
function CaseHeader({
  complaint,
  onBack,
  onRefetch,
  isLoading,
}: {
  complaint: ComplaintRecord;
  onBack: () => void;
  onRefetch: () => void;
  isLoading: boolean;
}) {
  const age = ageLabel(complaint.createdAt);

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-3">
      {/* Top Action & Status Row */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Work Queue
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {age.critical ? (
            <Pill tone="destructive">
              <AlertTriangle className="size-2.5" />
              Overdue · {age.text}
            </Pill>
          ) : age.urgent ? (
            <Pill tone="warning">{age.text}</Pill>
          ) : (
            <Pill tone="muted">{age.text}</Pill>
          )}
          <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>
            {complaint.severity.toUpperCase()}
          </Pill>
          <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Pill>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefetch}
            disabled={isLoading}
            className="h-7 px-2.5 text-xs"
          >
            <RefreshCw className={cn("size-3 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span>CASE #{complaint._id.slice(-8).toUpperCase()}</span>
          <span>·</span>
          <span>{ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}</span>
        </div>
        <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight mt-0.5 break-words">
          {complaint.title}
        </h1>
        {complaint.description && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 mt-1 leading-relaxed break-words">
            {complaint.description}
          </p>
        )}
      </div>

      {/* Quick Meta Row */}
      <div className="pt-2.5 border-t border-border/40 flex items-center gap-x-5 gap-y-1.5 flex-wrap text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building className="size-3.5 text-muted-foreground/70 shrink-0" />
          <span className="capitalize text-foreground/80 font-medium">{complaint.cityId}</span>
        </div>
        {complaint.location?.address && (
          <div className="flex items-center gap-1.5 min-w-0 max-w-md">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="truncate text-foreground/80 font-medium">
              {complaint.location.address}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
          <span>Filed: {formatFullDate(complaint.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground/70 shrink-0" />
          <span>Updated: {timeAgo(complaint.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab: Details + Citizen Evidence ─────────────────────────────────
function OverviewTabContent({
  complaint,
  onOpenLightbox,
}: {
  complaint: ComplaintRecord;
  onOpenLightbox: (url: string) => void;
}) {
  const images = complaint.images ?? [];

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4">
      {/* Complaint Details Grid */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Case Record
          </p>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
            Complaint Details
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Issue Type
            </div>
            <div className="font-semibold text-foreground">
              {ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Severity
            </div>
            <div className="flex items-center gap-1.5 font-semibold capitalize text-foreground">
              <span
                className="size-2 rounded-full shrink-0"
                style={{
                  background:
                    complaint.severity === "critical" || complaint.severity === "high"
                      ? "var(--color-destructive)"
                      : complaint.severity === "medium"
                        ? "var(--color-warning)"
                        : "var(--color-success)",
                }}
              />
              {complaint.severity}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Current Status
            </div>
            <div>
              <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
                {STATUS_LABEL[complaint.status] ?? complaint.status}
              </Pill>
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              City
            </div>
            <div className="font-semibold capitalize text-foreground">{complaint.cityId}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Location
            </div>
            <div className="font-semibold text-foreground truncate" title={complaint.location?.address ?? "Not specified"}>
              {complaint.location?.address ?? "Not specified"}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Filed Date
            </div>
            <div className="font-semibold text-foreground">
              {new Date(complaint.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {complaint.location?.address && (
          <div className="rounded-lg bg-muted/20 border border-border/40 p-2.5 flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-medium text-foreground">{complaint.location.address}</span>
              {complaint.location.lat !== undefined && complaint.location.lng !== undefined && (
                <span className="text-[11px] text-muted-foreground/80 block mt-0.5">
                  GPS: {complaint.location.lat.toFixed(5)}, {complaint.location.lng.toFixed(5)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Citizen Evidence Section */}
      <div className="pt-3.5 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Citizen Evidence
            </p>
            <p className="text-xs text-muted-foreground">
              Evidence submitted with this complaint
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </span>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {images.map((img, i) => (
              <EvidenceTile
                key={i}
                img={img}
                index={i}
                canRemove={false}
                onOpen={onOpenLightbox}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <ImageOff className="size-4 shrink-0 text-muted-foreground/60" />
            <span>No citizen evidence photos attached to this complaint.</span>
          </div>
        )}
      </div>

      {/* Reporter Snapshot */}
      {complaint.submittedBy && (
        <div className="pt-3.5 border-t border-border/40 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Citizen Reporter
          </p>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{complaint.submittedBy.name || "Anonymous Citizen"}</span>
            </div>
            {complaint.submittedBy.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5 text-muted-foreground/70" />
                <span>{complaint.submittedBy.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-3.5 text-muted-foreground/70" />
              <span>Submitted on {new Date(complaint.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Investigation Tab: Checklist + Notes + Investigation Evidence ────────────
function InvestigationTabContent({
  complaint,
  canEdit,
  checklist,
  onRefetch,
  onOpenLightbox,
}: {
  complaint: ComplaintRecord;
  canEdit: boolean;
  checklist: { checked: number[]; toggle: (i: number) => void };
  onRefetch: () => void;
  onOpenLightbox: (url: string) => void;
}) {
  const qc = useQueryClient();
  const pct = Math.round((checklist.checked.length / CHECKLIST_ITEMS.length) * 100);

  // Investigation Notes State
  const [notes, setNotes] = useState(complaint.internalNotes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);

  const notesMutation = useMutation({
    mutationFn: (text: string) => complaintApi.updateNotes(complaint._id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint", complaint._id] });
      setSavedNotes(true);
      setEditingNotes(false);
      onRefetch();
      setTimeout(() => setSavedNotes(false), 2000);
    },
  });

  // Authority Upload Evidence
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4">
      {/* 1. SOP Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
              Investigation
            </h2>
            <p className="text-xs text-muted-foreground">
              Investigation progress: {checklist.checked.length} / {CHECKLIST_ITEMS.length}
            </p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
            {pct}% Completed
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          />
        </div>

        {/* SOP items */}
        <div className="space-y-1.5 pt-1">
          {CHECKLIST_ITEMS.map((item, i) => {
            const isChecked = checklist.checked.includes(i);
            return (
              <button
                key={i}
                onClick={() => checklist.toggle(i)}
                role="checkbox"
                aria-checked={isChecked}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg py-2 px-2.5 sm:px-3 text-left transition-all border text-xs sm:text-sm",
                  isChecked
                    ? "bg-primary/8 border-primary/20 text-foreground"
                    : "bg-muted/10 border-border/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded border flex items-center justify-center shrink-0 transition-all",
                    isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border/70",
                  )}
                >
                  {isChecked && <CheckSquare className="size-3" />}
                </div>
                <span className={cn("leading-tight break-words", isChecked && "line-through opacity-70")}>
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Investigation Notes */}
      <div className="pt-3.5 border-t border-border/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Official Records
            </p>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Investigation Notes
            </h3>
          </div>
          {canEdit && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Edit3 className="size-3" />
              Edit Notes
            </button>
          )}
        </div>

        {savedNotes && (
          <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 rounded-md px-2.5 py-1">
            <CheckCircle2 className="size-3.5" />
            Notes successfully saved
          </div>
        )}

        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
              placeholder="Add official investigation findings, site inspection notes, reporter contact logs…"
              className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-xs sm:text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotes(complaint.internalNotes ?? "");
                  setEditingNotes(false);
                }}
                className="h-7 px-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => notesMutation.mutate(notes)}
                disabled={notesMutation.isPending}
                className="h-7 px-3 text-xs"
              >
                {notesMutation.isPending ? (
                  <>
                    <Loader2 className="size-3 mr-1 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-3 mr-1" />
                    Save Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {notes.trim() ? (
              <div className="rounded-lg bg-muted/20 border border-border/40 p-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {notes}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-1">
                {canEdit
                  ? "No internal notes recorded yet. Click Edit Notes to add observations."
                  : "No internal notes recorded for this case."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. Investigation Evidence */}
      <div className="pt-3.5 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Authority Evidence
            </p>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Investigation Evidence
            </h3>
            <p className="text-xs text-muted-foreground">
              Field inspection photos, sensor logs, and official records
            </p>
          </div>
        </div>

        {/* Upload Zone */}
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
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-2.5 rounded-lg border border-dashed p-3 sm:p-4 cursor-pointer transition-all text-center sm:text-left",
              isDragOver
                ? "border-primary bg-primary/8"
                : "border-border/70 hover:border-primary/50 hover:bg-muted/20",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="size-4 animate-spin" />
                <span>Uploading evidence files…</span>
              </div>
            ) : (
              <>
                <div className="size-8 rounded-full bg-primary/10 grid place-items-center shrink-0">
                  <Upload className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {isDragOver ? "Drop evidence files here" : "Click or drag to attach field evidence"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    JPG, PNG, WEBP · up to 5 MB per file
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Evidence Photos Grid */}
        {complaint.images?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {complaint.images.map((img, i) => (
              <EvidenceTile
                key={i}
                img={img}
                index={i}
                canRemove={canEdit}
                isRemoving={removeMutation.isPending}
                onOpen={onOpenLightbox}
                onRemove={() => removeMutation.mutate(img)}
              />
            ))}
          </div>
        ) : !canEdit ? (
          <p className="text-xs text-muted-foreground italic py-1">
            No investigation evidence attached.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Timeline Tab Content ─────────────────────────────────────────────────────
function TimelineTabContent({ complaint }: { complaint: ComplaintRecord }) {
  type Entry = { type: string; message: string; userName?: string; ts: string };

  const entries: Entry[] = [
    {
      type: "created",
      message: `Complaint filed by ${complaint.submittedBy?.name ?? "citizen"}`,
      userName: complaint.submittedBy?.name,
      ts: complaint.createdAt,
    },
  ];

  for (const ev of complaint.events ?? []) {
    entries.push({
      type: ev.type,
      message: ev.message,
      userName: ev.userName,
      ts: ev.timestamp,
    });
  }

  if (
    complaint.resolvedAt &&
    !entries.some((e) => e.type === "resolved" || e.type === "resubmitted")
  ) {
    entries.push({
      type: "resolved",
      message: "Resolution submitted",
      ts: complaint.resolvedAt,
    });
  }

  entries.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Audit Trail
        </p>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Activity Timeline
        </h2>
        <p className="text-xs text-muted-foreground">
          Chronological case history of all actions, assignments, and status updates
        </p>
      </div>

      <div className="pt-2">
        {entries.map((entry, i) => {
          const Icon = EVENT_ICON[entry.type] ?? Clock;
          const color = EVENT_COLOR[entry.type] ?? "var(--color-muted-foreground)";
          const isLast = i === entries.length - 1;

          return (
            <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
              {!isLast && (
                <div
                  className="absolute left-[11px] top-6 bottom-0 w-px"
                  style={{ background: "var(--color-border)" }}
                />
              )}
              <div
                className="size-6 rounded-full border-2 grid place-items-center shrink-0 bg-background relative z-10"
                style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
              >
                <Icon className="size-3" style={{ color }} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs sm:text-sm font-medium text-foreground leading-snug break-words">
                  {entry.message}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {entry.userName && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {entry.userName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                    {formatFullDate(entry.ts)} ({timeAgo(entry.ts)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Messages Tab Content ─────────────────────────────────────────────────────
function MessagesTabContent({
  complaint,
}: {
  complaint: ComplaintRecord;
  currentUser: AuthUser;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaint-messages", complaint._id],
    queryFn: () => messageApi.getMessages(complaint._id),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const messages: MessageRecord[] =
    (data as unknown as { data?: { messages?: MessageRecord[] } })?.data?.messages ?? [];

  const markReadMutation = useMutation({
    mutationFn: () => messageApi.markRead(complaint._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaint-unread-count", complaint._id] });
      qc.invalidateQueries({ queryKey: ["complaint-unread-counts"] });
    },
  });

  useEffect(() => {
    if (messages.length > 0) markReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint._id, messages.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => messageApi.sendMessage(complaint._id, body),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["complaint-messages", complaint._id] });
    },
  });

  const canSend =
    complaint.status !== "closed" &&
    complaint.status !== "rejected" &&
    !!complaint.assignedTo;

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Direct Channel
        </p>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Citizen Communication
        </h2>
        <p className="text-xs text-muted-foreground">
          Official case messaging between authority and the citizen reporter
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2.5 py-2">
          <Skeleton className="h-10 w-3/5 rounded-xl" />
          <Skeleton className="h-10 w-2/5 rounded-xl ml-auto" />
          <Skeleton className="h-10 w-1/2 rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Could not load messages conversation.</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg bg-muted/20 border border-border/30 p-6 text-center text-xs text-muted-foreground">
          No messages exchanged yet. Use the composer below to reach out to the citizen.
        </div>
      ) : (
        <div ref={listRef} className="max-h-[360px] overflow-y-auto space-y-2.5 p-2 rounded-lg bg-muted/10 border border-border/30 pr-1.5">
          {messages.map((m) => {
            const fromAuthority = m.senderRole === "authority";
            return (
              <div
                key={m._id}
                className={cn(
                  "flex flex-col max-w-[85%] sm:max-w-[75%]",
                  fromAuthority ? "ml-auto items-end" : "items-start",
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground mb-0.5 px-1">
                  {fromAuthority ? "You (Authority)" : m.senderName || "Citizen"}
                </span>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs",
                    fromAuthority
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/70 text-foreground border border-border/40 rounded-tl-xs",
                  )}
                >
                  {m.body}
                </div>
                <span className="text-[9px] text-muted-foreground/70 mt-0.5 px-1">
                  {formatFullDate(m.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer */}
      {!canSend ? (
        <div className="rounded-lg bg-muted/20 border border-border/30 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="size-3.5 shrink-0" />
          <span>
            {complaint.assignedTo
              ? "This conversation is closed and read-only."
              : "Messaging opens once this complaint is assigned to an authority officer."}
          </span>
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={2000}
            placeholder="Type a message to the citizen (Press Enter to send)…"
            className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-xs sm:text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Enter to send · Shift+Enter for newline
            </span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              className="h-7 px-3 text-xs"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="size-3 mr-1 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-3 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Right-Side Operational Control Rail ──────────────────────────────────────
function CaseControlRail({
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

  function transition(newStatus: string) {
    const payload: { status: string; resolution?: string } = { status: newStatus };
    if (newStatus === "resolved" && resolution.trim()) payload.resolution = resolution.trim();
    statusMutation.mutate(payload);
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4">
      {/* 1. Status & Primary Actions */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Operational Status
          </p>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
            Case Control
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Pill>
          <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>
            {complaint.severity.toUpperCase()}
          </Pill>
        </div>

        {canAct && (
          <div className="space-y-2 pt-1">
            {complaint.status === "pending" && (
              <Button
                className="w-full h-8 text-xs justify-center"
                onClick={() => transition("in-progress")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ChevronRight className="size-3.5 mr-1.5" />
                )}
                Start Investigation
              </Button>
            )}

            {(complaint.status === "in-progress" || isRework) && (
              <Button
                className="w-full h-8 text-xs justify-center"
                onClick={() => transition("resolved")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                )}
                {isRework ? "Resubmit Resolution" : "Submit Resolution"}
              </Button>
            )}

            {(complaint.status === "pending" || complaint.status === "in-progress" || isRework) && (
              <Button
                variant="outline"
                className="w-full h-8 text-xs justify-center text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => transition("rejected")}
                disabled={statusMutation.isPending}
              >
                <X className="size-3.5 mr-1.5" />
                Reject Complaint
              </Button>
            )}
          </div>
        )}

        {/* Terminal state badges */}
        {complaint.status === "closed" && (
          <div className="rounded-lg bg-success/10 border border-success/20 p-2.5 text-xs flex items-center gap-2 text-success">
            <Lock className="size-3.5 shrink-0" />
            <span>Complaint closed — investigation verified.</span>
          </div>
        )}
        {complaint.status === "rejected" && (
          <div className="rounded-lg bg-muted/40 border border-border/40 p-2.5 text-xs flex items-center gap-2 text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            <span>Complaint rejected.</span>
          </div>
        )}
        {complaint.status === "resolved" && (
          <div className="rounded-lg bg-info/10 border border-info/20 p-2.5 text-xs flex items-center gap-2 text-info">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>Submitted — awaiting administrator verification.</span>
          </div>
        )}
        {complaint.status === "awaiting_citizen_review" && (
          <div className="rounded-lg bg-info/10 border border-info/20 p-2.5 text-xs flex items-center gap-2 text-info">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>Submitted — awaiting citizen review.</span>
          </div>
        )}
      </div>

      {/* 2. Resolution Notes Entry */}
      {canAct && (complaint.status === "in-progress" || isRework) && (
        <div className="pt-3.5 border-t border-border/40 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isRework ? "Updated Resolution Notes" : "Resolution Summary"}
          </p>
          {isRework && complaint.resolution && (
            <div className="p-2 rounded bg-muted/30 border border-border/40 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground block mb-0.5">Previous Resolution:</span>
              <p className="line-clamp-3">{complaint.resolution}</p>
            </div>
          )}
          <textarea
            rows={3}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder={
              isRework
                ? "Document revised resolution actions…"
                : "Document actions taken, findings, and outcome…"
            }
            className="w-full rounded-lg border border-border bg-background/80 px-2.5 py-2 text-xs leading-relaxed resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
          <p className="text-[10px] text-muted-foreground">
            Included when clicking Submit Resolution above.
          </p>
        </div>
      )}

      {/* 3. Submitted Resolution Display (Read-only) */}
      {complaint.resolution && !isRework && (
        <div className="pt-3.5 border-t border-border/40 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Submitted Resolution
          </p>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-2.5 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {complaint.resolution}
          </div>
          {complaint.resolvedAt && (
            <p className="text-[10px] text-muted-foreground">
              Resolved: {formatFullDate(complaint.resolvedAt)}
            </p>
          )}
        </div>
      )}

      {/* 4. Assignment Information */}
      <div className="pt-3.5 border-t border-border/40 space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Case Assignment
        </p>
        {complaint.assignedTo ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-full bg-primary/20 text-primary border border-primary/30 grid place-items-center text-xs font-bold shrink-0">
                {(complaint.assignedTo.name ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground truncate">
                  {complaint.assignedTo.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {complaint.assignedTo.email}
                </div>
              </div>
              {isAssigned && <Pill tone="primary">You</Pill>}
            </div>

            {complaint.assignmentSource && (
              <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 border border-border/40">
                {complaint.assignmentSource === "automatic" ? "Auto-assigned" : "Manually assigned"}
              </span>
            )}

            {(complaint.assignedByName || complaint.assignedAt) && (
              <div className="text-[11px] text-muted-foreground/80 space-y-0.5 pt-1">
                {complaint.assignedByName && (
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="size-3 shrink-0 text-muted-foreground/70" />
                    <span>Assigned by {complaint.assignedByName}</span>
                  </div>
                )}
                {complaint.assignedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3 shrink-0 text-muted-foreground/70" />
                    <span>{formatFullDate(complaint.assignedAt)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No officer assigned yet.</p>
        )}
      </div>

      {/* 5. Citizen Reporter Snapshot in Sidebar */}
      {complaint.submittedBy && (
        <div className="pt-3.5 border-t border-border/40 space-y-1.5 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filed By
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
              <User className="size-3 text-muted-foreground shrink-0" />
              <span>{complaint.submittedBy.name || "Anonymous"}</span>
            </div>
            {complaint.submittedBy.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                <span className="truncate">{complaint.submittedBy.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground/80 text-[11px]">
              <Calendar className="size-3 text-muted-foreground/70 shrink-0" />
              <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Investigation Workspace Export ──────────────────────────────────────
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complaint", complaintId],
    queryFn: () => complaintApi.getOne(complaintId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const complaint: ComplaintRecord | undefined = (
    data as unknown as { data?: { complaint?: ComplaintRecord } }
  )?.data?.complaint;

  const canEdit =
    (currentUser.role === "authority" || currentUser.role === "administrator") &&
    !["resolved", "rejected", "closed"].includes(complaint?.status ?? "");

  const checklist = useInvestigationChecklist(complaintId);

  // Unread message count badge for Messages tab
  const { data: unreadData } = useQuery({
    queryKey: ["complaint-unread-count", complaintId],
    queryFn: () => messageApi.getUnreadCount(complaintId),
    enabled: !!complaint?.assignedTo,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
  const unreadMessages =
    (unreadData as unknown as { data?: { count?: number } })?.data?.count ?? 0;

  return (
    <>
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="space-y-4 sm:space-y-5"
      >
        {isLoading ? (
          <WorkspaceSkeleton />
        ) : !complaint ? (
          <div className="rounded-xl border border-border/50 bg-card/60 p-8 text-center space-y-3">
            <AlertOctagon className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">Complaint not found or access denied.</p>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to Work Queue
            </Button>
          </div>
        ) : (
          <>
            {/* Status Notices */}
            <ReworkNotice complaint={complaint} />
            <ClosedNotice complaint={complaint} />

            {/* Compact Case Record Header */}
            <CaseHeader
              complaint={complaint}
              onBack={onBack}
              onRefetch={() => refetch()}
              isLoading={isLoading}
            />

            {/* Main 2-Column Responsive Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
              {/* Left Main Workspace Column (~70% on desktop) */}
              <div className="lg:col-span-8 min-w-0">
                <Tabs defaultValue="overview" className="w-full">
                  {/* Single Compact Horizontal Tab Strip with Swipe/Scroll */}
                  <div className="overflow-x-auto -mx-1 px-1 pb-1">
                    <TabsList className="w-max min-w-full sm:w-auto h-9 p-1 bg-muted/30 border border-border/40 rounded-xl gap-1">
                      <TabsTrigger value="overview" className="h-7 text-xs font-medium px-3 rounded-lg">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="investigation" className="h-7 text-xs font-medium px-3 rounded-lg gap-1.5">
                        Investigation
                        <span className="text-[10px] tabular-nums opacity-80 font-semibold bg-muted/60 px-1.5 py-0.2 rounded">
                          {checklist.checked.length}/{CHECKLIST_ITEMS.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="h-7 text-xs font-medium px-3 rounded-lg">
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger value="messages" className="h-7 text-xs font-medium px-3 rounded-lg gap-1.5">
                        Messages
                        {unreadMessages > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[15px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                            {unreadMessages}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab 1: Overview */}
                  <TabsContent value="overview" className="mt-3 focus-visible:outline-none">
                    <OverviewTabContent
                      complaint={complaint}
                      onOpenLightbox={(url) => setLightboxUrl(url)}
                    />
                  </TabsContent>

                  {/* Tab 2: Investigation */}
                  <TabsContent value="investigation" className="mt-3 focus-visible:outline-none">
                    <InvestigationTabContent
                      complaint={complaint}
                      canEdit={canEdit}
                      checklist={checklist}
                      onRefetch={() => refetch()}
                      onOpenLightbox={(url) => setLightboxUrl(url)}
                    />
                  </TabsContent>

                  {/* Tab 3: Timeline */}
                  <TabsContent value="timeline" className="mt-3 focus-visible:outline-none">
                    <TimelineTabContent complaint={complaint} />
                  </TabsContent>

                  {/* Tab 4: Messages */}
                  <TabsContent value="messages" className="mt-3 focus-visible:outline-none">
                    <MessagesTabContent complaint={complaint} currentUser={currentUser} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Operational Control Rail (~30% on desktop, stacked on mobile) */}
              <div className="lg:col-span-4 min-w-0">
                <div className="lg:sticky lg:top-20 space-y-4">
                  <CaseControlRail
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
    </>
  );
}
