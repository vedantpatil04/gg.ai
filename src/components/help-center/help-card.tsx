import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";

// ─── HelpCard — general-purpose interactive card ─────────────────────────────

interface HelpCardProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor?: string;
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  accent?: string;
  badge?: string;
  action?: ReactNode;
  disabled?: boolean;
}

export function HelpCard({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  onClick,
  className,
  accent,
  badge,
  action,
  disabled,
}: HelpCardProps) {
  const isInteractive = !!onClick && !disabled;

  return (
    <motion.div
      whileHover={isInteractive ? HOVER_LIFT_SM : undefined}
      whileTap={isInteractive ? TAP_PRESS_SM : undefined}
      onClick={disabled ? undefined : onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      className={cn(
        "relative rounded-xl border border-border bg-card overflow-hidden",
        "transition-colors duration-200",
        isInteractive && "cursor-pointer hover:border-border/80",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {/* Accent glow */}
      {accent && (
        <div
          className="absolute -top-8 -right-8 size-32 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: accent }}
        />
      )}

      <div className="p-4 relative">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className="size-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: iconColor
                  ? `color-mix(in oklab, ${iconColor} 15%, transparent)`
                  : "var(--color-muted)",
              }}
            >
              <Icon
                className="size-4"
                style={{ color: iconColor ?? "var(--color-muted-foreground)" }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate">{title}</h3>
              {badge && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {isInteractive && !action && (
            <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 mt-0.5" />
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children && <div className="mt-3">{children}</div>}
      </div>
    </motion.div>
  );
}

// ─── SectionHeader — eyebrow + title + optional action ───────────────────────

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-5", className)}>
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── CategoryCard — icon + label grid card ───────────────────────────────────

interface CategoryCardProps {
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  count?: number;
  onClick?: () => void;
  accentColor?: string;
}

export function CategoryCard({
  title,
  description,
  icon: Icon,
  count,
  onClick,
  accentColor,
}: CategoryCardProps) {
  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="relative rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-all duration-200 overflow-hidden group"
    >
      <div
        className="absolute -bottom-6 -right-6 size-24 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none"
        style={{ background: accentColor ?? "var(--color-primary)" }}
      />
      <div
        className="size-10 rounded-lg flex items-center justify-center mb-3"
        style={{
          background: accentColor
            ? `color-mix(in oklab, ${accentColor} 12%, transparent)`
            : "var(--color-muted)",
        }}
      >
        <Icon
          className="size-5"
          style={{ color: accentColor ?? "var(--color-muted-foreground)" }}
        />
      </div>
      <h3 className="text-sm font-semibold leading-tight">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {description}
        </p>
      )}
      {count !== undefined && (
        <div className="mt-2 text-[10px] text-muted-foreground/70">
          {count} article{count !== 1 ? "s" : ""}
        </div>
      )}
    </motion.div>
  );
}

// ─── QuickActionCard — compact action tile ───────────────────────────────────

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  onClick?: () => void;
  accentColor?: string;
  badge?: string;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  accentColor,
  badge,
}: QuickActionCardProps) {
  return (
    <motion.button
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all duration-200 overflow-hidden relative group"
    >
      <div
        className="absolute -top-6 -right-6 size-20 rounded-full opacity-0 group-hover:opacity-15 blur-xl transition-opacity duration-300 pointer-events-none"
        style={{ background: accentColor ?? "var(--color-primary)" }}
      />
      <div className="flex items-start gap-3">
        <div
          className="size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: accentColor
              ? `color-mix(in oklab, ${accentColor} 12%, transparent)`
              : "var(--color-muted)",
          }}
        >
          <Icon
            className="size-4"
            style={{ color: accentColor ?? "var(--color-muted-foreground)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{title}</span>
            {badge && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: accentColor
                    ? `color-mix(in oklab, ${accentColor} 15%, transparent)`
                    : "var(--color-muted)",
                  color: accentColor ?? "var(--color-muted-foreground)",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ─── ArticleCard — article preview ───────────────────────────────────────────

interface ArticleCardProps {
  title: string;
  excerpt: string;
  category: string;
  readTime?: string;
  updatedAt?: string;
  views?: number;
  onClick?: () => void;
}

export function ArticleCard({
  title,
  excerpt,
  category,
  readTime,
  updatedAt,
  views,
  onClick,
}: ArticleCardProps) {
  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {category}
        </span>
        {readTime && (
          <span className="text-[10px] text-muted-foreground/70 shrink-0">{readTime}</span>
        )}
      </div>
      <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-200">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{excerpt}</p>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70">
        {updatedAt && <span>Updated {updatedAt}</span>}
        {views !== undefined && <span>·</span>}
        {views !== undefined && <span>{views.toLocaleString()} views</span>}
      </div>
    </motion.div>
  );
}

// ─── TimelineCard — update / changelog entry ──────────────────────────────────

interface TimelineCardProps {
  title: string;
  description: string;
  date: string;
  type?: "update" | "feature" | "fix" | "announcement";
}

const TIMELINE_TYPE_STYLES: Record<
  NonNullable<TimelineCardProps["type"]>,
  { label: string; color: string }
> = {
  feature: { label: "New Feature", color: "var(--color-primary)" },
  update: { label: "Update", color: "var(--color-info)" },
  fix: { label: "Bug Fix", color: "var(--color-success)" },
  announcement: { label: "Announcement", color: "var(--color-warning)" },
};

export function TimelineCard({ title, description, date, type = "update" }: TimelineCardProps) {
  const style = TIMELINE_TYPE_STYLES[type];

  return (
    <div className="flex gap-4">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="size-2.5 rounded-full mt-1.5 shrink-0 ring-4"
          style={{
            background: style.color,
            boxShadow: `0 0 0 4px color-mix(in oklab, ${style.color} 20%, transparent)`,
          }}
        />
        <div className="w-px flex-1 bg-border/60 mt-2" />
      </div>

      {/* Content */}
      <div className="pb-5 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: style.color,
              background: `color-mix(in oklab, ${style.color} 12%, transparent)`,
            }}
          >
            {style.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{date}</span>
        </div>
        <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── EmptyState — friendly no-content state ───────────────────────────────────

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}
    >
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="size-6 text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

export function HelpLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ComingSoon — premium placeholder page ────────────────────────────────────

interface ComingSoonProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  features?: string[];
}

export function ComingSoon({ title, description, icon: Icon, features }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full"
      >
        {/* Icon */}
        <div className="relative inline-flex mb-6">
          <div className="size-20 rounded-3xl aurora grid place-items-center shadow-[var(--shadow-glow)]">
            <Icon className="size-9 text-primary-foreground" />
          </div>
          <div className="absolute -inset-3 rounded-[2rem] bg-primary/5 blur-xl -z-10" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>

        {features && features.length > 0 && (
          <div className="text-left rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Coming in this section
            </div>
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <div className="size-1.5 rounded-full bg-primary/60 shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warning animate-pulse shrink-0" />
          In Development
        </div>
      </motion.div>
    </div>
  );
}
