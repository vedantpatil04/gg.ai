import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_ITEMS } from "./nav-data";

/**
 * "Platform ▾" trigger + mega menu panel.
 *
 * Opens on hover (desktop mouse) and on click/Enter/Space (keyboard and
 * touch), closes on Escape, outside click, or blur past the panel. The
 * trigger carries full `aria-expanded` / `aria-haspopup` / `aria-controls`
 * wiring so screen readers and keyboard users get the same affordances as
 * a sighted mouse user.
 */
export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reducedMotion = useReducedMotion();

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((prev: boolean) => !prev)}
        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm text-foreground/75 transition-colors hover:text-foreground hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
      >
        Platform
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="menu"
            aria-label="Platform modules"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8, scale: reducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 4, scale: reducedMotion ? 1 : 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-50 w-[640px] max-w-[92vw] -translate-x-1/2 pt-3"
          >
            <div className="glass-panel rounded-2xl p-2 shadow-2xl">
              <div className="grid grid-cols-2 gap-1">
                {PLATFORM_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] transition-colors group-hover:bg-[color:var(--color-primary)]/15">
                      <item.icon className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
