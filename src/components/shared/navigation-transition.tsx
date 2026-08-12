import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── GreenGuard Navigation Transition System ──────────────────────────────────
//
// A single, global overlay that gives the user immediate, premium visual
// feedback while the router transitions between major sections of the app
// (Dashboard, Environmental Overview, Forecast, AI Copilot, Citizen Hub,
// Smart Map, Sustainability, Reports, Settings, Profile, Administrator
// Portal, Authority Portal, …).
//
// Mounted exactly once, at the root shell (see routes/__root.tsx), so it
// survives every navigation — including navigations across routes that each
// mount their own AppLayout/AdminLayout/CommandCenterLayout instance — and
// automatically covers any route added later. No per-page wiring required.
//
// It is driven solely by the router's own pending state (`state.status`),
// which only changes for real navigations. Every dialog, drawer, tab,
// accordion, pagination control, filter, and search box in this app is local
// component state, so none of them ever touch router status — this overlay
// physically cannot fire for them.
//
// It is purely decorative: `pointer-events-none` and `aria-hidden` throughout,
// so it can never intercept a click, trap focus, delay navigation, or reach a
// screen reader. It never touches routing, auth, layout, data loading, or any
// existing animation in the app — it only ever paints on top, briefly.
// ────────────────────────────────────────────────────────────────────────────

/** Floor on how long the overlay stays mounted once shown, so a near-instant
 *  navigation never flashes it on and immediately back off. */
const MIN_VISIBLE_MS = 150;

/** House easing curve — matches the sidebar / topbar motion elsewhere. */
const EASE = [0.22, 1, 0.36, 1] as const;

export function NavigationTransitionOverlay() {
  const isNavigating = useRouterState({ select: (state) => state.status === "pending" });
  const prefersReducedMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isNavigating) {
      // A new navigation started — show right away and cancel any hide that
      // was still waiting out the minimum-visible window from a previous one.
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visibleRef.current) {
        visibleRef.current = true;
        shownAtRef.current = Date.now();
        setVisible(true);
      }
      return;
    }

    // Router is idle again. Only close out if we're actually showing.
    if (!visibleRef.current) return;

    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
    if (remaining <= 0) {
      visibleRef.current = false;
      setVisible(false);
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, remaining);
  }, [isNavigating]);

  // Belt-and-braces cleanup — this component is mounted for the app's whole
  // lifetime, but this keeps a stray timer from surviving a dev hot-reload.
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nav-transition-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none bg-background/45 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: EASE }}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: EASE }}
          >
            {/* Soft ambient glow behind the mark — echoes the hero brand-mark
                treatment used in the Help Center's empty states. */}
            <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-2xl -z-10" />

            {/* The existing GreenGuard brand mark (aurora + Shield), reused
                as-is from the sidebar/topbar — not a new logo. */}
            <motion.div
              className="size-14 rounded-2xl aurora grid place-items-center text-primary-foreground shadow-[var(--shadow-glow)]"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.05, 1] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <Shield className="size-7" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
