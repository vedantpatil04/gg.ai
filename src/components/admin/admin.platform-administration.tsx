import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { PlatformAdminOverviewPage } from "@/components/admin/platform-admin-overview/platform-admin-overview-page";

export const Route = createFileRoute("/admin/platform-administration")({
  head: () => ({ meta: [{ title: "Platform Administration — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <PlatformAdminOverviewPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
