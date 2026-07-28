import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/about")({
  head: () => ({
    meta: [{ title: "About & Policies — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="About & Policies"
      description="Platform documentation including Terms of Service, Privacy Policy, Data Processing Agreement, SLA commitments, and compliance certifications."
      icon={ScrollText}
      features={[
        "Terms of Service",
        "Privacy Policy and data handling",
        "Data Processing Agreement (DPA)",
        "Service Level Agreement (SLA)",
        "Cookie policy and preferences",
        "Compliance certifications (ISO, GDPR)",
      ]}
    />
  ),
});
