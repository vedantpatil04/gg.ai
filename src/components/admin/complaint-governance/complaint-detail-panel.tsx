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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { resolveAssetUrl } from "@/components/profile/profile-utils";
import { useState } from "react";
import { humanizeIssueType } from "./issue-type";
import type {
  ComplaintSeverity,
  ComplaintStatus,
  GovernedComplaint,
} from "./complaint-governance-queries";

const SEVERITY_PILL_TONE: Record<ComplaintSeverity, "muted" | "info" | "warning" | "destructive"> =
  {
    low: "muted",
    medium: "info",
    high: "warning",
    critical: "destructive",
  };

// Phase 3C: closed and rework added
const STATUS_PILL_TONE: Record<
  ComplaintStatus,
  "warning" | "info" | "success" | "destructive" | "muted"
> = {
  pending: "warning",
  "in-progress": "info",
  resolved: "info", // awaiting verification
  rejected: "muted",
  rework: "destructive", // Phase 3C
  closed: "success", // Phase 3C
};

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  resolved: "Awaiting Verification",
  rejected: "Rejected",
  rework: "Returned for Rework", // Phase 3C
  closed: "Closed", // Phase 3C
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

// Evidence thumbnail with a clean project-consistent fallback (instead of the
// raw browser broken-image icon) if the resolved URL 404s or otherwise fails
// to load — preserves the evidence metadata (index / link) either way.
function EvidenceThumb({ path, index }: { path: string; index: number }) {
  const src = resolveAssetUrl(path) ?? path;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/30 aspect-square text-muted-foreground">
        <ImageOff className="size-4" />
        <span className="text-[9px] uppercase tracking-wider">Unavailable</span>
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg overflow-hidden border border-border aspect-square"
    >
      <img
        src={src}
        alt={`Attachment ${index + 1}`}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

interface ComplaintDetailPanelProps {
  complaint: GovernedComplaint | null;
  onOpenChange: (open: boolean) => void;
  onVerify: (complaint: GovernedComplaint) => void;
  onReject: (complaint: GovernedComplaint) => void;
  onAssign: (complaint: GovernedComplaint) => void;
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
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {complaint && (
          <>
            <SheetHeader>
              <SheetTitle>{complaint.title}</SheetTitle>
              <SheetDescription>
                #{complaint._id.slice(-6)} · {humanizeIssueType(complaint.issueType)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone={STATUS_PILL_TONE[complaint.status]}>
                  {STATUS_LABEL[complaint.status]}
                </Pill>
                <Pill tone={SEVERITY_PILL_TONE[complaint.severity]}>
                  {complaint.severity} severity
                </Pill>
              </div>

              {/* Phase 3C: rework feedback notice */}
              {complaint.status === "rework" && complaint.reworkReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/8 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <RotateCcw className="size-3.5" />
                    Rework Requested
                  </div>
                  <p className="text-xs leading-relaxed">{complaint.reworkReason}</p>
                  {complaint.reworkComments && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {complaint.reworkComments}
                    </p>
                  )}
                </div>
              )}

              {/* Phase 3C: closed notice */}
              {complaint.status === "closed" && (
                <div className="rounded-lg border border-success/30 bg-success/8 p-3 flex items-center gap-2 text-success text-sm">
                  <Lock className="size-4 shrink-0" />
                  Closed
                  {complaint.verifiedByName ? ` · Verified by ${complaint.verifiedByName}` : ""}
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                  Description
                </div>
                <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
              </div>

              <div className="space-y-4">
                <Field
                  icon={User}
                  label="Reporter"
                  value={complaint.submittedBy?.name ?? "Unknown"}
                />
                <Field
                  icon={Mail}
                  label="Reporter Email"
                  value={complaint.submittedBy?.email ?? "Not available"}
                />
                <Field
                  icon={MapPin}
                  label="Location"
                  value={complaint.location?.address || `${complaint.cityId} (no address on file)`}
                />
                <Field
                  icon={CalendarDays}
                  label="Submitted"
                  value={format(new Date(complaint.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <Field
                  icon={ShieldCheck}
                  label="Assigned Authority"
                  value={
                    complaint.assignedTo
                      ? `${complaint.assignedTo.name} (${complaint.assignedTo.email})`
                      : "Not yet assigned"
                  }
                />
                {complaint.resolution && (
                  <Field icon={CheckCircle2} label="Resolution" value={complaint.resolution} />
                )}
                {/* Phase 3C: verified by */}
                {complaint.verifiedByName && complaint.verifiedAt && (
                  <Field
                    icon={CheckCircle2}
                    label="Verified By"
                    value={`${complaint.verifiedByName} on ${format(new Date(complaint.verifiedAt), "MMM d, yyyy")}`}
                  />
                )}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Images {complaint.images.length > 0 && `(${complaint.images.length})`}
                </div>
                {complaint.images.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageOff className="size-4" />
                    No images attached
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {complaint.images.map((src, i) => (
                      <EvidenceThumb key={src + i} path={src} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons — only for actionable statuses (not resolved/rework/closed) */}
            {(complaint.status === "pending" || complaint.status === "in-progress") && (
              <div className="mt-8 space-y-2">
                {complaint.status === "pending" && (
                  <Button className="w-full" onClick={() => onVerify(complaint)}>
                    <Check className="size-4 mr-1.5" />
                    Verify (mark In Progress)
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => onAssign(complaint)}>
                  <UserPlus className="size-4 mr-1.5" />
                  {complaint.assignedTo ? "Reassign Authority" : "Assign to Authority"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onReject(complaint)}
                >
                  <X className="size-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            )}

            {/* Phase 3C: resolved complaints → direct to verification workspace */}
            {complaint.status === "resolved" && (
              <div className="mt-8 p-3 rounded-xl border border-info/30 bg-info/8 text-xs text-info text-center">
                Click the row in the Verification tab to open the full verification workspace.
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
