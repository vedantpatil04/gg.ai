import type { ComponentType } from "react";
import { useState } from "react";
import { HelpCenterLayout } from "./help-center-layout";
import { HelpSearchBar } from "./help-search-bar";
import { ComingSoon } from "./help-card";

interface HelpComingSoonPageProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  features?: string[];
}

/**
 * Reusable premium Coming Soon placeholder for all Help Center sub-pages
 * (Knowledge Base, Tutorials, Support Center, etc.).
 *
 * Each placeholder shares the same layout shell so sidebar navigation and
 * the global search modal work consistently across the whole Help Center.
 */
export function HelpComingSoonPage({
  title,
  description,
  icon,
  features,
}: HelpComingSoonPageProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <HelpCenterLayout onSearchClick={() => setSearchOpen(true)}>
      <ComingSoon title={title} description={description} icon={icon} features={features} />

      <HelpSearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
    </HelpCenterLayout>
  );
}
