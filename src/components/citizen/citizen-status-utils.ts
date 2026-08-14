import { format, isValid } from "date-fns";
import type { ComplaintStatus, ComplaintSeverity } from "./citizen-queries";

// ─── Safe date formatting ─────────────────────────────────────────────────────

export function safeFormatDate(
  dateVal: string | Date | number | undefined | null,
  formatStr: string,
  fallback = "—",
): string {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (!isValid(d) || isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

// ─── Status presentation ──────────────────────────────────────────────────────

export const STATUS_META: Record<
  ComplaintStatus,
  { label: string; tone: "muted" | "warning" | "info" | "success" | "destructive" | "primary" }
> = {
  // "pending" covers two real backend situations — received-but-unassigned
  // and assigned-but-investigation-not-started (there is no separate
  // "assigned" status in this project; see constants/smartRouting.ts on the
  // backend). getStatusMeta() below picks the accurate label using
  // assignedTo; this entry is the fallback when assignment info isn't known.
  pending: { label: "Pending", tone: "warning" },
  "in-progress": { label: "In Progress", tone: "info" },
  // Authority's first resolution — the citizen is the next actor.
  awaiting_citizen_review: { label: "Ready for Review", tone: "primary" },
  // Only reached after a rework resubmission — genuinely awaiting the admin.
  resolved: { label: "Awaiting Verification", tone: "primary" },
  // Reached when the citizen rejects the authority's first resolution — the
  // complaint is now an administrator-controlled governance case (Phase 5).
  rework: { label: "Rework Requested", tone: "warning" },
  rejected: { label: "Rejected", tone: "destructive" },
  closed: { label: "Closed", tone: "success" },
};

// isAssigned should be true when the complaint's assignedTo is populated.
// Only affects the "pending" status, where it distinguishes "received, not
// yet assigned" from "assigned, investigation not yet started" — both are
// the same backend status, but citizens should see different wording.
export function getStatusMeta(status: string, isAssigned?: boolean) {
  if (status === "pending" && isAssigned) {
    return { label: "Assigned", tone: "info" as const };
  }
  return (
    STATUS_META[status as ComplaintStatus] ?? { label: status ?? "", tone: "muted" as const }
  );
}

// ─── Severity presentation ────────────────────────────────────────────────────

export const SEVERITY_META: Record<
  ComplaintSeverity,
  { label: string; tone: "muted" | "warning" | "destructive" | "info" }
> = {
  low: { label: "Low", tone: "muted" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "destructive" },
};

export function getSeverityMeta(severity: string) {
  return (
    SEVERITY_META[severity as ComplaintSeverity] ?? { label: severity ?? "", tone: "muted" as const }
  );
}

// ─── Issue type labels ────────────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, string> = {
  air_pollution: "Air Pollution",
  water_contamination: "Water Contamination",
  open_burning: "Open Burning",
  noise: "Noise",
  waste_dumping: "Waste Dumping",
  chemical_spill: "Chemical Spill",
  other: "Other",
};

export function humanizeIssueType(issueType: string): string {
  return ISSUE_TYPE_LABELS[issueType] ?? issueType ?? "";
}

// ─── Timeline event labels ────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  created: "Complaint Submitted",
  assigned: "Assigned to Authority",
  reassigned: "Reassigned",
  status_change: "Status Updated",
  image_added: "Evidence Uploaded",
  image_removed: "Evidence Removed",
  note_updated: "Notes Updated",
  resolved: "Resolution Submitted",
  rejected: "Complaint Rejected",
  verified: "Resolution Verified",
  closed: "Complaint Closed",
  rework_requested: "Returned for Rework",
  resubmitted: "Resolution Resubmitted",
  citizen_accepted: "Resolution Accepted",
};

export function humanizeEventType(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType ?? "";
}

// ─── Month labels ─────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(month: number): string {
  return MONTHS[month - 1] ?? String(month ?? "");
}

