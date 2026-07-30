import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { CitizenHubPage } from "@/components/citizen/citizen-hub-page";

export const Route = createFileRoute("/citizen")({
  head: () => ({ meta: [{ title: "Citizen Hub — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <CitizenHubPage />
    </AppLayout>
  ),
});
