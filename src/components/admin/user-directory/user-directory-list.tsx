import { Loader2, ChevronLeft, ChevronRight, Users as UsersIcon, User, ShieldCheck, Crown, ChevronRight as RowChevron, Search, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";
import { useUserDirectory } from "./user-directory-queries";

/* ── Badge Helpers ───────────────────────────────────────────────────────── */

function RoleBadge({ role }: { role: DirectoryRole }) {
  const config = {
    citizen: {
      label: "Citizen",
      icon: User,
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    authority: {
      label: "Authority",
      icon: ShieldCheck,
      classes: "bg-primary/10 text-primary border-primary/25",
    },
    administrator: {
      label: "Admin",
      icon: Crown,
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
  }[role];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <Icon className="size-3" />
      <span>{config.label}</span>
    </span>
  );
}

function ApprovalBadge({ status }: { status: DirectoryUser["approvalStatus"] }) {
  const config = {
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    rejected: {
      label: "Rejected",
      icon: AlertCircle,
      classes: "bg-destructive/10 text-destructive border-destructive/25",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <Icon className="size-3" />
      <span>{config.label}</span>
    </span>
  );
}

function AccountStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 select-none">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50 shrink-0 select-none">
      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      <span>Inactive</span>
    </span>
  );
}

function UserAvatar({ name, role }: { name: string; role: DirectoryRole }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

  const ringTone = {
    citizen: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    authority: "bg-primary/10 text-primary border-primary/20",
    administrator: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  }[role];

  return (
    <div
      className={cn(
        "size-8.5 sm:size-9 rounded-xl border font-bold text-xs grid place-items-center shrink-0 select-none",
        ringTone,
      )}
    >
      {initials}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────── */

interface UserDirectoryListProps {
  role?: DirectoryRole;
  isActive?: boolean;
  page: number;
  limit: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onSelect: (user: DirectoryUser) => void;
  onClearFilters?: () => void;
}

export function UserDirectoryList({
  role,
  isActive,
  page,
  limit,
  searchTerm,
  onPageChange,
  onSelect,
  onClearFilters,
}: UserDirectoryListProps) {
  const { data, isLoading, isError, refetch } = useUserDirectory({ role, isActive, page, limit });

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-3">
        <div className="flex items-center justify-center h-48 gap-2.5 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Querying identity directory…</span>
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
          <div className="text-sm font-semibold text-foreground">Failed to Load User Directory</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Unable to communicate with the identity authority endpoint.
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
          Retry Query
        </Button>
      </div>
    );
  }

  const allUsers = data?.users ?? [];
  const term = searchTerm.trim().toLowerCase();
  const users = term
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u._id.toLowerCase().includes(term),
      )
    : allUsers;

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-4">
        <div className="size-11 rounded-2xl bg-muted/70 border border-border/60 grid place-items-center text-muted-foreground">
          <UsersIcon className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">No Users Found</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
            {term
              ? `No user records matched "${searchTerm}" in the current dataset.`
              : "No user accounts match the selected role and status criteria."}
          </p>
        </div>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs h-8 mt-1">
            Clear Active Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ── MOBILE PURPOSE-BUILT CARDS (< md) ────────────────────────────── */}
      <div className="md:hidden divide-y divide-border/40">
        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => onSelect(u)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(u);
              }
            }}
            className={cn(
              "group p-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer select-none",
              "focus-visible:bg-muted/40 focus-visible:outline-none",
            )}
          >
            {/* Top Row: Avatar + Name + Email + Role Badge */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar name={u.name} role={u.role} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {u.name}
                  </div>
                  <div className="text-xs text-muted-foreground/80 truncate">{u.email}</div>
                </div>
              </div>

              <RoleBadge role={u.role} />
            </div>

            {/* Optional Metadata Row (Org / City / Phone) */}
            {(u.organization || u.city || u.phone) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/75 mt-2 pl-11 truncate">
                {u.organization && <span className="truncate">{u.organization}</span>}
                {u.organization && u.city && <span>&middot;</span>}
                {u.city && <span className="truncate">{u.city}</span>}
              </div>
            )}

            {/* Bottom Row: Status Pills + Registration Date + Chevron */}
            <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-border/30 pl-11">
              <div className="flex items-center gap-1.5 flex-wrap">
                <AccountStatusBadge isActive={u.isActive} />
                {u.role === "authority" && <ApprovalBadge status={u.approvalStatus} />}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 shrink-0 font-mono">
                <span>{format(new Date(u.createdAt), "MMM d, yyyy")}</span>
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
                User Identity
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Role & Access
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Approval
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Account Status
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Registered
              </TableHead>
              <TableHead className="py-3 px-4 text-right text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {users.map((u) => (
              <TableRow
                key={u._id}
                onClick={() => onSelect(u)}
                className="group cursor-pointer hover:bg-muted/30 transition-colors select-none"
              >
                {/* User Identity (Avatar + Name + Email) */}
                <TableCell className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0 max-w-xs xl:max-w-md">
                    <UserAvatar name={u.name} role={u.role} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {u.name}
                      </div>
                      <div className="text-xs text-muted-foreground/80 truncate">{u.email}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell className="py-3 px-4">
                  <RoleBadge role={u.role} />
                </TableCell>

                {/* Approval */}
                <TableCell className="py-3 px-4">
                  {u.role === "authority" ? (
                    <ApprovalBadge status={u.approvalStatus} />
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </TableCell>

                {/* Account Status */}
                <TableCell className="py-3 px-4">
                  <AccountStatusBadge isActive={u.isActive} />
                </TableCell>

                {/* Registered Date */}
                <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                  {format(new Date(u.createdAt), "MMM d, yyyy")}
                </TableCell>

                {/* Action Affordance */}
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
      {!term && data && data.pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/50 bg-muted/10">
          <div className="text-xs text-muted-foreground font-mono">
            Showing Page <span className="font-semibold text-foreground">{data.pagination.page}</span> of{" "}
            <span className="font-semibold text-foreground">{data.pagination.pages}</span> &middot;{" "}
            <span className="font-semibold text-foreground">{data.pagination.total}</span> total users
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

      {/* Search Result Info */}
      {term && (
        <div className="p-3 border-t border-border/40 bg-muted/10 text-[11px] text-muted-foreground/80 flex items-center justify-between gap-2">
          <span>
            Filtering {users.length} results matching <strong className="text-foreground font-semibold">"{searchTerm}"</strong> in active dataset.
          </span>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-primary hover:underline cursor-pointer font-medium shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

