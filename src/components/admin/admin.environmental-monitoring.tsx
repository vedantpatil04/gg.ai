import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { EnvironmentalMonitoringPage } from "@/components/admin/environmental-monitoring/environmental-monitoring-page";

export const Route = createFileRoute("/admin/environmental-monitoring")({
  head: () => ({ meta: [{ title: "Environmental Monitoring — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <EnvironmentalMonitoringPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
