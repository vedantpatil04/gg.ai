import { createFileRoute } from "@tanstack/react-router";
import { AuthorityDirectoryPage } from "@/components/admin/authority-directory/authority-directory-page";

export const Route = createFileRoute("/admin/authority-management")({
  head: () => ({ meta: [{ title: "Authority Management — GreenGuard AI" }] }),
  component: AuthorityDirectoryPage,
});
