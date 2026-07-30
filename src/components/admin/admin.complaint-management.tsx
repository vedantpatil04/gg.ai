import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ComplaintManagementPage } from "@/components/admin/complaint-management/complaint-management-page";

export const Route = createFileRoute("/admin/complaint-management")({
  head: () => ({ meta: [{ title: "Complaint Management — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <ComplaintManagementPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
