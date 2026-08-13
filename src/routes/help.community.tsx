import { createFileRoute } from "@tanstack/react-router";
import { CommunityPage } from "@/components/help-center/community/community-page";

export const Route = createFileRoute("/help/community")({
  head: () => ({
    meta: [{ title: "Community — GreenGuard Help" }],
  }),
  component: CommunityPage,
});
