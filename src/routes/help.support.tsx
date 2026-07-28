import { createFileRoute } from "@tanstack/react-router";
import { HeadphonesIcon } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/support")({
  head: () => ({
    meta: [{ title: "Support Center — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="Support Center"
      description="Get direct help from our expert support team via ticket, live chat, or scheduled call — with full case history and resolution tracking."
      icon={HeadphonesIcon}
      features={[
        "Support ticket creation and tracking",
        "Live chat with support agents",
        "Scheduled call booking",
        "SLA status and priority indicators",
        "Ticket history and resolution notes",
        "Email notifications for ticket updates",
      ]}
    />
  ),
});
