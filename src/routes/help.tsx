import { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { HelpCenterLayout } from "@/components/help-center/help-center-layout";
import { HelpSearchBar } from "@/components/help-center/help-search-bar";

/**
 * Layout route for the entire /help/* tree — mirrors the admin.tsx pattern.
 * Renders HelpCenterLayout (sidebar + header) once, shared across all child
 * routes (/help, /help/knowledge-base, /help/tutorials, etc.).
 * Child pages mount through <Outlet />.
 *
 * The global search modal lives here so it overlays all child pages.
 */
function HelpLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <HelpCenterLayout onSearchClick={() => setSearchOpen(true)}>
      <Outlet />
      <HelpSearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </HelpCenterLayout>
  );
}

export const Route = createFileRoute("/help")({
  component: HelpLayout,
});
