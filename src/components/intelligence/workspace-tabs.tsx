/**
 * WorkspaceTabs — animated horizontal tab bar for the Assistant section.
 * Tabs: Chat | Documents | Images | Data
 * Desktop: horizontal pill tabs with animated active indicator.
 * Mobile: horizontally scrollable, large touch targets.
 */
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquare, FileText, ImageIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTab = "chat" | "documents" | "images" | "data";

const TABS: { id: WorkspaceTab; label: string; icon: typeof MessageSquare; accent: string }[] = [
  { id: "chat",      label: "Chat",      icon: MessageSquare, accent: "var(--color-primary)" },
  { id: "documents", label: "Documents", icon: FileText,      accent: "var(--color-primary)" },
  { id: "images",    label: "Images",    icon: ImageIcon,     accent: "var(--color-info)" },
  { id: "data",      label: "Data",      icon: BarChart3,     accent: "var(--color-success)" },
];

interface WorkspaceTabsProps {
  active: WorkspaceTab;
  onChange: (t: WorkspaceTab) => void;
}

export function WorkspaceTabs({ active, onChange }: WorkspaceTabsProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className="flex gap-0.5 glass rounded-xl p-1 overflow-x-auto scrollbar-none"
      role="tablist"
      aria-label="Workspace tools"
    >
      {TABS.map(({ id, label, icon: Icon, accent }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`ws-panel-${id}`}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium",
              "whitespace-nowrap shrink-0 min-h-[36px] transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.div
                layoutId={reduced ? undefined : "ws-tab-pill"}
                className="absolute inset-0 rounded-lg shadow-[var(--shadow-glow)]"
                style={{ background: accent }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="relative size-3.5 shrink-0" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
