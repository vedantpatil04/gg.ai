import { createFileRoute } from "@tanstack/react-router";
import { CityManagementPage } from "@/components/admin/city-mangement/city-management-page";

export const Route = createFileRoute("/admin/city-management")({
  head: () => ({ meta: [{ title: "City Management — GreenGuard AI" }] }),
  component: CityManagementPage,
});
