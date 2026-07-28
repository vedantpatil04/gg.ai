import { useState, type ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

/**
 * Administrator shell — persistent sidebar, top header, and a content
 * outlet. Every future administrator page should only need:
 *
 *   <AdminLayout>
 *     <PageContent />
 *   </AdminLayout>
 *
 * Structurally mirrors AppLayout (same positioning, breakpoints, and
 * collapse/drawer mechanics) so it reads as the same product, while keeping
 * its own nav model — the Administrator sidebar has an entirely different
 * set of modules from the Citizen/Authority one in AppLayout, so the two
 * are intentionally separate components rather than one shared, harder to
 * reason about mega-layout.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile backdrop — closes the drawer on outside tap */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuClick={() => setMobileOpen((o) => !o)} mobileOpen={mobileOpen} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
