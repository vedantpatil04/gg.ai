import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/whats-new")({
  head: () => ({
    meta: [{ title: "What's New — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="What's New"
      description="Stay up to date with the latest GreenGuard releases — new features, improvements, deprecations, and the roadmap for what's coming next."
      icon={Sparkles}
      features={[
        "Versioned release notes with screenshots",
        "Feature highlights and video demos",
        "Breaking changes and migration guides",
        "Public product roadmap",
        "Vote on upcoming features",
        "Subscribe to release notifications",
      ]}
    />
  ),
});
