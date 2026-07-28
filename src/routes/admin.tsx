import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ProtectedRoute } from "@/components/protected-route";

/**
 * Layout route for the whole /admin/* tree (Phase 2.3). AdminLayout and
 * ProtectedRoute are instantiated once here, not per-page — every admin
 * page (dashboard, authority-requests, and whatever future pages join
 * them) renders through this single Outlet. This also means sidebar
 * collapse/mobile-drawer state now survives navigating between admin
 * pages, instead of resetting on every route change as it would if each
 * page created its own <AdminLayout>.
 */
export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminLayout>
      <ProtectedRoute roles={["administrator"]}>
        <Outlet />
      </ProtectedRoute>
    </AdminLayout>
  ),
});
