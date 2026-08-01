import { createFileRoute } from "@tanstack/react-router";
import { SupportCenterPage } from "@/components/help-center/support/support-page";

export const Route = createFileRoute("/help/support")({
  head: () => ({
    meta: [{ title: "Support Center — GreenGuard Help" }],
  }),
  component: SupportCenterPage,
});
