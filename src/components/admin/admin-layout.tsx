import { useState, useEffect, type ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

/**
 * Administrator shell — persistent sidebar, top header, and a content
 * outlet. Every administrator page renders through this layout.
 *
 * Structurally mirrors AppLayout with mobile navigation drawer, backdrop blur,
 * body scroll lock on open, and responsive horizontal overflow prevention.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-background text-foreground">
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
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <AdminHeader onMenuClick={() => setMobileOpen((o) => !o)} mobileOpen={mobileOpen} />
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
