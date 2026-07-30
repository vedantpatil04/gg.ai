import { createFileRoute } from "@tanstack/react-router";
import { PlatformSettingsPage } from "@/components/admin/platform-settings/platform-settings-page";

export const Route = createFileRoute("/admin/platform-settings")({
  head: () => ({ meta: [{ title: "Platform Settings — GreenGuard AI" }] }),
  component: PlatformSettingsPage,
});
