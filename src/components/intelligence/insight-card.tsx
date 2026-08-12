/**
 * InsightCard — animated AI insight card.
 * Renders a key-finding, risk score, recommendation, summary, or confidence
 * derived from a completed workspace analysis.
 * Used inside WorkspacePreview after every successful analysis.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, AlertTriangle, Lightbulb, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = "finding" | "risk" | "recommendation" | "summary" | "confidence";

export interface InsightCardData {
  type:  InsightType;
  title: string;
  body:  string;
  score?: number;   // 0-100, used for risk/confidence
}

const TYPE_CONFIG: Record<InsightType, {
  icon: typeof Sparkles;
  label: string;
  accent: string;
  bg: string;
}> = {
  finding:        { icon: Sparkles,       label: "Key Finding",     accent: "var(--color-primary)",     bg: "color-mix(in oklab, var(--color-primary) 8%, transparent)" },
  risk:           { icon: AlertTriangle,  label: "Risk",            accent: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 8%, transparent)" },
  recommendation: { icon: Lightbulb,      label: "Recommendation",  accent: "var(--color-warning)",     bg: "color-mix(in oklab, var(--color-warning) 8%, transparent)" },
  summary:        { icon: FileText,       label: "Summary",         accent: "var(--color-info)",        bg: "color-mix(in oklab, var(--color-info) 8%, transparent)" },
  confidence:     { icon: CheckCircle,    label: "Confidence",      accent: "var(--color-success)",     bg: "color-mix(in oklab, var(--color-success) 8%, transparent)" },
};

interface InsightCardProps {
  card:   InsightCardData;
  index:  number;         // stagger delay index
}

export function InsightCard({ card, index }: InsightCardProps) {
  const reduced = useReducedMotion();
  const cfg     = TYPE_CONFIG[card.type];
  const Icon    = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      transition={{
        duration: 0.35,
        delay: reduced ? 0 : index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduced ? undefined : { y: -2, scale: 1.015 }}
      className={cn(
        "rounded-xl border p-4 group relative overflow-hidden",
        "transition-shadow duration-200",
      )}
      style={{
        borderColor: `color-mix(in oklab, ${cfg.accent} 25%, var(--border))`,
        background:  cfg.bg,
      }}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 20px ${cfg.accent}15` }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="size-6 rounded-md grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${cfg.accent} 18%, transparent)` }}
        >
          <Icon className="size-3.5" style={{ color: cfg.accent }} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: cfg.accent }}>
          {cfg.label}
        </span>

        {/* Score badge for risk / confidence */}
        {card.score !== undefined && (
          <span
            className="ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
            style={{
              background: `color-mix(in oklab, ${cfg.accent} 14%, transparent)`,
              color: cfg.accent,
            }}
          >
            {card.score}%
          </span>
        )}
      </div>

      <div className="text-sm font-semibold text-foreground mb-1">{card.title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{card.body}</div>
    </motion.div>
  );
}

// ─── Helper: derive insight cards from raw AI analysis text ──────────────────
// This is deterministic (no extra AI call) — we extract patterns from the
// existing response text that was already returned by copilotApi.chat.

export function deriveInsightCards(result: string): InsightCardData[] {
  const cards: InsightCardData[] = [];
  const lower = result.toLowerCase();
  const sentences = result
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300);

  // Summary — first meaningful sentence
  if (sentences[0]) {
    cards.push({
      type: "summary",
      title: "Analysis Summary",
      body: sentences[0] + ".",
    });
  }

  // Key finding — look for sentences containing key terms
  const findingSent = sentences.find(s =>
    /key|finding|show|indicate|reveal|suggest|significant|notable/i.test(s) && s !== sentences[0]
  );
  if (findingSent) {
    cards.push({ type: "finding", title: "Key Finding", body: findingSent + "." });
  }

  // Risk — sentences containing risk/concern/danger/pollution terms
  const riskSent = sentences.find(s =>
    /risk|concern|danger|hazard|pollut|contamina|exceed|above.*safe|unsafe/i.test(s)
  );
  if (riskSent) {
    const score = lower.includes("severe") ? 85
      : lower.includes("high") ? 72
      : lower.includes("moderate") ? 48
      : lower.includes("low") ? 22
      : 45;
    cards.push({ type: "risk", title: "Risk Assessment", body: riskSent + ".", score });
  }

  // Recommendation — action-oriented sentences
  const recSent = sentences.find(s =>
    /recommend|action|should|consider|suggest|improve|reduce|mitigat|monitor/i.test(s)
  );
  if (recSent) {
    cards.push({ type: "recommendation", title: "Recommended Action", body: recSent + "." });
  }

  // Confidence — based on language certainty signals
  const hasUncertain = /cannot determine|unclear|insufficient|limited|may|possible|appear/i.test(result);
  const confidence   = hasUncertain ? 62 : 81;
  cards.push({
    type: "confidence",
    title: "Analysis Confidence",
    body: hasUncertain
      ? "Some findings are tentative due to limited information in the provided content."
      : "Analysis is based on clear signals in the provided content.",
    score: confidence,
  });

  return cards.slice(0, 4); // max 4 cards
}
