import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { CityManagementPage } from "@/components/admin/city-management/city-management-page";

export const Route = createFileRoute("/admin/city-management")({
  head: () => ({ meta: [{ title: "City Management — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <CityManagementPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
