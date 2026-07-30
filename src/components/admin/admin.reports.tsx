import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ReportsCenterPage } from "@/components/admin/reports-center/reports-center-page";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <ReportsCenterPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
