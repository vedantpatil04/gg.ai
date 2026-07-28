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
            <TableRow key={r._id} className="cursor-pointer" onClick={() => onSelect(r)}>
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

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => onPageChange(page + 1)}
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
