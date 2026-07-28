import { createFileRoute } from "@tanstack/react-router";
import { AuthorityRequestsPage } from "@/components/admin/authority-requests/authority-requests-page";

export const Route = createFileRoute("/admin/authority-requests")({
  head: () => ({ meta: [{ title: "Authority Requests — GreenGuard AI" }] }),
  component: AuthorityRequestsPage,
});
