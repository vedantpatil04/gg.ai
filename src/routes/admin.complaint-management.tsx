import { createFileRoute } from "@tanstack/react-router";
import { ComplaintManagementPage } from "@/components/admin/complaint-mangement/complaint-management-page";

export const Route = createFileRoute("/admin/complaint-management")({
  head: () => ({ meta: [{ title: "Complaint Management — GreenGuard AI" }] }),
  component: ComplaintManagementPage,
});
