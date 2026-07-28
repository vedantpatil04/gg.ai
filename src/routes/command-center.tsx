import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, Suspense, lazy } from "react";
import {
  Shield,
  Globe,
  TrendingUp,
  ClipboardList,
  Radar,
  Zap,
  BookOpen,
  Loader2,
  AlertTriangle,
  FileBarChart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute, AUTHORITY_ROLES } from "@/components/protected-route";
import { CommandCenterLayout } from "@/components/command-center/CommandCenterLayout";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { CommandCenterNavigation } from "@/components/command-center/CommandCenterNavigation";
import { QuickActions } from "@/components/command-center/QuickActions";

// Lazy-load each tab component for performance & code splitting
const ExecutiveOverview = lazy(() =>
  import("@/components/command-center/executive-overview").then((m) => ({
    default: m.ExecutiveOverview,
  })),
);
const CityIntelligence = lazy(() =>
  import("@/components/command-center/city-intelligence").then((m) => ({
    default: m.CityIntelligence,
  })),
);
const TrendIntelligence = lazy(() =>
  import("@/components/command-center/trend-intelligence").then((m) => ({
    default: m.TrendIntelligence,
  })),
);
const ComplaintIntelligence = lazy(() =>
  import("@/components/command-center/complaint-intelligence").then((m) => ({
    default: m.ComplaintIntelligence,
  })),
);
const EnvironmentalIntelligence = lazy(() =>
  import("@/components/command-center/environmental-intelligence").then((m) => ({
    default: m.EnvironmentalIntelligence,
  })),
);
const AuthorityActions = lazy(() =>
  import("@/components/command-center/authority-actions").then((m) => ({
    default: m.AuthorityActions,
  })),
);
const ExecutiveReports = lazy(() =>
  import("@/components/command-center/executive-reports").then((m) => ({
    default: m.ExecutiveReports,
  })),
);

export const Route = createFileRoute("/command-center")({
  component: CommandCenterPage,
});

/**
 * Single source of truth for Mission Control module navigation.
 * No duplicate concepts (Overview/Executive/Dashboard combined into Mission Control landing).
 */
const TOP_TABS = [
  {
    id: "overview",
    label: "Mission Control",
    subtitle: "Operations HQ",
    icon: Shield,
    subTabs: [
      { id: "overview", label: "Mission Control", icon: Shield, Component: ExecutiveOverview },
    ],
  },
  {
    id: "work-queue",
    label: "Work Queue",
    subtitle: "Complaint Operations",
    icon: ClipboardList,
    subTabs: [
      {
        id: "complaints",
        label: "Work Queue",
        icon: ClipboardList,
        Component: ComplaintIntelligence,
      },
    ],
  },
  {
    id: "environmental",
    label: "Environmental Monitoring",
    subtitle: "Live Intelligence",
    icon: Radar,
    subTabs: [
      { id: "city", label: "City Intelligence", icon: Globe, Component: CityIntelligence },
      {
        id: "environmental",
        label: "Environmental Intelligence",
        icon: Radar,
        Component: EnvironmentalIntelligence,
      },
      { id: "actions", label: "Authority Actions", icon: Zap, Component: AuthorityActions },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    subtitle: "Insights & Trends",
    icon: TrendingUp,
    subTabs: [
      { id: "trends", label: "Trend Intelligence", icon: TrendingUp, Component: TrendIntelligence },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "Reporting & Export",
    icon: BookOpen,
    subTabs: [
      { id: "reports", label: "Executive Reports", icon: BookOpen, Component: ExecutiveReports },
    ],
  },
] as const;

type TopTabId = (typeof TOP_TABS)[number]["id"];

const QUICK_ACTIONS_CONFIG: {
  label: string;
  icon: typeof ClipboardList;
  top: TopTabId;
  sub?: string;
}[] = [
  { label: "Open Work Queue", icon: ClipboardList, top: "work-queue" },
  { label: "View Critical Alerts", icon: AlertTriangle, top: "overview" },
  {
    label: "Open Environmental Monitoring",
    icon: Radar,
    top: "environmental",
    sub: "environmental",
  },
  { label: "Generate Executive Report", icon: FileBarChart, top: "reports" },
];

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="size-6 animate-spin text-emerald-500" />
      <span className="ml-2 text-xs font-medium text-muted-foreground">
        Loading Mission Control module…
      </span>
    </div>
  );
}

function CommandCenterPage() {
  return (
    <ProtectedRoute roles={AUTHORITY_ROLES}>
      <CommandCenterContent />
    </ProtectedRoute>
  );
}

function CommandCenterContent() {
  const { user } = useAuth();
  const [activeTop, setActiveTop] = useState<TopTabId>("overview");
  const [activeSub, setActiveSub] = useState<string>("overview");

  const activeTopTab = TOP_TABS.find((t) => t.id === activeTop) ?? TOP_TABS[0];

  useEffect(() => {
    setActiveSub(activeTopTab.subTabs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTop]);

  const ActiveComponent = (
    activeTopTab.subTabs.find((s) => s.id === activeSub) ?? activeTopTab.subTabs[0]
  ).Component;

  if (!user) return null;

  const roleLabel = user.role === "administrator" ? "Administrator" : "Authority";

  const quickActions = QUICK_ACTIONS_CONFIG.map((qa) => ({
    label: qa.label,
    icon: qa.icon,
    onClick: () => {
      setActiveTop(qa.top);
      if (qa.sub) setActiveSub(qa.sub);
    },
  }));

  const navTopTabs = TOP_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    subtitle: t.subtitle,
    icon: t.icon,
  }));

  return (
    <CommandCenterLayout
      header={
        <CommandCenterHeader
          roleLabel={roleLabel}
          activeTitle={activeTopTab.label}
          topTabs={navTopTabs}
          activeTop={activeTop}
          onTopChange={(id) => setActiveTop(id as TopTabId)}
        />
      }
      navigation={
        <CommandCenterNavigation
          topTabs={navTopTabs}
          activeTop={activeTop}
          onTopChange={(id) => setActiveTop(id as TopTabId)}
          subTabs={activeTopTab.subTabs.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
          activeSub={activeSub}
          onSubChange={setActiveSub}
        />
      }
      quickActions={activeTop === "overview" ? <QuickActions actions={quickActions} /> : undefined}
    >
      <Suspense fallback={<TabFallback />}>
        <ActiveComponent />
      </Suspense>
    </CommandCenterLayout>
  );
}
