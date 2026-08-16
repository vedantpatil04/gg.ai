import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GreenActionsPage } from "@/components/green-actions/green-actions-page";

export const Route = createFileRoute("/green-actions")({
  head: () => ({ meta: [{ title: "Green Actions — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <GreenActionsPage />
    </AppLayout>
  ),
});
