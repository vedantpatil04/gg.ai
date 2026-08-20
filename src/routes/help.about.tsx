import { createFileRoute } from "@tanstack/react-router";
import { AboutPoliciesPage } from "@/components/help-center/about/about-policies-page";

export const Route = createFileRoute("/help/about")({
  head: () => ({
    meta: [{ title: "About & Policies — GreenGuard Help" }],
  }),
  component: AboutPoliciesPage,
});
