import { Loader2, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
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
import { Pill } from "@/components/ui-bits";
import { AdminEmptyState } from "@/components/admin/admin-dashboard-container";
import { humanizeIssueType } from "./issue-type";
import type {
  ComplaintSeverity,
  ComplaintStatus,
  GovernedComplaint,
} from "./complaint-governance-queries";
import { useComplaintQueue } from "./complaint-governance-queries";

const SEVERITY_PILL_TONE: Record<ComplaintSeverity, "muted" | "info" | "warning" | "destructive"> =
  {
    low: "muted",
    medium: "info",
    high: "warning",
    critical: "destructive",
  };

// Phase 3C: closed and rework added
const EMPTY_MESSAGE: Record<ComplaintStatus, string> = {
  pending: "No complaints awaiting review.",
  "in-progress": "No complaints in progress.",
  resolved: "No complaints awaiting verification.",
  rejected: "No rejected complaints.",
  rework: "No complaints currently in rework.", // Phase 3C
  closed: "No closed complaints yet.", // Phase 3C
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
  const { data, isLoading, isError } = useComplaintQueue(status, severity, page);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center py-12">
        Couldn't load complaints. Try refreshing.
      </p>
    );
  }

  const complaints = data?.complaints ?? [];

  if (complaints.length === 0) {
    return (
      <AdminEmptyState
        icon={ClipboardCheck}
        title={EMPTY_MESSAGE[status]}
        description="Complaints will appear here as they move through the lifecycle."
      />
    );
  }

  return (
    <div>
      {/* Mobile Stacked Cards (< md) */}
      <div className="md:hidden space-y-2.5">
        {complaints.map((c) => (
          <div
            key={c._id}
            onClick={() => onSelect(c)}
            className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/60 transition-all cursor-pointer space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-semibold text-primary">
                  #{c._id.slice(-6)}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground capitalize truncate">{c.cityId}</span>
              </div>
              <Pill tone={SEVERITY_PILL_TONE[c.severity]} className="shrink-0">
                {c.severity}
              </Pill>
            </div>

            <div>
              <div className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                {c.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {humanizeIssueType(c.issueType)} · by {c.submittedBy?.name ?? "Unknown"}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs pt-1.5 border-t border-border/40 text-muted-foreground">
              <span className="text-[11px]">
                {format(new Date(c.createdAt), "MMM d, yyyy")}
              </span>
              <span className="text-[11px] truncate max-w-[150px] text-right">
                {c.assignedTo?.name ? `Assigned: ${c.assignedTo.name}` : "Unassigned"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title / Category</TableHead>
              <TableHead>Citizen</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.map((c) => (
              <TableRow
                key={c._id}
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => onSelect(c)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{c._id.slice(-6)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {humanizeIssueType(c.issueType)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.submittedBy?.name ?? "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">{c.cityId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(c.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Pill tone={SEVERITY_PILL_TONE[c.severity]}>{c.severity}</Pill>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.assignedTo?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 text-xs flex-1 sm:flex-none"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 text-xs flex-1 sm:flex-none"
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
