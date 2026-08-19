import { createFileRoute } from "@tanstack/react-router";
import { CommunicationHubPage } from "@/components/admin/communication-hub/communication-hub-page";

export const Route = createFileRoute("/admin/communication")({
  head: () => ({ meta: [{ title: "Communication Hub — GreenGuard AI" }] }),
  component: CommunicationHubPage,
});
