import { useState, type ReactNode } from "react";
import { HelpCenterTopNav } from "./help-center-topnav";
import { HelpSearchBar } from "./help-search-bar";

/**
 * Help Center shell — full-width top navigation layout.
 * Replaces the sidebar pattern with a horizontal scrollable tab bar that:
 * - Spans the full viewport width on desktop
 * - Horizontally scrolls on mobile without breaking layout
 * - Automatically accommodates future tabs without any layout changes
 * - Has no wasted sidebar space on any screen size
 */
export function HelpCenterLayout({
  children,
  onSearchClick,
}: {
  children: ReactNode;
  onSearchClick?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const handleSearchClick = onSearchClick ?? (() => setSearchOpen(true));

  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
      <HelpCenterTopNav onSearchClick={handleSearchClick} />
      <main className="flex-1 min-w-0">{children}</main>

      {/* Search modal — only mounted here when no parent provides onSearchClick */}
      {!onSearchClick && (
        <HelpSearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
