import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Building2,
  ScrollText,
  Server,
  Settings,
  RefreshCw,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { PlatformExecutiveDashboard } from "./executive-dashboard";
import { UserManagement } from "./user-management";
import { CityManagement } from "./city-management";
import { AuditCenter } from "./audit-center";
import { SystemHealthPanel } from "./system-health";
import { PlatformConfigView } from "./platform-config";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId =
  | "dashboard"
  | "users"
  | "cities"
  | "audit"
  | "health"
  | "config";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "dashboard",
    label: "Executive",
    icon: LayoutDashboard,
    description: "Operational overview and insights",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    description: "Manage all platform users",
  },
  {
    id: "cities",
    label: "Cities",
    icon: Building2,
    description: "Manage monitored cities",
  },
  {
    id: "audit",
    label: "Audit",
    icon: ScrollText,
    description: "Administrative action log",
  },
  {
    id: "health",
    label: "Health",
    icon: Server,
    description: "System and service status",
  },
  {
    id: "config",
    label: "Config",
    icon: Settings,
    description: "Platform configuration",
  },
];

// ─── Sidebar nav (desktop) ────────────────────────────────────────────────────

function SideNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <nav className="hidden lg:flex flex-col gap-1 w-52 shrink-0">
      {TABS.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all",
            active === id
              ? "bg-primary/8 border border-primary/20 text-primary"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent",
          )}
        >
          <Icon className="size-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-none">{label}</div>
            <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
              {description}
            </div>
          </div>
        </button>
      ))}
    </nav>
  );
}

// ─── Mobile tab bar ───────────────────────────────────────────────────────────

function MobileTabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
            active === id
              ? "bg-primary text-primary-foreground"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TAB_TITLES: Record<TabId, string> = {
  dashboard: "Executive Dashboard",
  users: "User Management",
  cities: "City Management",
  audit: "Audit Center",
  health: "Platform Health",
  config: "Platform Configuration",
};

export function PlatformAdminPage() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const qc = useQueryClient();

  function refresh() {
    qc.invalidateQueries({ queryKey: ["p6-executive-dashboard"] });
    qc.invalidateQueries({ queryKey: ["p6-users"] });
    qc.invalidateQueries({ queryKey: ["p6-cities"] });
    qc.invalidateQueries({ queryKey: ["p6-audit"] });
    qc.invalidateQueries({ queryKey: ["p6-system-health"] });
    qc.invalidateQueries({ queryKey: ["p6-config"] });
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-[1600px] mx-auto">
      {/* ── Page header ── */}
      <SectionTitle
        eyebrow="Administration"
        title="Enterprise Platform Administration"
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              Administrator Only
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Mobile tab bar ── */}
      <MobileTabBar active={tab} onChange={setTab} />

      {/* ── Split layout: sidebar + content ── */}
      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <SideNav active={tab} onChange={setTab} />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <Panel
            eyebrow={
              TABS.find((t) => t.id === tab)?.description ?? ""
            }
            title={TAB_TITLES[tab]}
          >
            {tab === "dashboard" && <PlatformExecutiveDashboard />}
            {tab === "users" && <UserManagement />}
            {tab === "cities" && <CityManagement />}
            {tab === "audit" && <AuditCenter />}
            {tab === "health" && <SystemHealthPanel />}
            {tab === "config" && <PlatformConfigView />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
