import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  unit,
  hint,
  trend,
  accent = "primary",
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  trend?: { value: number; direction: "up" | "down" };
  accent?: "primary" | "info" | "warning" | "destructive" | "success";
  icon?: ReactNode;
  className?: string;
}) {
  const accentVar: Record<string, string> = {
    primary: "var(--color-primary)",
    info: "var(--color-info)",
    warning: "var(--color-warning)",
    destructive: "var(--color-destructive)",
    success: "var(--color-success)",
  };
  return (
    <div className={cn("glass rounded-2xl p-5 relative overflow-hidden group", className)}>
      <div
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: accentVar[accent] }}
      />
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
        {unit && <div className="text-xs text-muted-foreground">{unit}</div>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="text-muted-foreground">{hint}</div>
        {trend && (
          <div
            className="px-1.5 py-0.5 rounded font-medium tabular-nums"
            style={{
              color: trend.direction === "up" ? "var(--color-destructive)" : "var(--color-success)",
              background: `color-mix(in oklab, ${trend.direction === "up" ? "var(--color-destructive)" : "var(--color-success)"} 12%, transparent)`,
            }}
          >
            {trend.direction === "up" ? "▲" : "▼"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4">
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-semibold tracking-tight mt-1">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  eyebrow,
  action,
  id,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className={cn("glass rounded-2xl p-5", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            {eyebrow && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </div>
            )}
            {title && <div className="text-base font-semibold tracking-tight mt-0.5">{title}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4 gap-2",
        className,
      )}
    >
      {icon && (
        <div className="size-10 rounded-full glass grid place-items-center text-muted-foreground mb-1">
          {icon}
        </div>
      )}
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground max-w-xs">{description}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "success" | "warning" | "destructive" | "info" | "primary";
  children: ReactNode;
}) {
  const map: Record<string, string> = {
    muted: "var(--color-muted-foreground)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    destructive: "var(--color-destructive)",
    info: "var(--color-info)",
    primary: "var(--color-primary)",
  };
  const c = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border tabular-nums"
      style={{
        color: c,
        borderColor: `color-mix(in oklab, ${c} 35%, transparent)`,
        background: `color-mix(in oklab, ${c} 10%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

// ─── WorkspaceHeader ─────────────────────────────────────────────────────────
// Per-tab workspace header used across Command Center tabs. Provides eyebrow
// context, a bold title, optional description, live operational stats (colored
// by tone), and an optional action slot (right-aligned). Stats render as
// "VALUE label" pairs separated by visual spacing — no extra separator markup.

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  stats,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  stats?: Array<{
    label: string;
    value: ReactNode;
    tone?: "success" | "warning" | "destructive" | "info" | "primary" | "muted";
  }>;
  action?: ReactNode;
  className?: string;
}) {
  const toneColor: Record<string, string> = {
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    destructive: "var(--color-destructive)",
    info: "var(--color-info)",
    primary: "var(--color-primary)",
    muted: "var(--color-muted-foreground)",
  };

  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight leading-snug">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="flex items-baseline gap-5 mt-2.5 flex-wrap">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span
                  className="text-lg font-bold tabular-nums leading-none"
                  style={{ color: toneColor[stat.tone ?? "muted"] }}
                >
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2 mt-0.5">{action}</div>}
    </div>
  );
}
