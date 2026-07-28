import { Loader2, ChevronLeft, ChevronRight, IdCard } from "lucide-react";
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
import type { AuthorityApprovalStatus } from "@/components/admin/authority-requests/authority-request-queries";
import { useAuthorityDirectory, type DirectoryAuthority } from "./authority-directory-queries";

const APPROVAL_PILL_TONE: Record<AuthorityApprovalStatus, "success" | "warning" | "destructive"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

export type ApprovalFilter = "all" | AuthorityApprovalStatus;

interface AuthorityDirectoryListProps {
  isActive?: boolean;
  approvalFilter: ApprovalFilter;
  page: number;
  limit: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSelect: (authority: DirectoryAuthority) => void;
}

export function AuthorityDirectoryList({
  isActive,
  approvalFilter,
  page,
  limit,
  searchTerm,
  onPageChange,
  onSelect,
}: AuthorityDirectoryListProps) {
  const { data, isLoading, isError } = useAuthorityDirectory({ isActive, page, limit });

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
        Couldn't load authorities. Try refreshing.
      </p>
    );
  }

  const all = data?.users ?? [];
  const term = searchTerm.trim().toLowerCase();
  const authorities = all
    .filter((a) => approvalFilter === "all" || a.approvalStatus === approvalFilter)
    .filter(
      (a) => !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term),
    );

  if (authorities.length === 0) {
    return (
      <AdminEmptyState
        icon={IdCard}
        title="No authorities found."
        description={
          term
            ? `No name or email matched "${searchTerm}" in the loaded results.`
            : "No authority accounts match the current filters."
        }
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
            <TableHead>City</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {authorities.map((a) => (
            <TableRow key={a._id} className="cursor-pointer" onClick={() => onSelect(a)}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-muted-foreground">{a.email}</TableCell>
              <TableCell className="text-muted-foreground">{a.city || "—"}</TableCell>
              <TableCell>
                <Pill tone={APPROVAL_PILL_TONE[a.approvalStatus]}>{a.approvalStatus}</Pill>
              </TableCell>
              <TableCell>
                <Pill tone={a.isActive ? "success" : "muted"}>
                  {a.isActive ? "Active" : "Inactive"}
                </Pill>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.lastLogin ? format(new Date(a.lastLogin), "MMM d, yyyy") : "Never"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(a.createdAt), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!term && approvalFilter === "all" && data && data.pagination.pages > 1 && (
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

      {(term || approvalFilter !== "all") && (
        <p className="text-xs text-muted-foreground mt-4">
          Filtering within the {all.length} loaded results — not necessarily the entire directory.
        </p>
      )}
    </div>
  );
}
