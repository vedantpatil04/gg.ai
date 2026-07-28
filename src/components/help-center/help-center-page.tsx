import { useState } from "react";
import { HelpCenterLayout } from "./help-center-layout";
import { HelpCenterHome } from "./help-center-home";
import { HelpSearchBar } from "./help-search-bar";

/**
 * Root Help Center page. Wires together the layout shell, home dashboard,
 * and the global search modal state, so sub-pages can also trigger search.
 */
export function HelpCenterPage() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <HelpCenterLayout onSearchClick={() => setSearchOpen(true)}>
      <HelpCenterHome onSearchClick={() => setSearchOpen(true)} />

      {/* Global search modal — mounted at root so it overlays everything */}
      <HelpSearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </HelpCenterLayout>
  );
}
