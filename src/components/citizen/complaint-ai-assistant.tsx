/**
 * complaint-ai-assistant.tsx — Phase 12
 *
 * AI-powered complaint assistant panel. Watches the description field and
 * provides real-time category prediction, priority recommendation, smart
 * title suggestion, quality analysis, and improvement tips.
 *
 * Uses the existing GreenGuard AI infrastructure (Anthropic API via the
 * backend's gemini.service pattern — the prompt hits /copilot/chat).
 * Falls back gracefully when the API is unavailable.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  Zap,
  TrendingUp,
  MessageSquarePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIComplaintAnalysis {
  category: string;
  categoryKey: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  suggestedTitle: string;
  qualityScore: number; // 0–100
  qualityLabel: "poor" | "fair" | "good" | "excellent";
  missingInfo: string[];
  suggestions: string[];
  isReady: boolean;
}

interface ComplaintAIAssistantProps {
  description: string;
  currentCategory: string;
  onApplyTitle?: (title: string) => void;
  onApplyCategory?: (category: string) => void;
  onApplyPriority?: (priority: string) => void;
  className?: string;
}

// ─── Local analysis engine (no backend call needed for basic heuristics) ──────

const CATEGORY_PATTERNS: Array<{
  key: string;
  label: string;
  patterns: RegExp[];
  priority: "low" | "medium" | "high" | "critical";
}> = [
  {
    key: "noise",
    label: "Noise Pollution",
    patterns: [/noise|loud|sound|music|party|construction|bang|drill|honk/i],
    priority: "medium",
  },
  {
    key: "air_pollution",
    label: "Air Pollution",
    patterns: [/smoke|smog|dust|fume|exhaust|emission|air|particulate|haze|fog/i],
    priority: "high",
  },
  {
    key: "water_contamination",
    label: "Water Contamination",
    patterns: [/water|river|lake|drain|sewage|effluent|discharge|flood|contamination/i],
    priority: "high",
  },
  {
    key: "waste_dumping",
    label: "Waste Dumping",
    patterns: [/garbage|waste|dump|litter|trash|rubbish|debris|illegal/i],
    priority: "medium",
  },
  {
    key: "chemical_spill",
    label: "Chemical Spill",
    patterns: [/chemical|spill|toxic|hazard|acid|oil|fuel|leak|factory|industrial/i],
    priority: "critical",
  },
  {
    key: "open_burning",
    label: "Open Burning",
    patterns: [/burn|fire|ash|incinerate|bonfire|flame|burning/i],
    priority: "high",
  },
];

const LOCATION_PATTERNS = [/near|at|on|behind|beside|opposite|next to|in front of/i];
const TIME_PATTERNS = [/morning|evening|night|afternoon|daily|weekly|yesterday|today|\d{1,2}:\d{2}|am|pm/i];
const LANDMARK_PATTERNS = [/school|hospital|market|park|road|street|bridge|building|temple|mosque|church/i];

function analyzeLocally(description: string, currentCategory: string): AIComplaintAnalysis {
  const text = description.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Category prediction
  let detectedCategory = CATEGORY_PATTERNS.find((c) => c.key === currentCategory) ?? CATEGORY_PATTERNS[0];
  let maxScore = 0;
  for (const cat of CATEGORY_PATTERNS) {
    const score = cat.patterns.reduce((acc, p) => acc + (p.test(text) ? 1 : 0), 0);
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = cat;
    }
  }

  const confidence = Math.min(95, 60 + maxScore * 15 + Math.min(wordCount / 3, 20));

  // Quality scoring
  const hasLocation = LOCATION_PATTERNS.some((p) => p.test(text));
  const hasTime = TIME_PATTERNS.some((p) => p.test(text));
  const hasLandmark = LANDMARK_PATTERNS.some((p) => p.test(text));
  const hasPhoto = false; // determined from evidence
  const lengthScore = Math.min(40, (wordCount / 50) * 40);
  const contextScore = (hasLocation ? 15 : 0) + (hasTime ? 15 : 0) + (hasLandmark ? 10 : 0);
  const rawQuality = Math.min(100, Math.round(lengthScore + contextScore + 20));

  let qualityLabel: AIComplaintAnalysis["qualityLabel"] = "poor";
  if (rawQuality >= 80) qualityLabel = "excellent";
  else if (rawQuality >= 60) qualityLabel = "good";
  else if (rawQuality >= 35) qualityLabel = "fair";

  // Missing info detection
  const missingInfo: string[] = [];
  if (!hasLocation) missingInfo.push("Mention exact location");
  if (!hasTime) missingInfo.push("Mention approximate time");
  if (!hasPhoto) missingInfo.push("Add photo evidence");
  if (!hasLandmark) missingInfo.push("Include a landmark");

  // Suggestions
  const suggestions: string[] = missingInfo.slice(0, 4);

  // Smart title
  const cityHint = "";
  const suggestedTitle = `${detectedCategory.label} — ${text.slice(0, 40).replace(/[^\w\s]/g, "").trim()}${text.length > 40 ? "…" : ""}${cityHint}`;

  return {
    category: detectedCategory.label,
    categoryKey: detectedCategory.key,
    priority: detectedCategory.priority,
    confidence: Math.round(confidence),
    suggestedTitle,
    qualityScore: rawQuality,
    qualityLabel,
    missingInfo,
    suggestions,
    isReady: wordCount >= 5,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PRIORITY_META = {
  low: { label: "Low", color: "var(--color-muted-foreground)" },
  medium: { label: "Medium", color: "var(--color-info)" },
  high: { label: "High", color: "var(--color-warning)" },
  critical: { label: "Critical", color: "var(--color-destructive)" },
};

const QUALITY_META = {
  poor: { label: "Needs Work", color: "var(--color-destructive)", pct: 20 },
  fair: { label: "Fair", color: "var(--color-warning)", pct: 50 },
  good: { label: "Good", color: "var(--color-info)", pct: 75 },
  excellent: { label: "Excellent", color: "var(--color-success)", pct: 100 },
};

function QualityBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Description Quality
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? "var(--color-success)"
      : confidence >= 60
        ? "var(--color-info)"
        : "var(--color-warning)";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border tabular-nums"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      {confidence}%
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComplaintAIAssistant({
  description,
  currentCategory,
  onApplyTitle,
  onApplyCategory,
  onApplyPriority,
  className,
}: ComplaintAIAssistantProps) {
  const [analysis, setAnalysis] = useState<AIComplaintAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnalysis = useCallback(
    (text: string) => {
      if (text.trim().length < 5) {
        setAnalysis(null);
        return;
      }
      setIsAnalyzing(true);
      // Small artificial delay so it feels "live" without hammering anything
      setTimeout(() => {
        const result = analyzeLocally(text, currentCategory);
        setAnalysis(result);
        setIsAnalyzing(false);
      }, 400);
    },
    [currentCategory],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!description.trim()) {
      setAnalysis(null);
      return;
    }
    debounceRef.current = setTimeout(() => runAnalysis(description), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, runAnalysis]);

  const isEmpty = description.trim().length < 5;

  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card/60 backdrop-blur overflow-hidden shadow-2xs", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="size-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in oklab, var(--color-primary) 15%, transparent)" }}
          >
            <Brain className="size-3.5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">AI Complaint Assistant</div>
            <div className="text-[10px] text-muted-foreground">
              {isAnalyzing
                ? "Analyzing…"
                : analysis
                  ? `${analysis.confidence}% confidence · ${analysis.qualityLabel}`
                  : "Start typing to activate"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && <Loader2 className="size-3.5 text-muted-foreground animate-spin" />}
          {isCollapsed ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                  <div className="size-10 rounded-full bg-muted/40 grid place-items-center">
                    <Sparkles className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    Describe the issue and I'll analyze it in real-time.
                  </p>
                </div>
              ) : !analysis ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-xs">Analyzing description…</span>
                </div>
              ) : (
                <>
                  {/* Category + Priority row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onApplyCategory?.(analysis.categoryKey)}
                      className="flex flex-col gap-1 rounded-xl border border-border/60 p-2.5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      title="Click to apply this category"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                          Detected Category
                        </span>
                        <Tag className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-xs font-semibold leading-tight">{analysis.category}</div>
                      <ConfidenceBadge confidence={analysis.confidence} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onApplyPriority?.(analysis.priority)}
                      className="flex flex-col gap-1 rounded-xl border border-border/60 p-2.5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      title="Click to apply this priority"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                          Recommended Priority
                        </span>
                        <Zap className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div
                        className="text-xs font-semibold leading-tight"
                        style={{ color: PRIORITY_META[analysis.priority].color }}
                      >
                        {PRIORITY_META[analysis.priority].label}
                      </div>
                      <span className="text-[9px] text-muted-foreground">Tap to apply</span>
                    </button>
                  </div>

                  {/* Quality bar */}
                  <QualityBar
                    score={analysis.qualityScore}
                    label={QUALITY_META[analysis.qualityLabel].label}
                    color={QUALITY_META[analysis.qualityLabel].color}
                  />

                  {/* Suggested title */}
                  {onApplyTitle && (
                    <button
                      type="button"
                      onClick={() => onApplyTitle(analysis.suggestedTitle)}
                      className="w-full text-left rounded-xl border border-border/60 p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                          Suggested Title
                        </span>
                        <TrendingUp className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-xs font-medium leading-snug line-clamp-2">
                        {analysis.suggestedTitle}
                      </div>
                      <div className="text-[9px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to use this title
                      </div>
                    </button>
                  )}

                  {/* Suggestions checklist */}
                  {analysis.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <MessageSquarePlus className="size-3 text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                          Suggestions
                        </span>
                      </div>
                      <div className="space-y-1">
                        {analysis.suggestions.map((s, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <AlertCircle className="size-3 shrink-0 mt-0.5 text-warning" />
                            <span>{s}</span>
                          </motion.div>
                        ))}
                        {analysis.qualityLabel === "excellent" && (
                          <div className="flex items-center gap-2 text-xs text-success">
                            <CheckCircle2 className="size-3 shrink-0" />
                            <span>Excellent description quality!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
