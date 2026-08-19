import { useState } from "react";
import { RefreshCw, Users as UsersIcon, User, ShieldCheck, Crown, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui-bits";
import { UserDirectoryList } from "./user-directory-list";
import { UserDetailPanel } from "./user-detail-panel";
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";

const ROLE_TABS: { value: DirectoryRole | "all"; label: string; icon: typeof UsersIcon }[] = [
  { value: "all", label: "All", icon: UsersIcon },
  { value: "citizen", label: "Citizens", icon: User },
  { value: "authority", label: "Authorities", icon: ShieldCheck },
  { value: "administrator", label: "Administrators", icon: Crown },
];

const STATUS_FILTERS: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function UserDirectoryPage() {
  const [role, setRole] = useState<DirectoryRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<DirectoryUser | null>(null);

  const qc = useQueryClient();

  const isActive = statusFilter === "all" ? undefined : statusFilter === "active";
  // Search has no backend support (see user-directory-queries.ts) — pull a
  // bigger page to search over instead of just the 20 currently on screen.
  const limit = searchTerm.trim() ? 100 : 20;

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Administration"
        title="User Directory"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-users-directory"] })}
            className="h-8 text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Role tabs */}
        <div className="overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max border border-border">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setRole(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  role === tab.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active/Inactive filter */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border shrink-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === f.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:flex-none min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or email..."
              className="pl-8 h-9 w-full sm:w-56 text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        <UserDirectoryList
          role={role === "all" ? undefined : role}
          isActive={isActive}
          page={page}
          limit={limit}
          searchTerm={searchTerm}
          onPageChange={setPage}
          onSelect={setSelected}
        />
      </div>

      <UserDetailPanel user={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
