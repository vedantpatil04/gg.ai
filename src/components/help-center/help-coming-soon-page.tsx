import type { ComponentType } from "react";
import { ComingSoon } from "./help-card";

interface HelpComingSoonPageProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  features?: string[];
}

/**
 * Reusable Coming Soon placeholder for Help Center sub-pages.
 * HelpCenterLayout and HelpSearchBar are provided by the /help layout route.
 */
export function HelpComingSoonPage({
  title,
  description,
  icon,
  features,
}: HelpComingSoonPageProps) {
  return (
    <ComingSoon
      title={title}
      description={description}
      icon={icon}
      features={features}
    />
  );
}
