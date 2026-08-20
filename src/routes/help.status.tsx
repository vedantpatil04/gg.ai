import { createFileRoute } from "@tanstack/react-router";
import { SystemStatusPage } from "@/components/help-center/status/status-page";

export const Route = createFileRoute("/help/status")({
  head: () => ({
    meta: [{ title: "System Status — GreenGuard Help" }],
  }),
  component: SystemStatusPage,
});
