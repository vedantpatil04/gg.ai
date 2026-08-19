import { Loader2, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
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
import type { AuthorityApprovalStatus, AuthorityRequest } from "./authority-request-queries";
import { useAuthorityRequests } from "./authority-request-queries";

const STATUS_PILL_TONE: Record<AuthorityApprovalStatus, "success" | "warning" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const EMPTY_MESSAGE: Record<AuthorityApprovalStatus, string> = {
  pending: "No pending authority requests.",
  approved: "No approved requests.",
  rejected: "No rejected requests.",
};

interface AuthorityRequestListProps {
  status: AuthorityApprovalStatus;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (request: AuthorityRequest) => void;
}

export function AuthorityRequestList({
  status,
  page,
  onPageChange,
  onSelect,
}: AuthorityRequestListProps) {
  const { data, isLoading, isError } = useAuthorityRequests(status, page);

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
        Couldn't load requests. Try refreshing.
      </p>
    );
  }

  const requests = data?.requests ?? [];

  if (requests.length === 0) {
    return (
      <AdminEmptyState
        icon={UserCog}
        title={EMPTY_MESSAGE[status]}
        description="Requests will appear here once submitted."
      />
    );
  }

  return (
    <div>
      {/* Mobile Stacked Cards (< md) */}
      <div className="md:hidden space-y-2.5">
        {requests.map((r) => (
          <div
            key={r._id}
            onClick={() => onSelect(r)}
            className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/60 transition-all cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-primary/10 text-primary text-xs font-semibold grid place-items-center shrink-0">
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate leading-snug">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                </div>
              </div>
              <Pill tone={STATUS_PILL_TONE[r.approvalStatus]} className="shrink-0">
                {r.approvalStatus}
              </Pill>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-border/40 text-muted-foreground">
              <span className="truncate max-w-[150px]">
                {r.organization || r.city || "No org"}
              </span>
              <span className="text-[11px] shrink-0">
                {format(new Date(r.createdAt), "MMM d, yyyy")}
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r._id} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(r)}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell className="text-muted-foreground">{r.organization || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.city || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(r.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Pill tone={STATUS_PILL_TONE[r.approvalStatus]}>{r.approvalStatus}</Pill>
                </TableCell>
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
