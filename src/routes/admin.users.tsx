import { createFileRoute } from "@tanstack/react-router";
import { UserDirectoryPage } from "@/components/admin/user-directory/user-directory-page";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Directory — GreenGuard AI" }] }),
  component: UserDirectoryPage,
});
