import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HelpCenterSidebar } from "./help-center-sidebar";
import { HelpCenterHeader } from "./help-center-header";

export function HelpCenterLayout({
  children,
  onSearchClick,
}: {
  children: ReactNode;
  onSearchClick?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <HelpCenterSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300")}>
        <HelpCenterHeader
          onMenuClick={() => setMobileOpen(o => !o)}
          mobileOpen={mobileOpen}
          onSearchClick={onSearchClick}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
