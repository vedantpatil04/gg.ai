import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { LandingRoute, IconComponent } from "@/components/landing/nav/nav-data";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the Phase 2 "platform experience" sections
 * (Environmental Overview, Smart Map, Forecast Intelligence, GreenGuard Intelligence Center).
 * Each section gets its own background and layout, but the heading
 * treatment and the single-CTA pattern stay consistent — imported from
 * here rather than re-declared four times.
 */

const TONE_VARS: Record<string, string> = {
  primary: "var(--color-primary)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  chart5: "var(--color-chart-5)",
};

export type ExperienceTone = keyof typeof TONE_VARS;

/** Eyebrow + heading + supporting copy, matching the rest of the landing page's section-head style, with a per-section accent color. */
export function ExperienceHeader({
  eyebrow,
  title,
  sub,
  tone = "primary",
  align = "left",
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  sub: string;
  tone?: ExperienceTone;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      <div
        className="text-[11px] font-medium uppercase tracking-[0.16em]"
        style={{ color: TONE_VARS[tone] }}
      >
        {eyebrow}
      </div>
      <h2 className="font-display mt-3 text-3xl font-semibold leading-[1.1] tracking-tight lg:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground lg:text-lg">{sub}</p>
    </motion.div>
  );
}

/** The one CTA each experience section is allowed — a real route, never a placeholder. */
export function ExperienceCTA({
  to,
  children,
  tone = "primary",
  className = "",
  borderColor,
}: {
  to: LandingRoute;
  children: ReactNode;
  tone?: ExperienceTone;
  className?: string;
  /** Override the tone-derived border color — e.g. for a section with a permanently dark backdrop regardless of theme. */
  borderColor?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex w-fit items-center gap-2 rounded-full border bg-card/60 px-5 py-2.5 text-sm font-medium backdrop-blur transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      style={{ borderColor: borderColor ?? `color-mix(in oklab, ${TONE_VARS[tone]} 35%, transparent)` }}
    >
      {children}
      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

/**
 * A slim animated gradient band between experience sections, so the page
 * reads as one continuous story rather than a stack of independent
 * sections. Purely decorative (`aria-hidden`); the fade itself is a static
 * gradient, so there's nothing to gate behind `prefers-reduced-motion`.
 * Deliberately short — a beat between sections, not another section.
 */
export function SectionDivider({ tone = "primary" }: { tone?: ExperienceTone }) {
  return (
    <div aria-hidden="true" className="relative h-10 overflow-hidden lg:h-16">
      <div
        className="absolute inset-0 opacity-25 blur-2xl"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, ${TONE_VARS[tone]} 40%, transparent), transparent 70%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

/**
 * A small glass panel that floats over a large visual (currently the Smart
 * Map) surfacing one real stat — not a card grid, just a single contextual
 * insight, per the "floating environmental insight panel" composition.
 *
 * Deliberately NOT using the theme-adaptive `glass-panel` utility: this
 * panel is designed to sit on top of the map, which renders in its own
 * always-dark tile style regardless of the page's light/dark theme, so the
 * panel needs to stay dark too or its white text would go illegible over a
 * light-themed `glass-panel` surface.
 */
export function FloatingInsightPanel({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: IconComponent;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 shadow-xl backdrop-blur-md",
        className,
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
        <Icon className="size-4.5" />
      </div>
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
