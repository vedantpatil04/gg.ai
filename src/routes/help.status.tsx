import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/status")({
  head: () => ({
    meta: [{ title: "System Status — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="System Status"
      description="Real-time platform health dashboard showing service uptime, API performance, sensor network status, and ongoing incident reports."
      icon={Activity}
      features={[
        "Live service uptime indicators",
        "API response time monitoring",
        "Sensor network connectivity status",
        "Incident history and postmortems",
        "Scheduled maintenance announcements",
        "Subscribe to status email/SMS alerts",
      ]}
    />
  ),
});
