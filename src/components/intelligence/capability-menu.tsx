/**
 * CapabilityMenu — compact "+" composer control for Assistant multimodal capabilities.
 *
 * Replaces the former always-visible "Chat | Documents | Images | Data" tab strip.
 * Per Phase 1 IA rules, Document/Image/Data analysis are Assistant *capabilities*,
 * not primary navigation — so they live behind a single unobtrusive "+" button in
 * the composer instead of a persistent second-level nav.
 *
 * Fully keyboard accessible via Radix DropdownMenu (arrow keys, Enter/Space, Escape).
 */
import { Plus, FileText, Image as ImageIcon, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type Capability = "documents" | "images" | "data";

const CAPABILITIES: {
  id: Capability;
  label: string;
  description: string;
  icon: typeof FileText;
  accent: string;
}[] = [
  {
    id: "documents",
    label: "Document",
    description: "Analyze environmental reports, regulations, studies, or PDFs.",
    icon: FileText,
    accent: "var(--color-primary)",
  },
  {
    id: "images",
    label: "Image",
    description: "Analyze environmental conditions visible in an image.",
    icon: ImageIcon,
    accent: "var(--color-info)",
  },
  {
    id: "data",
    label: "Data",
    description: "Analyze environmental datasets, trends, and measurements.",
    icon: BarChart3,
    accent: "var(--color-success)",
  },
];

interface CapabilityMenuProps {
  onSelect: (capability: Capability) => void;
  disabled?: boolean;
}

export function CapabilityMenu({ onSelect, disabled }: CapabilityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Add document, image, or data for analysis"
          title="Add document, image, or data"
          className={cn(
            "flex items-center justify-center size-9 rounded-xl shrink-0 border border-border/80",
            "text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <Plus className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-2 pt-1">
          Add to conversation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CAPABILITIES.map(({ id, label, description, icon: Icon, accent }) => (
          <DropdownMenuItem
            key={id}
            onSelect={() => onSelect(id)}
            className="flex items-start gap-2.5 py-2 px-2 cursor-pointer rounded-lg"
          >
            <span
              className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
              style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent }}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground leading-none">{label}</span>
              <span className="text-xs text-muted-foreground leading-snug">{description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
