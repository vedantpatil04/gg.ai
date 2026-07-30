import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { AnalyticsCenterPage } from "@/components/admin/analytics-center/analytics-center-page";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <AnalyticsCenterPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
