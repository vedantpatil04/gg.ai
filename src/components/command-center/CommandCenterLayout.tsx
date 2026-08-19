import type { ReactNode } from "react";

interface CommandCenterLayoutProps {
  header: ReactNode;
  navigation: ReactNode;
  /** Rendered above the tab content, only on the pages that pass it — the
   *  route decides when Quick Actions should appear, not this layout. */
  quickActions?: ReactNode;
  children: ReactNode;
}

/**
 * Phase 3A.3 — reduced header band padding (py-4 → py-2.5) and main area
 * top padding (py-6 → py-5) to increase visible workspace. The sticky band
 * is meaningfully shorter while retaining all structural roles from 3A.1.6.
 */
export function CommandCenterLayout({
  header,
  navigation,
  quickActions,
  children,
}: CommandCenterLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Sticky Enterprise Header Container */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-all shadow-xs">
        <div className="w-full max-w-[1920px] 2xl:max-w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2.5 min-w-0">
          {header}
          {navigation}
        </div>
      </header>

      {/* Main Mission Control Workspace */}
      <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3.5 sm:py-4 space-y-4 min-w-0">
        {quickActions}
        {children}
      </main>
    </div>
  );
}
