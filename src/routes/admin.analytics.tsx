import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsCenterPage } from "@/components/admin/analytics-center/analytics-center-page";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — GreenGuard AI" }] }),
  component: AnalyticsCenterPage,
});
