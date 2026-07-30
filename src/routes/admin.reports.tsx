import { createFileRoute } from "@tanstack/react-router";
import { ReportsCenterPage } from "@/components/admin/reports-center/reports-center-page";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — GreenGuard AI" }] }),
  component: ReportsCenterPage,
});
