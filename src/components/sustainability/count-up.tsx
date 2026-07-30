/**
 * count-up.tsx — Phase 1 motion primitive
 *
 * Small, dependency-free count-up animation used by the executive KPI
 * strip and hero EcoScore preview. Animates from the previous value to
 * the next whenever `value` changes (so live data refreshes re-animate
 * too, not just first mount). Respects prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCountUp(target: number, opts?: { duration?: number }) {
  const { duration = 900 } = opts ?? {};
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const firstRun = useRef(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;

    // Skip the animation on first mount if the user prefers reduced motion —
    // still animate later updates subtly isn't necessary; just snap.
    if (prefersReducedMotion()) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = firstRun.current ? 0 : fromRef.current;
    firstRun.current = false;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setValue(from + (target - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

export function CountUp({
  value, decimals = 0, duration = 900, className,
}: { value: number; decimals?: number; duration?: number; className?: string }) {
  const animated = useCountUp(value, { duration });
  const display = decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString();
  return <span className={className}>{display}</span>;
}
