import { createFileRoute } from "@tanstack/react-router";
import { CityDirectoryPage } from "@/components/admin/city-directory/city-directory-page";

export const Route = createFileRoute("/admin/cities")({
  head: () => ({ meta: [{ title: "City Directory — GreenGuard AI" }] }),
  component: CityDirectoryPage,
});
