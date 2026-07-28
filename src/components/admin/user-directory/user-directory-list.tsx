import { Loader2, ChevronLeft, ChevronRight, Users as UsersIcon } from "lucide-react";
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
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";
import { useUserDirectory } from "./user-directory-queries";

const ROLE_PILL_TONE: Record<DirectoryRole, "info" | "primary" | "muted"> = {
  citizen: "info",
  authority: "primary",
  administrator: "muted",
};

const APPROVAL_PILL_TONE: Record<
  DirectoryUser["approvalStatus"],
  "success" | "warning" | "destructive"
> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

interface UserDirectoryListProps {
  role?: DirectoryRole;
  isActive?: boolean;
  page: number;
  limit: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSelect: (user: DirectoryUser) => void;
}

export function UserDirectoryList({
  role,
  isActive,
  page,
  limit,
  searchTerm,
  onPageChange,
  onSelect,
}: UserDirectoryListProps) {
  const { data, isLoading, isError } = useUserDirectory({ role, isActive, page, limit });

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
        Couldn't load users. Try refreshing.
      </p>
    );
  }

  const allUsers = data?.users ?? [];
  const term = searchTerm.trim().toLowerCase();
  const users = term
    ? allUsers.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
      )
    : allUsers;

  if (users.length === 0) {
    return (
      <AdminEmptyState
        icon={UsersIcon}
        title="No users found."
        description={
          term
            ? `No name or email matched "${searchTerm}" in the loaded results.`
            : "No users match the current filters."
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
            <TableHead>Role</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Registered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u._id} className="cursor-pointer" onClick={() => onSelect(u)}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Pill tone={ROLE_PILL_TONE[u.role]}>{u.role}</Pill>
              </TableCell>
              <TableCell>
                {u.role === "authority" ? (
                  <Pill tone={APPROVAL_PILL_TONE[u.approvalStatus]}>{u.approvalStatus}</Pill>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Pill tone={u.isActive ? "success" : "muted"}>
                  {u.isActive ? "Active" : "Inactive"}
                </Pill>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(u.createdAt), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!term && data && data.pagination.pages > 1 && (
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

      {term && (
        <p className="text-xs text-muted-foreground mt-4">
          Searching name/email within the {allUsers.length} most recent matching-filter results —
          not the entire directory.
        </p>
      )}
    </div>
  );
}
