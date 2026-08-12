/**
 * WorkspacePreview — AI result display with copy, "Ask AI" follow-up,
 * and section-structured output using the inline markdown renderer.
 * Reused by all three workspace tools.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Copy, CheckCircle, RefreshCw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight inline markdown renderer (no dangerouslySetInnerHTML)
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flush = () => {
    if (!listBuf.length) return;
    const items = listBuf.map((item, i) => <li key={i} className="ml-4">{renderInline(item)}</li>);
    nodes.push(listType === "ol"
      ? <ol key={key++} className="list-decimal space-y-0.5 my-1.5">{items}</ol>
      : <ul key={key++} className="list-disc space-y-0.5 my-1.5">{items}</ul>);
    listBuf = []; listType = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^### /.test(line)) { flush(); nodes.push(<h4 key={key++} className="font-semibold text-foreground text-sm mt-3 mb-0.5">{line.slice(4)}</h4>); continue; }
    if (/^## /.test(line))  { flush(); nodes.push(<h3 key={key++} className="font-semibold text-foreground text-sm mt-3 mb-0.5">{line.slice(3)}</h3>); continue; }
    if (/^# /.test(line))   { flush(); nodes.push(<h2 key={key++} className="font-bold text-foreground mt-3 mb-1">{line.slice(2)}</h2>); continue; }
    const ul = line.match(/^[-*•] (.+)/);
    if (ul) { if (listType === "ol") flush(); listType = "ul"; listBuf.push(ul[1]); continue; }
    const ol = line.match(/^\d+\. (.+)/);
    if (ol) { if (listType === "ul") flush(); listType = "ol"; listBuf.push(ol[1]); continue; }
    if (!line.trim()) { flush(); nodes.push(<br key={key++} />); continue; }
    flush();
    nodes.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>);
  }
  flush();
  return <>{nodes}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(p))     return <em key={i} className="italic">{p.slice(1, -1)}</em>;
        if (/^`[^`]+`$/.test(p))       return <code key={i} className="font-mono text-[0.85em] bg-muted/60 px-1 py-0.5 rounded">{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

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
