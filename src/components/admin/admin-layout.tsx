import { useState, useEffect, useCallback, type ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

const SIDEBAR_COLLAPSED_KEY = "gg-admin-sidebar-collapsed";

/**
 * Administrator shell — persistent full-height sidebar, top header, and an
 * independently scrollable content area. Every administrator page renders
 * through this layout.
 *
 * Core layout guarantees:
 * - Desktop: fixed viewport height shell (`h-screen h-[100dvh] overflow-hidden`)
 * - Main content scrolling never causes the sidebar to shift or move
 * - Sidebar scrolling is completely isolated to the sidebar navigation
 * - No double scrollbars
 * - Mobile: animated slide-over drawer with backdrop blur and scroll lock
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when inside inputs or textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

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
    <div className="h-screen h-[100dvh] flex w-full max-w-full overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Sidebar: persistent on desktop, off-canvas drawer on mobile */}
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile backdrop — closes the drawer on outside tap */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Content column: header + independent scrollable main */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-w-full overflow-hidden">
        <AdminHeader onMenuClick={() => setMobileOpen((o) => !o)} mobileOpen={mobileOpen} />
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

