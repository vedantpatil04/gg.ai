import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/community")({
  head: () => ({
    meta: [{ title: "Community — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="Community"
      description="Connect with other GreenGuard users, share environmental insights, ask questions, and learn from experts across the platform's growing community."
      icon={Users}
      features={[
        "Discussion forums by topic and role",
        "Community Q&A with expert answers",
        "Environmental data sharing",
        "City-specific discussion threads",
        "User reputation and badges",
        "Community events and webinars",
      ]}
    />
  ),
});
