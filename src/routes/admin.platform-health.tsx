import { createFileRoute } from "@tanstack/react-router";
import { PlatformHealthPage } from "@/components/admin/platform-health/platform-health-page";

export const Route = createFileRoute("/admin/platform-health")({
  head: () => ({ meta: [{ title: "Platform Health — GreenGuard AI" }] }),
  component: PlatformHealthPage,
});
