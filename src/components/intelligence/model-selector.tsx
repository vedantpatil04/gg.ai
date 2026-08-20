/**
 * ModelSelector — compact composer control for selecting the AI provider / model.
 *
 * Part of GreenGuard Intelligence Center Phase 2.
 * Allows users to choose between Auto, Gemini, Groq, and OpenRouter for Assistant requests.
 * Only configured and usable providers are offered.
 *
 * Fully keyboard-accessible via Radix DropdownMenu.
 */

import { Sparkles, ChevronDown, Check, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const AUTO_OPTION = "auto";

export interface ProviderOption {
  name: string; // "gemini" | "groq" | "openrouter"
  displayName: string; // "Gemini" | "Groq" | "OpenRouter"
  model: string; // "Gemini 3.6 Flash" | "Llama 3.3 70B"
  modelDisplayName?: string;
  capabilities?: {
    text: boolean;
    image: boolean;
    document: boolean;
  };
  available?: boolean;
}

export interface ModelSelectorProps {
  providers: ProviderOption[];
  value: string; // "auto" | "gemini" | "groq" | "openrouter"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  providers,
  value,
  onChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const availableProviders = (providers || []).filter((p) => p.available !== false);

  // Determine active display label for the composer trigger button
  const currentProvider = availableProviders.find((p) => p.name === value);
  const isAuto = value === AUTO_OPTION;

  let triggerLabel = "Auto";
  if (!isAuto && currentProvider) {
    triggerLabel = currentProvider.modelDisplayName || currentProvider.model || currentProvider.displayName;
  } else if (isAuto) {
    const defaultMeta = availableProviders.find((p) => p.name === "gemini") || availableProviders[0];
    triggerLabel = defaultMeta ? `Auto (${defaultMeta.displayName})` : "Auto";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select AI Model"
          title={`Active AI Model: ${triggerLabel}`}
          className={cn(
            "flex items-center gap-1.5 h-9 px-2.5 rounded-xl shrink-0 border border-border/80",
            "text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:opacity-40 disabled:cursor-not-allowed max-w-[170px]",
            className,
          )}
        >
          <Cpu className="size-3.5 shrink-0 text-primary" />
          <span className="truncate max-w-[110px]">{triggerLabel}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-2 pt-1">
          AI Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Option 1: Auto */}
        <DropdownMenuItem
          onSelect={() => onChange(AUTO_OPTION)}
          className="flex items-start justify-between gap-2 py-2 px-2 cursor-pointer rounded-lg"
        >
          <div className="flex items-start gap-2.5">
            <span
              className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
              style={{
                background: "color-mix(in oklab, var(--color-primary) 14%, transparent)",
                color: "var(--color-primary)",
              }}
            >
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground leading-none">Auto</span>
              <span className="text-xs text-muted-foreground leading-snug">
                Uses the configured primary provider
              </span>
            </div>
          </div>
          {isAuto && <Check className="size-4 text-primary shrink-0 mt-1" />}
        </DropdownMenuItem>

        {/* Configured Providers */}
        {availableProviders.map((provider) => {
          const isSelected = value === provider.name;
          const modelTitle = provider.modelDisplayName || provider.model || provider.displayName;

          return (
            <DropdownMenuItem
              key={provider.name}
              onSelect={() => onChange(provider.name)}
              className="flex items-start justify-between gap-2 py-2 px-2 cursor-pointer rounded-lg"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    background: "color-mix(in oklab, var(--color-muted-foreground) 14%, transparent)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {provider.displayName.slice(0, 2)}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground leading-none">
                    {provider.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {modelTitle}
                  </span>
                </div>
              </div>
              {isSelected && <Check className="size-4 text-primary shrink-0 mt-1" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
