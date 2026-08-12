import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import type { TicketStatus, TicketPriority, SupportTicket, ContactMethod } from "./support-data";
import {
  TICKET_STATUS_STYLE, TICKET_PRIORITY_STYLE,
} from "./support-data";

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: TicketStatus }) {
  const s = TICKET_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const s = TICKET_PRIORITY_STYLE[priority];
  return (
    <span
      className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 rounded-full border"
      style={{
        color: s.color,
        borderColor: `color-mix(in oklab, ${s.color} 35%, transparent)`,
        background: `color-mix(in oklab, ${s.color} 8%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

export function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Form input ───────────────────────────────────────────────────────────────

export function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "placeholder:text-muted-foreground/60 transition-colors",
        className,
      )}
    />
  );
}

// ─── Form textarea ────────────────────────────────────────────────────────────

export function FormTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "placeholder:text-muted-foreground/60 transition-colors resize-none",
        className,
      )}
    />
  );
}

// ─── Form select ──────────────────────────────────────────────────────────────

export function FormSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
        "transition-colors cursor-pointer appearance-none",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

export function TicketCard({
  ticket,
  onClick,
}: {
  ticket: SupportTicket;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={onClick ? HOVER_LIFT_SM : undefined}
      whileTap={onClick ? TAP_PRESS_SM : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/20",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-sm font-medium leading-snug mb-1.5 line-clamp-2">{ticket.subject}</p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{ticket.category}</span>
            <span>·</span>
            <span>Team: {ticket.assignedTeam}</span>
            <span>·</span>
            <span>Updated {ticket.updatedAt}</span>
          </div>
          {(ticket.status === "open" || ticket.status === "in_progress") && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              Est. response: <span className="font-medium text-foreground">{ticket.estimatedResponse}</span>
            </div>
          )}
        </div>
        {onClick && (
          <ChevronRight className="size-4 text-muted-foreground/30 shrink-0 mt-0.5" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Contact method card ──────────────────────────────────────────────────────

export function ContactCard({
  method,
  onClick,
}: {
  method: ContactMethod;
  onClick: () => void;
}) {
  const Icon = method.icon;

  return (
    <motion.div
      whileHover={!method.comingSoon ? HOVER_LIFT_SM : undefined}
      whileTap={!method.comingSoon ? TAP_PRESS_SM : undefined}
      onClick={!method.comingSoon ? onClick : undefined}
      role={!method.comingSoon ? "button" : undefined}
      tabIndex={!method.comingSoon ? 0 : undefined}
      onKeyDown={!method.comingSoon ? e => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-all duration-200",
        !method.comingSoon ? "cursor-pointer hover:border-primary/20 group" : "opacity-60 cursor-default",
      )}
    >
      <div
        className="absolute -bottom-8 -right-8 size-24 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none"
        style={{ background: method.accentColor }}
      />

      {method.badge && (
        <div className="absolute top-3 right-3">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full aurora text-primary-foreground">
            {method.badge}
          </span>
        </div>
      )}
      {method.comingSoon && (
        <div className="absolute top-3 right-3">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
            Soon
          </span>
        </div>
      )}

      <div
        className="size-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `color-mix(in oklab, ${method.accentColor} 12%, transparent)` }}
      >
        <Icon className="size-4" style={{ color: method.accentColor }} />
      </div>

      <h3 className="text-sm font-semibold mb-1">{method.label}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{method.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{method.availability}</span>
        {!method.comingSoon && (
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
            style={{
              color: method.accentColor,
              background: `color-mix(in oklab, ${method.accentColor} 10%, transparent)`,
            }}
          >
            {method.action}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Star rating input ────────────────────────────────────────────────────────

export function StarRating({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${i + 1} star${i !== 0 ? "s" : ""}`}
        >
          <svg
            className="size-7"
            viewBox="0 0 24 24"
            fill={i < value ? "var(--color-warning)" : "none"}
            stroke={i < value ? "var(--color-warning)" : "var(--color-muted-foreground)"}
            strokeWidth="1.5"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── NPS slider ───────────────────────────────────────────────────────────────

export function NpsSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              "size-8 rounded-lg text-xs font-medium border transition-all duration-150",
              value === i
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

export function SuccessState({
  title,
  description,
  detail,
  onReset,
  resetLabel = "Submit Another",
}: {
  title: string;
  description: string;
  detail?: string;
  onReset: () => void;
  resetLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="size-16 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center mb-4">
        <Check className="size-8 text-success" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-1">{description}</p>
      {detail && (
        <p className="text-xs text-muted-foreground/70 mb-6">{detail}</p>
      )}
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors mt-4"
      >
        {resetLabel}
      </button>
    </motion.div>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────

export function SupportSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {children}
    </div>
  );
}

// ─── Availability dot ─────────────────────────────────────────────────────────

export function AvailabilityDot({ status }: { status: "available" | "busy" | "offline" }) {
  const color = status === "available"
    ? "var(--color-success)"
    : status === "busy"
    ? "var(--color-warning)"
    : "var(--color-muted-foreground)";

  return (
    <span
      className={cn("size-2 rounded-full shrink-0", status === "available" && "animate-pulse")}
      style={{ background: color }}
    />
  );
}
