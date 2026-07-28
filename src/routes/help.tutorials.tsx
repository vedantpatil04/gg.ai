import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { HelpComingSoonPage } from "@/components/help-center/help-coming-soon-page";

export const Route = createFileRoute("/help/tutorials")({
  head: () => ({
    meta: [{ title: "Tutorials & Guides — GreenGuard Help" }],
  }),
  component: () => (
    <HelpComingSoonPage
      title="Tutorials & Guides"
      description="Step-by-step video tutorials, interactive walkthroughs, and structured learning paths to master every GreenGuard workflow."
      icon={GraduationCap}
      features={[
        "Video tutorials with timestamps",
        "Interactive step-by-step walkthroughs",
        "Role-specific learning paths",
        "Beginner, intermediate, and advanced tracks",
        "Progress tracking and completion badges",
        "Downloadable cheat sheets and quick references",
      ]}
    />
  ),
});
