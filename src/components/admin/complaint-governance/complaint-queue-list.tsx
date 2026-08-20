import { Loader2, ChevronLeft, ChevronRight, ClipboardCheck, AlertTriangle, AlertCircle, MapPin, User, ChevronRight as RowChevron, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { humanizeIssueType } from "./issue-type";
import type {
  ComplaintSeverity,
  ComplaintStatus,
  GovernedComplaint,
} from "./complaint-governance-queries";
import { useComplaintQueue } from "./complaint-governance-queries";

function SeverityBadge({ severity }: { severity: ComplaintSeverity }) {
  const config = {
    low: {
      label: "Low",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
    medium: {
      label: "Medium",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    high: {
      label: "High",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    critical: {
      label: "Critical",
      classes: "bg-destructive/10 text-destructive border-destructive/25 font-bold shadow-[0_0_6px_rgba(239,68,68,0.2)]",
    },
  }[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 select-none capitalize",
        config.classes,
      )}
    >
      {severity === "critical" && <AlertTriangle className="size-3 shrink-0" />}
      {severity === "high" && <AlertCircle className="size-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

const EMPTY_MESSAGE: Record<ComplaintStatus, { title: string; hint: string }> = {
  pending: {
    title: "No Complaints Awaiting Triage",
    hint: "All incoming complaints have been assigned or verified.",
  },
  "in-progress": {
    title: "No Complaints In Progress",
    hint: "No active field investigations are currently underway.",
  },
  resolved: {
    title: "Verification Queue Clear",
    hint: "No authority resolutions are currently awaiting administrator verification.",
  },
  rejected: {
    title: "No Rejected Complaints",
    hint: "No complaints have been dismissed or rejected.",
  },
  rework: {
    title: "No Complaints in Rework",
    hint: "No cases are currently returned to authorities for remediation.",
  },
  closed: {
    title: "Closed Archive Empty",
    hint: "Verified and resolved complaints will be archived here.",
  },
};

interface ComplaintQueueListProps {
  status: ComplaintStatus;
  severity?: ComplaintSeverity;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (complaint: GovernedComplaint) => void;
}

export function ComplaintQueueList({
  status,
  severity,
  page,
  onPageChange,
  onSelect,
}: ComplaintQueueListProps) {
  const { data, isLoading, isError, refetch } = useComplaintQueue(status, severity, page);

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-3">
        <div className="flex items-center justify-center h-48 gap-2.5 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Fetching complaint lifecycle data…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 sm:p-12 text-center space-y-3">
        <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
          <AlertCircle className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Failed to Load Complaint Queue</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Unable to communicate with the incident governance service.
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
          Retry Query
        </Button>
      </div>
    );
  }

  const complaints = data?.complaints ?? [];
  const emptyInfo = EMPTY_MESSAGE[status];

  if (complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-4">
        <div className="size-11 rounded-2xl bg-muted/70 border border-border/60 grid place-items-center text-muted-foreground">
          <ClipboardCheck className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{emptyInfo.title}</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
            {emptyInfo.hint}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── MOBILE PURPOSE-BUILT CARDS (< md) ────────────────────────────── */}
      <div className="md:hidden divide-y divide-border/40">
        {complaints.map((c) => (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c);
              }
            }}
            className={cn(
              "group p-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer select-none space-y-2",
              "focus-visible:bg-muted/40 focus-visible:outline-none",
            )}
          >
            {/* Top Row: ID + City + Severity */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-primary">
                  #{c._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-muted-foreground/40">&middot;</span>
                <span className="text-[11px] font-medium px-2 py-0.2 rounded-md bg-muted/80 text-muted-foreground truncate">
                  {humanizeIssueType(c.issueType)}
                </span>
              </div>
              <SeverityBadge severity={c.severity} />
            </div>

            {/* Title & Reporter */}
            <div>
              <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {c.title}
              </div>
              <div className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-2 truncate">
                <span>By {c.submittedBy?.name ?? "Anonymous Citizen"}</span>
                <span>&middot;</span>
                <span className="capitalize flex items-center gap-0.5">
                  <MapPin className="size-3 text-muted-foreground/60" />
                  {c.cityId}
                </span>
              </div>
            </div>

            {/* Bottom Row: Date + Assigned Officer + Chevron */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-xs">
              <div className="flex items-center gap-1.5">
                {c.assignedTo?.name ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[170px]">
                    <ShieldCheck className="size-3 text-primary shrink-0" />
                    <span>{c.assignedTo.name}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Unassigned
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 shrink-0 font-mono">
                <span>{format(new Date(c.createdAt), "MMM d, yyyy")}</span>
                <RowChevron className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP ENTERPRISE TABLE (md+) ────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-muted/20">
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Case / ID
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Incident &amp; Category
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Reporter
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Municipality
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Submitted
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Severity
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Officer
              </TableHead>
              <TableHead className="py-3 px-4 text-right text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {complaints.map((c) => (
              <TableRow
                key={c._id}
                onClick={() => onSelect(c)}
                className="group cursor-pointer hover:bg-muted/30 transition-colors select-none"
              >
                {/* ID */}
                <TableCell className="py-3 px-4 font-mono text-xs font-bold text-primary">
                  #{c._id.slice(-6).toUpperCase()}
                </TableCell>

                {/* Title & Category */}
                <TableCell className="py-3 px-4">
                  <div className="max-w-xs xl:max-w-md">
                    <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground/80 truncate mt-0.5">
                      {humanizeIssueType(c.issueType)}
                    </div>
                  </div>
                </TableCell>

                {/* Reporter */}
                <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                  {c.submittedBy?.name ?? "Anonymous"}
                </TableCell>

                {/* Municipality */}
                <TableCell className="py-3 px-4 text-xs text-muted-foreground capitalize">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground/50" />
                    {c.cityId}
                  </span>
                </TableCell>

                {/* Submitted Date */}
                <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                  {format(new Date(c.createdAt), "MMM d, yyyy")}
                </TableCell>

                {/* Severity */}
                <TableCell className="py-3 px-4">
                  <SeverityBadge severity={c.severity} />
                </TableCell>

                {/* Assigned Officer */}
                <TableCell className="py-3 px-4">
                  {c.assignedTo?.name ? (
                    <div className="flex items-center gap-1.5">
                      <div className="size-5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold grid place-items-center shrink-0">
                        {c.assignedTo.name[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-foreground truncate max-w-[130px]">
                        {c.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Unassigned
                    </span>
                  )}
                </TableCell>

                {/* Detail Action */}
                <TableCell className="py-3 px-4 text-right">
                  <div className="inline-flex items-center justify-end">
                    <RowChevron className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── PAGINATION & FOOTER ───────────────────────────────────────────── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/50 bg-muted/10">
          <div className="text-xs text-muted-foreground font-mono">
            Showing Page <span className="font-semibold text-foreground">{data.pagination.page}</span> of{" "}
            <span className="font-semibold text-foreground">{data.pagination.pages}</span> &middot;{" "}
            <span className="font-semibold text-foreground">{data.pagination.total}</span> incidents in queue
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

