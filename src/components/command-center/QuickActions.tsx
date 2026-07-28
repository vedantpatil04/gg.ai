import type { ComponentType } from "react";
import { ChevronRight } from "lucide-react";

export interface QuickAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Phase 3A.3 — enterprise-style refinement: muted background fill,
 * subdued border, primary-tinted icon, and a chevron affordance that
 * appears on hover. Grid layout and responsive behaviour are unchanged
 * from Phase 3A.1.6 (2-col mobile, 4-col sm+).
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm hover:bg-muted/60 hover:border-border transition-all text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <action.icon className="size-3.5 text-primary/70 shrink-0" />
            <span className="text-sm font-medium truncate">{action.label}</span>
          </span>
          <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
        </button>
      ))}
    </div>
  );
}
