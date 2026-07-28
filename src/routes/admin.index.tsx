import { createFileRoute } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { AdminDashboardContainer } from "@/components/admin/admin-dashboard-container";
import { AdminPlatformStats } from "@/components/admin/admin-platform-stats";
import { AdminEnvironmentalIntelligence } from "@/components/admin/admin-environmental-intelligence";
import { AdminComplaintSummary } from "@/components/admin/admin-complaint-summary";
import { AdminAuthorityOverview } from "@/components/admin/admin-authority-overview";
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminSystemHealth } from "@/components/admin/admin-system-health";
import { useRefreshAdminDashboard } from "@/components/admin/admin-dashboard-queries";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administrator Portal — GreenGuard AI" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const refresh = useRefreshAdminDashboard();
  const isFetching = useIsFetching() > 0;

  return (
    <AdminDashboardContainer
      statsCards={<AdminPlatformStats />}
      environmentalIntelligence={<AdminEnvironmentalIntelligence />}
      complaintSummary={<AdminComplaintSummary />}
      authorityOverview={<AdminAuthorityOverview />}
      recentActivity={<AdminRecentActivity />}
      quickActions={<AdminQuickActions />}
      systemStatus={<AdminSystemHealth />}
      onRefresh={refresh}
      isRefreshing={isFetching}
    />
  );
}
