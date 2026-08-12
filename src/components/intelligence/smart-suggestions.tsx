/**
 * SmartSuggestions — context-aware prompt chips shown after file selection.
 * Suggestions are determined by workspace tab (document / image / data).
 * Clicking a suggestion pre-fills the analysis mode and optionally submits.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "./workspace-tabs";

interface Suggestion {
  label: string;
  modeId: string;
  emoji:  string;
}

const SUGGESTIONS: Record<Exclude<WorkspaceTab, "chat">, Suggestion[]> = {
  documents: [
    { label: "Summarize",            modeId: "summarize",    emoji: "📝" },
    { label: "Extract risks",        modeId: "risk",         emoji: "⚠️" },
    { label: "Key points",           modeId: "key-points",   emoji: "🔑" },
    { label: "Generate report",      modeId: "report",       emoji: "📋" },
  ],
  images: [
    { label: "Detect pollution",     modeId: "pollution",    emoji: "🌫️" },
    { label: "Detect waste",         modeId: "waste",        emoji: "🗑️" },
    { label: "Analyse environment",  modeId: "environmental",emoji: "🌿" },
    { label: "Analyse infrastructure",modeId: "infrastructure",emoji: "🏗️" },
  ],
  data: [
    { label: "Analyse trends",       modeId: "trends",       emoji: "📈" },
    { label: "Detect anomalies",     modeId: "anomalies",    emoji: "🔍" },
    { label: "Prediction summary",   modeId: "prediction",   emoji: "🔮" },
    { label: "Pollution insights",   modeId: "insights",     emoji: "💨" },
  ],
};

interface SmartSuggestionsProps {
  tab:      Exclude<WorkspaceTab, "chat">;
  onSelect: (modeId: string) => void;
  accent:   string;
}

export function SmartSuggestions({ tab, onSelect, accent }: SmartSuggestionsProps) {
  const reduced     = useReducedMotion();
  const suggestions = SUGGESTIONS[tab] ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-2"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Sparkles className="size-3" style={{ color: accent }} />
        Smart suggestions
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <motion.button
            key={s.modeId}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay: reduced ? 0 : i * 0.05,
              ease: "easeOut",
            }}
            whileHover={reduced ? undefined : { scale: 1.04 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            onClick={() => onSelect(s.modeId)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full",
              "glass text-muted-foreground border border-border/60",
              "hover:text-foreground transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
            )}
            style={{ "--s-accent": accent } as React.CSSProperties}
          >
            <span>{s.emoji}</span>
            {s.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
