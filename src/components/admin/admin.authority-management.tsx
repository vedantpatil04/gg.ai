import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthorityDirectoryPage } from "@/components/admin/authority-directory/authority-directory-page";

export const Route = createFileRoute("/admin/authority-management")({
  head: () => ({ meta: [{ title: "Authority Management — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <AuthorityDirectoryPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
