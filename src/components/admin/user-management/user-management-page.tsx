import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search, X, Filter, ChevronLeft, ChevronRight, Users, Loader2,
  Power, PowerOff, Lock, Unlock, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionTitle, EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import {
  usePlatformUsers, useUpdatePlatformUser, useLockPlatformUser, useUnlockPlatformUser,
  type PlatformUser,
} from "../platform-admin-api";

type RoleFilter = "all" | "citizen" | "authority" | "administrator";
type StatusFilter = "all" | "active" | "inactive";
type SortField = "createdAt" | "name" | "lastLogin";

const ROLE_PILL: Record<PlatformUser["role"], "info" | "primary" | "muted"> = { citizen: "info", authority: "primary", administrator: "muted" };
const APPROVAL_PILL: Record<PlatformUser["approvalStatus"], "success" | "warning" | "destructive"> = { approved: "success", pending: "warning", rejected: "destructive" };

type PendingAction = { user: PlatformUser; action: "activate" | "deactivate" | "lock" | "unlock" };

const ACTION_META = {
  activate: { label: "Activate Account", desc: "Restore login access for this user.", destructive: false },
  deactivate: { label: "Deactivate Account", desc: "Prevent login. Reversible.", destructive: true },
  lock: { label: "Lock Account", desc: "Temporarily lock for 24 hours.", destructive: true },
  unlock: { label: "Unlock Account", desc: "Remove the account lock.", destructive: false },
};

function SortBtn({ field, cur, dir, onToggle, children }: { field: SortField; cur: SortField; dir: "asc" | "desc"; onToggle: (f: SortField) => void; children: React.ReactNode }) {
  const active = field === cur;
  return (
    <button className={cn("flex items-center gap-1 text-xs font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => onToggle(field)}>
      {children}
      {active ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  );
}

export function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const qc = useQueryClient();
  const limit = search.trim() ? 100 : 25;

  const { data, isLoading, isError } = usePlatformUsers({
    page, limit,
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    sortBy: sortField, sortDir,
  });

  const updateUser = useUpdatePlatformUser();
  const lockUser = useLockPlatformUser();
  const unlockUser = useUnlockPlatformUser();
  const isSubmitting = updateUser.isPending || lockUser.isPending || unlockUser.isPending;

  const hasFilters = roleFilter !== "all" || statusFilter !== "all" || !!search.trim();

  function toggleSort(f: SortField) {
    if (f === sortField) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  }

  function handleConfirm() {
    if (!pending) return;
    const { user, action } = pending;
    const onSuccess = () => setPending(null);
    if (action === "activate") updateUser.mutate({ id: user._id, data: { isActive: true } }, { onSuccess });
    else if (action === "deactivate") updateUser.mutate({ id: user._id, data: { isActive: false } }, { onSuccess });
    else if (action === "lock") lockUser.mutate(user._id, { onSuccess });
    else if (action === "unlock") unlockUser.mutate(user._id, { onSuccess });
  }

  const users = data?.users ?? [];

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Governance"
        title="User Management"
        action={
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["pa-users"] })} className="h-8 text-xs">
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, phone…" className="pl-8 h-9 text-xs sm:text-sm" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
        <Button variant={showFilters ? "default" : "outline"} size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setShowFilters(v => !v)}>
          <Filter className="size-3.5" />Filters
          {hasFilters && <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">{(roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}</span>}
        </Button>
        {hasFilters && <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setRoleFilter("all"); setStatusFilter("all"); setSearch(""); setPage(1); }}><X className="size-3 mr-1" />Clear</Button>}
      </div>

      {showFilters && (
        <div className="glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Role</p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "citizen", "authority", "administrator"] as RoleFilter[]).map(r => (
                <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize", roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")}>
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "active", "inactive"] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sort bar */}
      <div className="flex items-center gap-3 sm:gap-5 px-3 sm:px-4 py-2 border-b text-xs overflow-x-auto scrollbar-hide">
        <span className="text-muted-foreground shrink-0">Sort:</span>
        <SortBtn field="name" cur={sortField} dir={sortDir} onToggle={toggleSort}>Name</SortBtn>
        <SortBtn field="createdAt" cur={sortField} dir={sortDir} onToggle={toggleSort}>Joined</SortBtn>
        <SortBtn field="lastLogin" cur={sortField} dir={sortDir} onToggle={toggleSort}>Last Active</SortBtn>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-12">Couldn't load users. Try refreshing.</p>
        ) : users.length === 0 ? (
          <EmptyState icon={<Users className="size-4" />} title="No users found." description={hasFilters ? "Try adjusting filters." : "No users match current filters."} />
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto flex-1">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">{u.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Pill tone={ROLE_PILL[u.role]}>{u.role}</Pill>
                    <Pill tone={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Pill>
                    {u.role === "authority" && <Pill tone={APPROVAL_PILL[u.approvalStatus]}>{u.approvalStatus}</Pill>}
                    {!u.isVerified && <Pill tone="warning">Unverified</Pill>}
                  </div>
                  <div className="text-xs text-muted-foreground hidden lg:block w-20 text-right">{format(new Date(u.createdAt), "MMM d, yyyy")}</div>
                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    {u.isActive
                      ? <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive active:bg-destructive/10" title="Deactivate" onClick={() => setPending({ user: u, action: "deactivate" })}><PowerOff className="size-3.5" /></Button>
                      : <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-success active:bg-success/10" title="Activate" onClick={() => setPending({ user: u, action: "activate" })}><Power className="size-3.5" /></Button>}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-warning active:bg-warning/10" title="Lock" onClick={() => setPending({ user: u, action: "lock" })}><Lock className="size-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-info active:bg-info/10" title="Unlock" onClick={() => setPending({ user: u, action: "unlock" })}><Unlock className="size-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total</span>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs flex-1 sm:flex-none"><ChevronLeft className="size-3.5 mr-1" />Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="h-8 text-xs flex-1 sm:flex-none">Next<ChevronRight className="size-3.5 ml-1" /></Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={open => !open && setPending(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? ACTION_META[pending.action].label : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && ACTION_META[pending.action].desc}
              {pending && <span className="block mt-2">User: <strong className="text-foreground">{pending.user.name}</strong> ({pending.user.email})</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={isSubmitting} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} className={cn("w-full sm:w-auto", pending && ACTION_META[pending.action].destructive && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")} onClick={e => { e.preventDefault(); handleConfirm(); }}>
              {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
