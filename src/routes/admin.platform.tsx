import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { PlatformAdminPage } from "@/components/admin/platform-admin/platform-admin-page";

export const Route = createFileRoute("/admin/platform")({
  head: () => ({ meta: [{ title: "Platform Administration — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <PlatformAdminPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
