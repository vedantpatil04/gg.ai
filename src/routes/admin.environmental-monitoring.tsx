import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentalMonitoringPage } from "@/components/admin/environmental-monitoring/environmental-monitoring-page";

export const Route = createFileRoute("/admin/environmental-monitoring")({
  head: () => ({ meta: [{ title: "Environmental Monitoring — GreenGuard AI" }] }),
  component: EnvironmentalMonitoringPage,
});
