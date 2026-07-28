import { createFileRoute } from "@tanstack/react-router";
import { ComplaintGovernancePage } from "@/components/admin/complaint-governance/complaint-governance-page";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({ meta: [{ title: "Complaint Queue — GreenGuard AI" }] }),
  component: ComplaintGovernancePage,
});
