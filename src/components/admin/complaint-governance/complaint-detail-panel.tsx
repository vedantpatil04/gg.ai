import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Mail,
  MapPin,
  CalendarDays,
  User,
  ShieldCheck,
  CheckCircle2,
  ImageOff,
  Check,
  X,
  UserPlus,
  RotateCcw,
  Lock,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveAssetUrl, extractComplaintImages } from "@/components/profile/profile-utils";
import { useState } from "react";
import { humanizeIssueType } from "./issue-type";
import { ActivityFeed, complaintEventsToActivityFeed } from "@/components/admin/shared/activity-feed";
import type {
  ComplaintSeverity,
  ComplaintStatus,
  GovernedComplaint,
} from "./complaint-governance-queries";

function SeverityBadge({ severity }: { severity: ComplaintSeverity }) {
  const config = {
    low: {
      label: "Low Severity",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
    medium: {
      label: "Medium Severity",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    high: {
      label: "High Severity",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    critical: {
      label: "Critical Severity",
      classes: "bg-destructive/10 text-destructive border-destructive/25 font-bold shadow-[0_0_6px_rgba(239,68,68,0.2)]",
    },
  }[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      {severity === "critical" && <AlertTriangle className="size-3 shrink-0" />}
      {severity === "high" && <AlertCircle className="size-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const config = {
    pending: {
      label: "Pending Triage",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    "in-progress": {
      label: "Field Active (In Progress)",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    },
    resolved: {
      label: "Awaiting Verification",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    },
    rejected: {
      label: "Rejected",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
    rework: {
      label: "Returned for Rework",
      classes: "bg-destructive/10 text-destructive border-destructive/25",
    },
    closed: {
      label: "Closed & Archived",
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <span>{config.label}</span>
    </span>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="size-7 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0 mt-0.5">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-bold tracking-[0.12em] text-muted-foreground/75">{label}</div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-foreground hover:text-primary transition-colors break-all underline decoration-border/60"
          >
            {value}
          </a>
        ) : (
          <div className="text-xs font-medium text-foreground break-words mt-0.5">{value}</div>
        )}
      </div>
    </div>
  );
}

function EvidenceThumb({ path, index }: { path: string; index: number }) {
  const src = resolveAssetUrl(path) ?? path;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-muted/30 aspect-square text-muted-foreground select-none">
        <ImageOff className="size-4 text-muted-foreground/60" />
        <span className="text-[9px] uppercase tracking-wider font-mono">Attachment {index + 1}</span>
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="group relative block rounded-xl overflow-hidden border border-border/60 bg-muted/30 aspect-square hover:border-primary/50 transition-all shadow-2xs"
    >
      <img
        src={src}
        alt={`Incident Evidence ${index + 1}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white">
        <ExternalLink className="size-4" />
      </div>
    </a>
  );
}

interface ComplaintDetailPanelProps {
  complaint: GovernedComplaint | null;
  onOpenChange: (open: boolean) => void;
  onVerify?: (complaint: GovernedComplaint) => void;
  onReject?: (complaint: GovernedComplaint) => void;
  onAssign?: (complaint: GovernedComplaint) => void;
}

export function ComplaintDetailPanel({
  complaint,
  onOpenChange,
  onVerify,
  onReject,
  onAssign,
}: ComplaintDetailPanelProps) {
  return (
    <Sheet open={!!complaint} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6 bg-card border-l border-border/60">
        {complaint && (
          <div className="space-y-5">
            {/* Top Navigation */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 -ml-2 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Complaint Queue</span>
              </Button>
            </div>

            {/* Header Banner */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="font-bold text-primary">#{complaint._id.slice(-6).toUpperCase()}</span>
                <span>&middot;</span>
                <span className="capitalize">{complaint.cityId}</span>
                <span>&middot;</span>
                <span>{humanizeIssueType(complaint.issueType)}</span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-foreground font-display leading-tight">
                {complaint.title}
              </h2>

              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40">
                <StatusBadge status={complaint.status} />
                <SeverityBadge severity={complaint.severity} />
              </div>
            </div>

            {/* Rework Notice Banner */}
            {complaint.status === "rework" && complaint.reworkReason && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-1.5 select-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                  <RotateCcw className="size-3.5" />
                  Rework Requested by Administrator
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{complaint.reworkReason}</p>
                {complaint.reworkComments && (
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {complaint.reworkComments}
                  </p>
                )}
              </div>
            )}

            {/* Closed Notice Banner */}
            {complaint.status === "closed" && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-emerald-500 text-xs font-semibold select-none">
                <Lock className="size-4 shrink-0" />
                <span>Incident Closed &amp; Verified{complaint.verifiedByName ? ` by ${complaint.verifiedByName}` : ""}</span>
              </div>
            )}

            {/* Incident Description */}
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
                Incident Description
              </div>
              <div className="p-3 rounded-xl border border-border/40 bg-muted/10 text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {complaint.description}
              </div>
            </div>

            {/* Incident Metadata */}
            <div className="space-y-2">
              <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
                Reporter &amp; Location Telemetry
              </div>
              <div className="space-y-1.5">
                <DetailField
                  icon={User}
                  label="Citizen Reporter"
                  value={complaint.submittedBy?.name ?? "Anonymous Citizen"}
                />
                <DetailField
                  icon={Mail}
                  label="Reporter Email"
                  value={complaint.submittedBy?.email ?? "Not available"}
                  href={complaint.submittedBy?.email ? `mailto:${complaint.submittedBy.email}` : undefined}
                />
                <DetailField
                  icon={MapPin}
                  label="Incident Location"
                  value={complaint.location?.address || `${complaint.cityId} (Coordinates registered)`}
                />
                <DetailField
                  icon={CalendarDays}
                  label="Submission Date"
                  value={format(new Date(complaint.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <DetailField
                  icon={ShieldCheck}
                  label="Assigned Officer"
                  value={
                    complaint.assignedTo
                      ? `${complaint.assignedTo.name} (${complaint.assignedTo.email})`
                      : "Unassigned — Awaiting Officer Assignment"
                  }
                />
                {complaint.resolution && (
                  <DetailField icon={CheckCircle2} label="Reported Resolution" value={complaint.resolution} />
                )}
                {complaint.verifiedByName && complaint.verifiedAt && (
                  <DetailField
                    icon={CheckCircle2}
                    label="Administrator Verification"
                    value={`Verified by ${complaint.verifiedByName} on ${format(new Date(complaint.verifiedAt), "MMM d, yyyy")}`}
                  />
                )}
              </div>
            </div>

            {/* Evidence Attachments */}
            {(() => {
              const evidenceImages = extractComplaintImages(complaint);
              return (
                <div className="space-y-2">
                  <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1 flex items-center justify-between">
                    <span>Citizen Evidence Attachments</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {evidenceImages.length} {evidenceImages.length === 1 ? "photo" : "photos"}
                    </span>
                  </div>
                  {evidenceImages.length === 0 ? (
                    <div className="p-3 rounded-xl border border-border/40 bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground select-none">
                      <ImageOff className="size-4 text-muted-foreground/60" />
                      <span>No citizen evidence photos attached to this report.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {evidenceImages.map((src, i) => (
                        <EvidenceThumb key={src + i} path={src} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Incident Lifecycle Timeline */}
            <div className="space-y-2">
              <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
                Audit Timeline &amp; Event Stream
              </div>
              <ActivityFeed
                events={complaintEventsToActivityFeed(
                  complaint.events ?? [],
                  complaint.title,
                  complaint._id,
                )}
                maxItems={10}
                compact
              />
            </div>

            {/* Action Buttons */}
            {(complaint.status === "pending" ||
              complaint.status === "in-progress" ||
              complaint.status === "rework") && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                {complaint.status === "pending" && onVerify && (
                  <Button className="w-full h-9 text-xs font-semibold cursor-pointer shadow-xs" onClick={() => onVerify(complaint)}>
                    <Check className="size-4 mr-1.5" />
                    Verify &amp; Mark In Progress
                  </Button>
                )}
                {onAssign && (
                  <Button variant="outline" className="w-full h-9 text-xs font-semibold cursor-pointer border-border/70 hover:bg-muted/60" onClick={() => onAssign(complaint)}>
                    <UserPlus className="size-4 mr-1.5" />
                    {complaint.assignedTo ? "Reassign Officer" : "Assign Authority Officer"}
                  </Button>
                )}
                {complaint.status !== "rework" && onReject && (
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                    onClick={() => onReject(complaint)}
                  >
                    <X className="size-4 mr-1.5" />
                    Reject Incident Report
                  </Button>
                )}
              </div>
            )}

            {complaint.status === "resolved" && (
              <div className="pt-2 border-t border-border/50">
                <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs text-sky-500 text-center font-medium">
                  Select this row in the Verification tab to launch the full Resolution Verification Workspace.
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

