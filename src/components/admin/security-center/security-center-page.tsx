import { useState } from "react";
import { format } from "date-fns";
import {
  Shield, Search, X, Filter, ChevronLeft, ChevronRight, Lock, Unlock,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2,
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
  usePlatformUsers, useLockPlatformUser, useUnlockPlatformUser,
  type PlatformUser,
} from "../platform-admin-api";

type SecurityStatus = "all" | "verified" | "unverified" | "locked";

function SecurityBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-[10px] font-medium", ok ? "text-success" : "text-muted-foreground")}>
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </div>
  );
}

export function SecurityCenterPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [secFilter, setSecFilter] = useState<SecurityStatus>("all");
  const [pending, setPending] = useState<{ user: PlatformUser; action: "lock" | "unlock" } | null>(null);

  const qc = useQueryClient();
  const lockUser = useLockPlatformUser();
  const unlockUser = useUnlockPlatformUser();
  const isSubmitting = lockUser.isPending || unlockUser.isPending;

  const { data, isLoading, isError } = usePlatformUsers({
    page,
    limit: 25,
    search: search || undefined,
    isVerified: secFilter === "verified" ? true : secFilter === "unverified" ? false : undefined,
    sortBy: "lastLogin",
    sortDir: "desc",
  });

  const users = data?.users ?? [];

  function handleConfirm() {
    if (!pending) return;
    const onSuccess = () => setPending(null);
    if (pending.action === "lock") lockUser.mutate(pending.user._id, { onSuccess });
    else unlockUser.mutate(pending.user._id, { onSuccess });
  }

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Platform"
        title="Security Center"
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
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…" className="pl-8 h-9 text-xs sm:text-sm" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "verified", "unverified"] as SecurityStatus[]).map(s => (
            <button key={s} onClick={() => { setSecFilter(s); setPage(1); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                secFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")}>
              {s === "all" ? "All Users" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-12">Couldn't load security data.</p>
        ) : users.length === 0 ? (
          <EmptyState icon={<Shield className="size-4" />} title="No users found." description="Adjust filters to see users." />
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3 min-w-0 flex-1 w-full sm:w-auto">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{u.name}</span>
                      <Pill tone={u.role === "citizen" ? "info" : u.role === "authority" ? "primary" : "muted"}>{u.role}</Pill>
                      <Pill tone={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Pill>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</div>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-2">
                      <SecurityBadge ok={u.isVerified} label="Email verified" />
                      <SecurityBadge ok={u.isActive} label="Account active" />
                      {u.role === "authority" && (
                        <SecurityBadge ok={u.approvalStatus === "approved"} label="Authority approved" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {u.lastLogin && <span>Last login: {format(new Date(u.lastLogin), "MMM d, yyyy 'at' h:mm a")}</span>}
                      <span>Joined: {format(new Date(u.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-warning" title="Lock account"
                    onClick={() => setPending({ user: u, action: "lock" })}>
                    <Lock className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-success" title="Unlock account"
                    onClick={() => setPending({ user: u, action: "unlock" })}>
                    <Unlock className="size-3.5" />
                  </Button>
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

      <AlertDialog open={!!pending} onOpenChange={o => !o && setPending(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.action === "lock" ? "Lock" : "Unlock"} account?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "lock"
                ? "This will prevent the user from logging in for 24 hours."
                : "This will immediately restore login access."}
              {pending && <span className="block mt-2">User: <strong className="text-foreground">{pending.user.name}</strong></span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={isSubmitting} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting}
              className={cn("w-full sm:w-auto", pending?.action === "lock" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}
              onClick={e => { e.preventDefault(); handleConfirm(); }}>
              {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
