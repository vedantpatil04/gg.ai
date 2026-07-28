import type { ReactNode } from "react";

/**
 * Phase 10 — Accessibility upgrade.
 *
 * Changed from a plain <div> pair to a proper <dl>/<dt>/<dd> row so screen
 * readers can announce "label: value" as a definition pair rather than two
 * unrelated text nodes.  The visual layout (flex row, border, truncation) is
 * unchanged — only the semantic element names differ.
 *
 * Usage: rendered inside an implicit or explicit <dl> context. When multiple
 * InfoRows appear together inside a Panel they form a single definition list,
 * which is the correct semantic grouping for labelled data.
 */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <dt className="inline-flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-medium text-right truncate max-w-[60%] m-0">{value}</dd>
    </div>
  );
}

/**
 * Wraps a set of InfoRow children in a <dl> element, completing the
 * accessible definition-list pattern.  Replaces the bare <div> wrappers
 * used in profile-overview.tsx, profile-personal-info-tab.tsx, and anywhere
 * else InfoRow children live.
 */
export function InfoList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={className}>{children}</dl>;
}
