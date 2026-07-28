import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { SecurityCenter } from "@/components/settings/security-center";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [{ title: "Security Center — GreenGuard AI" }],
  }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <SecurityPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});

function SecurityPage() {
  return <SecurityCenter />;
}
