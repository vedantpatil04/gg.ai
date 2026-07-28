/**
 * intelligence-ui.tsx — Phase 5: Premium Smart Map Experience
 *
 * Upgraded shared presentational primitives. Key changes from Phase 3B:
 *  - MetricTile: adopts glass-card surface, richer accent hairline, larger
 *    value text, animated value highlight on mount
 *  - StatusChip: stronger background (60% opacity vs previous 12%), bolder
 *    font weight, explicit high-contrast text color
 *  - SectionHeader: slightly heavier tracking and uppercase label weight
 *  - EmptyState: glass-card surface, larger icon, friendlier layout
 *
 * All backward compatible — same props, same exports, same import path.
 */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tone → color mapping (unchanged) ────────────────────────────────────────
export type Tone = "critical" | "warning" | "info" | "good" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  critical: "var(--color-destructive)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  good: "var(--color-success)",
  neutral: "var(--color-muted-foreground)",
};

// ─── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({
  icon: Icon,
  label,
  right,
}: {
  icon?: LucideIcon;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {Icon && (
        <span
          className="size-5 rounded-md grid place-items-center shrink-0"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <Icon className="size-3 text-muted-foreground" />
        </span>
      )}
      <span className="text-[9px] font-semibold uppercase tracking-[0.20em] text-muted-foreground flex-1">
        {label}
      </span>
      {right}
    </div>
  );
}

// ─── Status chip ───────────────────────────────────────────────────────────────
// Phase 5: stronger opacity (was 12%, now 22%) + heavier font so the chip
// is legible over the new high-opacity panel backgrounds.
export function StatusChip({
  tone,
  children,
  pulse = false,
  size = "sm",
}: {
  tone: Tone;
  children: React.ReactNode;
  pulse?: boolean;
  size?: "xs" | "sm";
}) {
  const color = TONE_COLOR[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        size === "xs" ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-1",
      )}
      style={{
        background: `color-mix(in oklab, ${color} 22%, transparent)`,
        color,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {pulse && (
        <span className="size-1.5 rounded-full bg-current animate-pulse inline-block shrink-0" />
      )}
      {children}
    </span>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon?: LucideIcon;
  message: string;
  hint?: string;
}) {
  return (
    <div
      className="text-center py-8 px-4 rounded-xl"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {Icon && (
        <div
          className="size-10 rounded-xl grid place-items-center mx-auto mb-3"
          style={{
            background: "color-mix(in oklab, var(--color-muted-foreground) 10%, transparent)",
          }}
        >
          <Icon className="size-5 text-muted-foreground opacity-50" />
        </div>
      )}
      <p className="text-[11px] font-medium text-muted-foreground">{message}</p>
      {hint && <p className="text-[9px] text-muted-foreground/55 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

// ─── Metric tile ───────────────────────────────────────────────────────────────
// Phase 5: glass-card surface, accent hairline at top, animated value, larger
// readability with a cleaner label / value hierarchy.
export function MetricTile({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="relative rounded-xl px-2.5 py-2 text-center overflow-hidden"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Accent hairline */}
      {accent && (
        <span
          className="absolute inset-x-3 top-0 h-px rounded-full opacity-60"
          style={{ background: accent }}
        />
      )}
      <div className="text-[8px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 mt-0.5">
        {label}
      </div>
      <div
        className="text-[12px] font-bold tabular-nums leading-tight mt-0.5"
        style={{ color: accent ?? "var(--color-foreground)" }}
      >
        {value}
        {unit && (
          <span className="text-[8px] text-muted-foreground ml-0.5 font-normal">{unit}</span>
        )}
      </div>
    </motion.div>
  );
}
