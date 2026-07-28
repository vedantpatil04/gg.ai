/**
 * GreenGuard Motion Design System
 *
 * Single source of truth for every animation constant used on the
 * Citizen Dashboard. Components import from here instead of hardcoding
 * values, so a single edit propagates everywhere.
 *
 * Philosophy (inspired by Linear/Vercel/Apple):
 *  - Intentional, not decorative: every animation communicates state.
 *  - Calm over flashy: durations lean short, easing leans natural.
 *  - GPU-only: only transform + opacity — never layout-triggering props.
 *  - Accessible: all Framer Motion variants respect prefers-reduced-motion
 *    via the `useReducedMotion` hook at the component level.
 */

// ─── Spring configs ────────────────────────────────────────────────────────────
// Named after their feel rather than their numbers, so callsites read well.

/** Crisp snap — used for small UI elements like chips and badges. */
export const SPRING_SNAP = { type: "spring", stiffness: 400, damping: 30 } as const;

/** Smooth deceleration — used for cards, panels, and section entrances. */
export const SPRING_GENTLE = { type: "spring", stiffness: 80, damping: 22 } as const;

/** Slow, weighty — used for large hero elements and the score ring. */
export const SPRING_SLOW = { type: "spring", stiffness: 55, damping: 18 } as const;

/** Numeric counter (useSpring config, not a Framer transition). */
export const SPRING_COUNTER_FAST = { stiffness: 80, damping: 22 };
export const SPRING_COUNTER_SLOW = { stiffness: 55, damping: 18 };

// ─── Easing curves ─────────────────────────────────────────────────────────────
// Standard bezier curves matching Apple/Material Motion guidance.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.45, 0, 0.55, 1] as const;
export const EASE_DECELERATE = [0.0, 0.0, 0.2, 1] as const;

// ─── Duration tokens ──────────────────────────────────────────────────────────

export const DUR_XS = 0.15; // micro feedback (button press)
export const DUR_SM = 0.25; // chip / badge entrance
export const DUR_MD = 0.4; // card / panel entrance
export const DUR_LG = 0.6; // hero / section entrance
export const DUR_XL = 1.0; // score ring / cinematic

// ─── Shared Framer Motion variants ────────────────────────────────────────────

/** Standard "fade up from slightly below" card entrance. */
export const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

/** Subtler version for elements inside an already-visible card. */
export const FADE_UP_SM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR_SM, ease: EASE_OUT } },
} as const;

/** Pure fade — for content that shouldn't bounce vertically. */
export const FADE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR_SM } },
} as const;

/** Stagger parent — wraps a list of FADE_UP children. */
export const STAGGER = (staggerChildren = 0.07, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** Scale + fade — for small UI elements like badges and chips. */
export const POP = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { ...SPRING_SNAP } },
} as const;

/** Slide in from the left — used for alert rows. */
export const SLIDE_LEFT = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: DUR_SM, ease: EASE_OUT } },
  exit: { opacity: 0, x: 10, transition: { duration: DUR_XS } },
} as const;

// ─── Hover / tap presets ──────────────────────────────────────────────────────
// Pass these directly as whileHover / whileTap props.

/** Subtle lift — cards, action tiles. */
export const HOVER_LIFT = { y: -3, scale: 1.025, transition: SPRING_SNAP };

/** Lighter lift — secondary interactive surfaces. */
export const HOVER_LIFT_SM = { y: -1.5, scale: 1.012, transition: SPRING_SNAP };

/** Press sink — buttons. */
export const TAP_PRESS = { scale: 0.96, transition: { duration: DUR_XS } };

/** Lighter press — small icon buttons / chips. */
export const TAP_PRESS_SM = { scale: 0.92, transition: { duration: DUR_XS } };

// ─── Page-level stagger (top of Dashboard) ────────────────────────────────────

export const PAGE_STAGGER = STAGGER(0.07, 0);

export const PAGE_SECTION = FADE_UP;

// ─── Reduced-motion fallback ──────────────────────────────────────────────────
// Components call shouldAnimate() to decide whether to animate at all.
// Framer's useReducedMotion() hook handles the OS preference; this utility
// wraps it so components don't import the hook directly (easier to test).

export function reducedVariants<T extends object>(full: T, _reduced: Partial<T> = {}): T {
  // The runtime check via useReducedMotion() happens in the component;
  // this helper exists so future tests can swap it cleanly.
  return full;
}
