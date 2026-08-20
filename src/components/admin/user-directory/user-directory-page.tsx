import { useState } from "react";
import { RefreshCw, Users as UsersIcon, User, ShieldCheck, Crown, Search, X, Filter } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UserDirectoryList } from "./user-directory-list";
import { UserDetailPanel } from "./user-detail-panel";
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";

const ROLE_TABS: { value: DirectoryRole | "all"; label: string; icon: typeof UsersIcon }[] = [
  { value: "all", label: "All Users", icon: UsersIcon },
  { value: "citizen", label: "Citizens", icon: User },
  { value: "authority", label: "Authorities", icon: ShieldCheck },
  { value: "administrator", label: "Administrators", icon: Crown },
];

const STATUS_FILTERS: { value: "all" | "active" | "inactive"; label: string; dotColor?: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active", dotColor: "bg-emerald-500" },
  { value: "inactive", label: "Inactive", dotColor: "bg-muted-foreground/60" },
];

export function UserDirectoryPage() {
  const [role, setRole] = useState<DirectoryRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<DirectoryUser | null>(null);

  const qc = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["admin-users-directory"] }) > 0;

  const isActive = statusFilter === "all" ? undefined : statusFilter === "active";
  const limit = searchTerm.trim() ? 100 : 20;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users-directory"] });
  };

  const handleClearFilters = () => {
    setRole("all");
    setStatusFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  const hasActiveFilters = role !== "all" || statusFilter !== "all" || searchTerm.trim().length > 0;

  return (
    <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      {/* ── 1. PAGE HEADER ────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Identity & Access Governance
            </span>
            <span>&middot;</span>
            <span>Admin Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
            User Directory
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-2xl leading-relaxed">
            Search, filter, and inspect registered citizens, authority personnel, and administrators across the GreenGuard AI network.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8.5 text-xs font-medium border-border/70 hover:border-border hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5 text-primary", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing..." : "Sync Directory"}</span>
          </Button>
        </div>
      </section>

      {/* ── 2. FILTER & CONTROLS TOOLBAR ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          {/* Role / Category Tabs */}
          <div className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-max border border-border/60">
              {ROLE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = role === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setRole(tab.value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap outline-none select-none cursor-pointer",
                      "focus-visible:ring-1 focus-visible:ring-primary",
                      isSelected
                        ? "bg-card text-foreground shadow-xs border border-border/50 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    <Icon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Status Filter + Search Field */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
            {/* Account Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/50 shrink-0 self-start sm:self-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 px-2 select-none">
                Status
              </span>
              {STATUS_FILTERS.map((f) => {
                const isSelected = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(f.value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all select-none cursor-pointer outline-none",
                      "focus-visible:ring-1 focus-visible:ring-primary",
                      isSelected
                        ? "bg-card text-foreground shadow-2xs border border-border/40 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {f.dotColor && <span className={cn("size-1.5 rounded-full", f.dotColor)} />}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/80 pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email..."
                className="pl-8 pr-7 h-9 text-xs sm:text-sm bg-card/60 border-border/60 focus-visible:border-primary/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground grid place-items-center cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. USER DIRECTORY LIST / TABLE CONTAINER ────────────────────── */}
      <section className="rounded-2xl border border-border/70 bg-card/60 shadow-2xs overflow-hidden">
        <UserDirectoryList
          role={role === "all" ? undefined : role}
          isActive={isActive}
          page={page}
          limit={limit}
          searchTerm={searchTerm}
          onPageChange={setPage}
          onSelect={setSelected}
          onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
        />
      </section>

      {/* ── 4. USER DETAIL SLIDE-OVER DRAWER ────────────────────────────── */}
      <UserDetailPanel user={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

