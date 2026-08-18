/**
 * WorkspacePreview — AI result display with copy, "Ask AI" follow-up,
 * and section-structured output using the inline markdown renderer.
 * Reused by all three workspace tools.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Copy, CheckCircle, RefreshCw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/render-markdown";

interface WorkspacePreviewProps {
  result: string;
  accent: string;
  onReset: () => void;
  onAskAI?: (text: string) => void;
  fileName?: string;
}

export function WorkspacePreview({ result, accent, onReset, onAskAI, fileName }: WorkspacePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-6 rounded-md grid place-items-center text-primary-foreground"
            style={{ background: accent }}
          >
            <Sparkles className="size-3" />
          </div>
          <span className="text-xs font-medium">
            GreenGuard AI {fileName ? `· ${fileName}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Copy result"
            title="Copy"
          >
            {copied ? <CheckCircle className="size-3.5 text-[var(--color-success)]" /> : <Copy className="size-3.5" />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Analyse another file"
            title="New analysis"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Result body */}
      <div
        className="rounded-xl border p-4 text-sm text-muted-foreground space-y-1 max-h-96 overflow-y-auto"
        style={{ borderColor: `color-mix(in oklab, ${accent} 20%, var(--border))` }}
      >
        {renderMarkdown(result)}
      </div>

      {/* AI disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 px-1">
        AI analysis is interpretive. Verify important findings with qualified professionals.
      </p>

      {/* Ask AI button */}
      {onAskAI && (
        <button
          onClick={() => onAskAI(`Explain this analysis: ${result.slice(0, 400)}`)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="size-3" /> Continue in Chat
        </button>
      )}
    </motion.div>
  );
}
