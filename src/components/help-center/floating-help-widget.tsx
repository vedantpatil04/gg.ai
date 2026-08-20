import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Headphones,
  X,
  Sparkles,
  BookOpen,
  Activity,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * FloatingHelpWidget — Global Help & Support shortcut launcher
 *
 * NAVIGATION RULES:
 * 1. "Contact Support" -> Navigates to existing Help Center Support tab (`/help/support`).
 * 2. "Ask GreenGuard AI" -> Navigates to existing GreenGuard Intelligence Center (`/copilot`).
 * 3. Quick Resources ->
 *    - Knowledge Base (`/help/knowledge-base`)
 *    - System Status (`/help/status`)
 *    - All Topics (`/help`)
 *
 * COLLAPSED = Compact circular headset icon only (NO text).
 * OPENED = Compact, responsive Help & Support utility panel.
 */
export function FloatingHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleNavigate = useCallback(
    (to: string) => {
      setIsOpen(false);
      navigate({ to: to as any });
    },
    [navigate],
  );

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-40 print:hidden select-none"
    >
      {/* ── Popover Card ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="help-popover"
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 12, transformOrigin: "bottom right" }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 12, transformOrigin: "bottom right" }
            }
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute bottom-14 right-0",
              "w-[calc(100vw-2rem)] max-w-[360px] sm:w-[360px]",
              "max-h-[85vh] overflow-y-auto",
              "rounded-2xl border border-border/80 bg-card/95 dark:bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden",
              "ring-1 ring-black/5 dark:ring-white/10",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Help & Support"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4.5 sm:px-5 py-3.5 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-xl aurora grid place-items-center text-primary-foreground shadow-sm shrink-0">
                  <LifeBuoy className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                    Help & Support
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    GreenGuard Intelligence & Assistance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close Help & Support"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Main Action Shortcuts */}
            <div className="p-3.5 sm:p-4 space-y-2">
              {/* 1. Contact Support Shortcut -> /help/support */}
              <button
                type="button"
                onClick={() => handleNavigate("/help/support")}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer group",
                  "border border-border/70 bg-background/50 hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm",
                )}
              >
                <div className="size-8.5 rounded-xl bg-info/10 text-info grid place-items-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Headphones className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Contact Support
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Open the Support Center to submit inquiries, track tickets, or call helplines.
                  </p>
                </div>
              </button>

              {/* 2. Ask GreenGuard AI Shortcut -> /copilot */}
              <button
                type="button"
                onClick={() => handleNavigate("/copilot")}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 cursor-pointer group",
                  "border border-border/70 bg-background/50 hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm",
                )}
              >
                <div className="size-8.5 rounded-xl aurora text-primary-foreground grid place-items-center shrink-0 mt-0.5 shadow-sm group-hover:scale-105 transition-transform">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Ask GreenGuard AI
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Get instant environmental analysis and answers from the Intelligence Center.
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Resources (Knowledge Base, System Status, All Topics) */}
            <div className="px-3.5 sm:px-4 pb-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                Quick Resources
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Link
                  to="/help/knowledge-base"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/70 transition-colors group"
                >
                  <BookOpen className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="truncate">Knowledge Base</span>
                </Link>

                <Link
                  to="/help/status"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/70 transition-colors group"
                >
                  <Activity className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="truncate">System Status</span>
                </Link>

                <Link
                  to="/help"
                  onClick={() => setIsOpen(false)}
                  className="col-span-2 flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/70 transition-colors group"
                >
                  <HelpCircle className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="truncate">All Topics</span>
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4.5 sm:px-5 py-2.5 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="size-3 text-emerald-500 shrink-0" />
                Official Support
              </span>
              <Link
                to="/help"
                onClick={() => setIsOpen(false)}
                className="hover:text-foreground font-medium transition-colors inline-flex items-center gap-1"
              >
                Help Center
                <ArrowRight className="size-2.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Circular Headset Button ──────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={prefersReduced ? undefined : { scale: 1.06 }}
        whileTap={prefersReduced ? undefined : { scale: 0.94 }}
        className={cn(
          "size-12 sm:size-[50px] rounded-full grid place-items-center transition-all duration-200 cursor-pointer",
          "border border-border/80 bg-card/95 dark:bg-card/90 backdrop-blur-md shadow-lg",
          "hover:border-primary/50 hover:shadow-primary/15 hover:shadow-xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isOpen && "ring-2 ring-primary border-primary",
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "Close Help & Support" : "Open Help & Support"}
      >
        <div className="size-7 rounded-full aurora grid place-items-center text-primary-foreground text-xs shadow-sm">
          {isOpen ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Headphones className="size-3.5" aria-hidden="true" />
          )}
        </div>
      </motion.button>
    </div>
  );
}
