import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * V3 Environmental Overview — reusable section wrapper.
 *
 * Upgrades from plain CSS motion-safe:animate-in to Framer Motion
 * IntersectionObserver-triggered entrance for precise stagger control.
 * Layout and API surface are unchanged; all downstream components
 * continue working without modification.
 */

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 26 },
  },
};

export function EnvSection({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id =
    typeof title === "string"
      ? `env-section-${title.replace(/\s+/g, "-").toLowerCase()}`
      : "env-section";

  return (
    <motion.section
      aria-labelledby={id}
      className={cn("space-y-5 scroll-mt-6", className)}
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="flex items-center gap-2 mb-1.5">
              {/* Accent dash */}
              <span
                className="inline-block w-4 h-px rounded-full opacity-60"
                style={{ background: "var(--color-primary)" }}
                aria-hidden="true"
              />
              <span className="text-[10px] uppercase tracking-[0.22em] font-medium"
                style={{ color: "var(--color-primary)" }}>
                {eyebrow}
              </span>
            </div>
          )}
          <h2
            id={id}
            className="text-xl font-semibold tracking-tight"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 mt-0.5">{action}</div>}
      </div>

      {children}
    </motion.section>
  );
}
