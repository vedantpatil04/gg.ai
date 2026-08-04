import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks the pointer position within an element and writes it to two CSS
 * custom properties (`--mx`, `--my`, 0–100) so a background layer can render
 * a light that follows the cursor with pure CSS — no per-frame React state.
 *
 * Disabled automatically for touch/coarse pointers and when the user has
 * requested reduced motion, per the Phase 1 motion + accessibility rules.
 * Reusable by any future landing section that wants the same effect.
 */
export function useMouseGlow<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
        node.style.setProperty("--mx", `${x.toFixed(2)}%`);
        node.style.setProperty("--my", `${y.toFixed(2)}%`);
        frame = 0;
      });
    };

    node.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      node.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
