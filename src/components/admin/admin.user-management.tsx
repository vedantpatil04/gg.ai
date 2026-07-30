import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { UserManagementPage } from "@/components/admin/user-management/user-management-page";

export const Route = createFileRoute("/admin/user-management")({
  head: () => ({ meta: [{ title: "User Management — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <UserManagementPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
