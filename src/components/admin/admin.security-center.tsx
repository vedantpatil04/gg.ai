import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { SecurityCenterPage } from "@/components/admin/security-center/security-center-page";

export const Route = createFileRoute("/admin/security-center")({
  head: () => ({ meta: [{ title: "Security Center — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute allowedRoles={["administrator"]}>
        <SecurityCenterPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
