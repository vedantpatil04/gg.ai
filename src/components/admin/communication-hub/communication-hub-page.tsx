import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Ticket, Bug, Lightbulb, MessageCircle, AlertTriangle, Bell, RefreshCw, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCommOverview } from "./communication-hub-queries";
import { CommunicationOverviewPanel } from "./overview-panel";
import { CommunicationTypePanel } from "./communication-list";
import { EmergencyPanel } from "./emergency-panel";
import { CommunicationNotificationsPanel } from "./notifications-panel";
import type { CommTypeKey } from "@/lib/api/communication-hub.api";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = "overview" | "tickets" | "bugs" | "features" | "feedback" | "emergency" | "notifications";

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: "overview",      label: "Overview",         icon: LayoutDashboard, description: "What's new, open, and needs attention" },
  { id: "tickets",       label: "Tickets",          icon: Ticket,          description: "General support requests" },
  { id: "bugs",          label: "Bug Reports",      icon: Bug,             description: "Technical problem reports" },
  { id: "features",      label: "Feature Requests", icon: Lightbulb,       description: "Product & functionality suggestions" },
  { id: "feedback",      label: "Feedback",         icon: MessageCircle,   description: "General user feedback" },
  { id: "emergency",     label: "Emergency",        icon: AlertTriangle,   description: "Broadcast alerts to users" },
  { id: "notifications", label: "Notifications",    icon: Bell,            description: "Incoming communication events" },
];

const TAB_TO_TYPE: Partial<Record<TabId, CommTypeKey>> = {
  tickets: "tickets", bugs: "bugs", features: "features", feedback: "feedback",
};
const TYPE_TO_TAB: Record<CommTypeKey, TabId> = {
  tickets: "tickets", bugs: "bugs", features: "features", feedback: "feedback",
};

// ─── Sidebar / mobile tab bar (mirrors Platform Administration's pattern) ─────

function SideNav({ active, onChange, unreadByTab }: { active: TabId; onChange: (t: TabId) => void; unreadByTab: Partial<Record<TabId, number>> }) {
  return (
    <nav className="hidden lg:flex flex-col gap-1 w-56 shrink-0">
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium leading-none">{label}</span>
              {!!unreadByTab[id] && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  {unreadByTab[id]}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{description}</div>
          </div>
        </button>
      ))}
    </nav>
  );
}

function MobileTabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
            active === id ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70",
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
  overview: "Communication Overview",
  tickets: "Support Tickets",
  bugs: "Bug Reports",
  features: "Feature Requests",
  feedback: "Feedback",
  emergency: "Emergency Broadcast",
  notifications: "Notifications",
};

export function CommunicationHubPage() {
  // Deep-link support for header-bell / overview notifications, e.g.
  // /admin/communication?tab=tickets&id=<ticketId>
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialTabParam = initialParams.get("tab");
  const initialTab: TabId = (TABS.some(t => t.id === initialTabParam) ? initialTabParam : "overview") as TabId;

  const [tab, setTab] = useState<TabId>(initialTab);
  const [deepLinkId, setDeepLinkId] = useState<string | null>(initialParams.get("id"));
  const qc = useQueryClient();
  const { data: overview } = useCommOverview();

  function jumpTo(type: CommTypeKey, id: string) {
    setTab(TYPE_TO_TAB[type]);
    setDeepLinkId(id || null);
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["comm-hub"] });
  }

  const unreadByTab: Partial<Record<TabId, number>> = {};
  if (overview) {
    for (const t of overview.byType) unreadByTab[TYPE_TO_TAB[t.type]] = t.unread;
  }

  const activeType = TAB_TO_TYPE[tab];

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-[1600px] mx-auto">
      <SectionTitle
        eyebrow="Engagement"
        title="Administrator Communication Hub"
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              Administrator Only
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <MobileTabBar active={tab} onChange={setTab} />

      <div className="flex gap-6 items-start">
        <SideNav active={tab} onChange={setTab} unreadByTab={unreadByTab} />

        <div className="flex-1 min-w-0">
          <Panel eyebrow={TABS.find(t => t.id === tab)?.description ?? ""} title={TAB_TITLES[tab]}>
            {tab === "overview" && <CommunicationOverviewPanel onJumpTo={jumpTo} />}
            {activeType && (
              <CommunicationTypePanel
                key={activeType}
                type={activeType}
                initialSelectedId={deepLinkId}
                typeLabel={TABS.find(t => t.id === tab)?.label ?? ""}
              />
            )}
            {tab === "emergency" && <EmergencyPanel />}
            {tab === "notifications" && <CommunicationNotificationsPanel onJumpTo={jumpTo} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
