import { createFileRoute } from "@tanstack/react-router";
import { MessageSquarePlus } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/feedback")({
  head: () => ({
    meta: [{ title: "Feedback — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="Feedback"
      description="Share your thoughts on the platform, rate specific features, and help our team prioritize improvements that matter most to you."
      icon={MessageSquarePlus}
      features={[
        "Feature-specific feedback forms",
        "NPS and satisfaction surveys",
        "Bug reporting with screenshot attachment",
        "Public feedback board with upvoting",
        "Feature request submissions",
        "Feedback status tracking",
      ]}
    />
  ),
});
