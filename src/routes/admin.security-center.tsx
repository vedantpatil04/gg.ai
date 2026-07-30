import { createFileRoute } from "@tanstack/react-router";
import { SecurityCenterPage } from "@/components/admin/security-center/security-center-page";

export const Route = createFileRoute("/admin/security-center")({
  head: () => ({ meta: [{ title: "Security Center — GreenGuard AI" }] }),
  component: SecurityCenterPage,
});
