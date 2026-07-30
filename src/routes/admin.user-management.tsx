import { createFileRoute } from "@tanstack/react-router";
import { UserManagementPage } from "@/components/admin/user-management/user-management-page";

export const Route = createFileRoute("/admin/user-management")({
  head: () => ({ meta: [{ title: "User Management — GreenGuard AI" }] }),
  component: UserManagementPage,
});
