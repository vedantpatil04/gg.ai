import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { EnterpriseProfilePage } from "@/components/profile/enterprise-profile-page";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <EnterpriseProfilePage />
      </ProtectedRoute>
    </AppLayout>
  ),
});
