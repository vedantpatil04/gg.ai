import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { PlatformSettingsPage } from "@/components/admin/platform-settings/platform-settings-page";

export const Route = createFileRoute("/admin/platform-settings")({
  head: () => ({ meta: [{ title: "Platform Settings — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <PlatformSettingsPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
