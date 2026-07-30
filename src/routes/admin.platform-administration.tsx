import { createFileRoute } from "@tanstack/react-router";
import { PlatformAdminOverviewPage } from "@/components/admin/platform-admin-overview/platform-admin-overview-page";

export const Route = createFileRoute("/admin/platform-administration")({
  head: () => ({ meta: [{ title: "Platform Administration — GreenGuard AI" }] }),
  component: PlatformAdminOverviewPage,
});
