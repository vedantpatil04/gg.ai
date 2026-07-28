import { createFileRoute } from "@tanstack/react-router";
import { AuthorityDirectoryPage } from "@/components/admin/authority-directory/authority-directory-page";

export const Route = createFileRoute("/admin/authorities")({
  head: () => ({ meta: [{ title: "Authority Directory — GreenGuard AI" }] }),
  component: AuthorityDirectoryPage,
});
