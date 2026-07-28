import { createFileRoute } from "@tanstack/react-router";
import { HelpCenterPage } from "@/components/help-center/help-center-page";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [{ title: "Help Center — GreenGuard AI" }],
  }),
  component: HelpCenterPage,
});
