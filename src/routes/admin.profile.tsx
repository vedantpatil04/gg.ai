import { createFileRoute } from "@tanstack/react-router";
import { AdminProfilePage } from "@/components/admin/profile/admin-profile-page";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Profile & Settings — GreenGuard AI" }] }),
  component: AdminProfilePage,
});
