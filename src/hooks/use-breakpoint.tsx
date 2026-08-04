import * as React from "react";

const TABLET_BREAKPOINT = 768; // matches MOBILE_BREAKPOINT in use-mobile.tsx
const DESKTOP_BREAKPOINT = 1024; // Tailwind's `lg`

export type Breakpoint = "mobile" | "tablet" | "desktop";

/**
 * Three-way breakpoint used where a component needs more than the simple
 * mobile/not-mobile split `useIsMobile` provides — e.g. Enterprise Settings,
 * which has a distinct tablet (collapsible sidebar) layout in addition to
 * mobile (tabs) and desktop (fixed sidebar).
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>("desktop");

  React.useEffect(() => {
    const compute = () => {
      const width = window.innerWidth;
      if (width < TABLET_BREAKPOINT) setBreakpoint("mobile");
      else if (width < DESKTOP_BREAKPOINT) setBreakpoint("tablet");
      else setBreakpoint("desktop");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return breakpoint;
}
