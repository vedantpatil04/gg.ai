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

export interface StatusMeta {
  label: string;
  tone: "muted" | "warning" | "info" | "success" | "destructive" | "primary";
  symbol: string;
}

export const STATUS_META: Record<ComplaintStatus, StatusMeta> = {
  pending: { label: "Pending Dispatch", tone: "warning", symbol: "●" },
  "in-progress": { label: "Under Investigation", tone: "info", symbol: "●" },
  awaiting_citizen_review: { label: "Ready for Your Review", tone: "primary", symbol: "●" },
  resolved: { label: "Awaiting Verification", tone: "primary", symbol: "✓" },
  rework: { label: "Rework Requested", tone: "warning", symbol: "●" },
  rejected: { label: "Rejected", tone: "destructive", symbol: "✕" },
  closed: { label: "Closed", tone: "success", symbol: "✓" },
};

export function getStatusMeta(status: string, isAssigned?: boolean): StatusMeta {
  if (status === "pending" && isAssigned) {
    return { label: "Assigned to Authority", tone: "info", symbol: "●" };
  }
  return (
    STATUS_META[status as ComplaintStatus] ?? {
      label: status ?? "Processing",
      tone: "muted",
      symbol: "●",
    }
  );
}

export function getStatusSymbol(status: string, isAssigned?: boolean): string {
  return getStatusMeta(status, isAssigned).symbol;
}

// ─── Severity presentation ────────────────────────────────────────────────────

export interface SeverityMeta {
  label: string;
  tone: "muted" | "warning" | "destructive" | "info";
}

export const SEVERITY_META: Record<ComplaintSeverity, SeverityMeta> = {
  low: { label: "Low", tone: "muted" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "destructive" },
};

export function getSeverityMeta(severity: string): SeverityMeta {
  return (
    SEVERITY_META[severity as ComplaintSeverity] ?? {
      label: severity ?? "Standard",
      tone: "muted",
    }
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
  other: "Other Concern",
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
