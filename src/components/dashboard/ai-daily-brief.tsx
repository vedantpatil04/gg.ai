/**
 * AIDailyBriefCard — Phase 8
 *
 * Phase 3 built the real AI narrative + insight chips.
 * Phase 5-7 added AnimatePresence transitions and styled chips.
 * Phase 8 upgrades:
 *  - Indigo GlowCard ambient lighting (--glow-ai token)
 *  - ShimmerBadge on the confidence indicator
 *  - Better visual hierarchy: lead paragraph elevated, supporting insights
 *    styled as a timeline-style section with soft separators
 *  - Animated confidence bar below the badge
 *  - Recommendation chips have coloured left border instead of just a dot
 *  - AI avatar/icon in the header
 */

import { Panel, Pill, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { GlowCard, ShimmerBadge } from "@/components/dashboard/motion-primitives";
import {
  Sparkles, ChevronRight, RefreshCw, TrendingDown, TrendingUp, Minus,
  AlertTriangle, CheckCircle2, Bot, Eye, Droplets, Wind, ShieldAlert, Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TAP_PRESS, POP, EASE_OUT } from "@/lib/motion";
import { useState, useEffect } from "react";
import type {
  OutdoorGuidance, PollutionTrend, WeatherImpact,
  HealthRiskLabel, ActivityGuidance, ConfidenceResult, WatchItem,
} from "@/lib/ai-brief";

// ─── Typing reveal ────────────────────────────────────────────────────────────
// Streams the text character by character at ~30 chars/s — fast enough that
// it reads as "AI typing" not "slow load". Fully skipped on reduced-motion.

function useTypingReveal(text: string, enabled: boolean): string {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18); // ~55 chars/s — feels live without being tedious
    return () => clearInterval(id);
  }, [text, enabled]);

  return displayed;
}

export interface DailyBriefInsight {
  title: string;
  body: string;
  tag: string;
}

const TONE_COLOR: Record<string, string> = {
  success:     "var(--color-success)",
  warning:     "var(--color-warning)",
  destructive: "var(--color-destructive)",
  muted:       "var(--color-muted-foreground)",
};

function InsightChip({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "destructive" | "muted" }) {
  const prefersReduced = useReducedMotion();
  const c = TONE_COLOR[tone];
  return (
    <motion.div
      variants={POP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] hover:opacity-80 transition-opacity duration-150 cursor-default"
      style={{
        borderColor: `color-mix(in oklab, ${c} 28%, transparent)`,
        background:  `color-mix(in oklab, ${c} 8%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: c }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" style={{ color: c }}>{value}</span>
    </motion.div>
  );
}

function toneForOutdoor(g: OutdoorGuidance)  { return g === "Recommended" ? "success" : g === "Limit" ? "warning" : "destructive" as const; }
function toneForTrend(t: PollutionTrend)     { return t === "Improving" ? "success" : t === "Worsening" ? "destructive" : "muted" as const; }
function toneForWeather(w: WeatherImpact)    { return w === "Favorable" ? "success" : "muted" as const; }
function toneForRisk(r: HealthRiskLabel)     { return r === "Low" ? "success" : r === "Moderate" ? "warning" : "destructive" as const; }

function watchIconMap(icon: WatchItem["icon"]) {
  const map = {
    "trend-up":   TrendingUp,
    "trend-down": TrendingDown,
    "humidity":   Droplets,
    "wind":       Wind,
    "risk":       ShieldAlert,
    "water":      Waves,
    "stable":     CheckCircle2,
  } as const;
  return map[icon] ?? Minus;
}
function TrendIcon({ t }: { t: PollutionTrend }) {
  return t === "Improving" ? <TrendingDown className="size-3" /> : t === "Worsening" ? <TrendingUp className="size-3" /> : <Minus className="size-3" />;
}

// ─── Typing Reveal Paragraph ──────────────────────────────────────────────────
// Self-contained component so hooks are called at component level (not inside
// render callbacks), fully respecting the Rules of Hooks.

function TypingRevealParagraph({ greeting, body }: { greeting: string; body: string }) {
  const prefersReduced = useReducedMotion();
  const typedText = useTypingReveal(body, !prefersReduced);
  const stillTyping = !prefersReduced && typedText.length < body.length;

  return (
    <div
      className="rounded-xl p-4 space-y-2.5 relative overflow-hidden"
      style={{
        background: "color-mix(in oklab, var(--glow-ai) 60%, var(--color-muted) 30%)",
        border: "1px solid color-mix(in oklab, oklch(0.68 0.18 270) 18%, transparent)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-4 -right-4 size-16 rounded-full blur-2xl opacity-40 pointer-events-none"
        style={{ background: "oklch(0.68 0.18 270 / 0.5)" }}
      />
      <div className="relative text-sm font-semibold">{greeting}</div>
      <p className="relative text-sm text-muted-foreground leading-relaxed">
        {typedText}
        {stillTyping && (
          <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-text-bottom" aria-hidden />
        )}
      </p>
    </div>
  );
}

export function AIDailyBriefCard({
  greeting, userName, cityName: _cityName,
  leadInsight, supportingInsights,
  aqi: _aqi, aqiLabel,
  outdoorGuidance, pollutionTrend, weatherImpact, healthRisk,
  activityGuidance, confidence, watchItems, generatedAgo,
  isLoading, isRefreshing, onRefresh, isError, isEmpty,
}: {
  greeting: string; userName?: string; cityName: string;
  leadInsight?: DailyBriefInsight; supportingInsights: DailyBriefInsight[];
  aqi: number; aqiLabel: string;
  outdoorGuidance: OutdoorGuidance; pollutionTrend: PollutionTrend;
  weatherImpact: WeatherImpact; healthRisk: HealthRiskLabel;
  activityGuidance: ActivityGuidance; confidence: ConfidenceResult;
  watchItems: WatchItem[];
  generatedAgo: string;
  isLoading?: boolean; isRefreshing?: boolean; onRefresh?: () => void;
  isError?: boolean; isEmpty?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const confColor =
    confidence.pct >= 85 ? "var(--color-success)" :
    confidence.pct >= 60 ? "var(--color-warning)" :
    "var(--color-muted-foreground)";

  return (
    <GlowCard glowVar="--glow-ai" lift={false} className="p-0 overflow-visible">
      {/* Custom header — override GlowCard's relative wrapper */}
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Intelligence Center</div>
            <div className="text-base font-semibold tracking-tight mt-0.5 flex items-center gap-2">
              {/* AI avatar badge */}
              <span className="inline-flex size-6 items-center justify-center rounded-lg aurora shrink-0">
                <Bot className="size-3.5 text-white" />
              </span>
              AI Daily Brief
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isLoading && !isError && !isEmpty && (
              <ShimmerBadge color={confColor}>
                {confidence.pct}% confidence
              </ShimmerBadge>
            )}
            <motion.button
              whileTap={prefersReduced ? undefined : TAP_PRESS}
              onClick={onRefresh}
              disabled={isRefreshing || isLoading}
              aria-label="Regenerate AI Daily Brief"
              className="rounded-full p-1.5 hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CardSkeleton rows={4} />
            </motion.div>
          ) : isError ? (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={<AlertTriangle className="size-4" />}
                title="Unable to generate today's environmental summary."
                description="The dashboard remains fully usable — try again in a moment."
                action={onRefresh && (
                  <button onClick={onRefresh} className="text-xs font-medium text-primary inline-flex items-center gap-1">
                    <RefreshCw className="size-3.5" /> Retry
                  </button>
                )}
              />
            </motion.div>
          ) : isEmpty || !leadInsight ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={<Sparkles className="size-4" />}
                title="No environmental data available for this city."
                description="The AI summary will appear once data becomes available."
              />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Lead narrative — typing reveal */}
              <TypingRevealParagraph
                greeting={`${greeting}${userName ? `, ${userName.split(" ")[0]}` : ""} 👋`}
                body={leadInsight.body}
              />

              {/* Supporting insights — timeline style */}
              {supportingInsights.length > 0 && (
                <div className="space-y-2 pl-3 border-l-2 border-border/60">
                  {supportingInsights.map((ins) => (
                    <div key={ins.tag} className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground/80">{ins.tag}:</span> {ins.body}
                    </div>
                  ))}
                </div>
              )}

              {/* Insight chips */}
              <div className="flex flex-wrap gap-1.5">
                <InsightChip label="Air Quality"      value={aqiLabel}        tone={toneForOutdoor(outdoorGuidance)} />
                <InsightChip label="Outdoor Activity" value={outdoorGuidance} tone={toneForOutdoor(outdoorGuidance)} />
                <InsightChip label="Pollution Trend"  value={pollutionTrend}  tone={toneForTrend(pollutionTrend)} />
                <InsightChip label="Weather Impact"   value={weatherImpact}   tone={toneForWeather(weatherImpact)} />
                <InsightChip label="Health Risk"      value={healthRisk}      tone={toneForRisk(healthRisk)} />
              </div>

              {/* Confidence bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Data confidence</span>
                  <span className="tabular-nums font-medium" style={{ color: confColor }}>{confidence.pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: confColor }}
                    initial={prefersReduced ? false : { width: 0 }}
                    animate={{ width: `${confidence.pct}%` }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Activity guidance */}
              <div className="rounded-lg border border-border p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  {activityGuidance.mode === "avoid"
                    ? <AlertTriangle className="size-3.5 text-[var(--color-destructive)]" />
                    : <CheckCircle2 className="size-3.5 text-[var(--color-success)]" />}
                  {activityGuidance.mode === "recommended" ? "Recommended today"
                    : activityGuidance.mode === "limit" ? "Limit today" : "Avoid today"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activityGuidance.items.map((item) => (
                    <span
                      key={item}
                      className="text-xs rounded-full px-2.5 py-1 border transition-colors duration-150"
                      style={{
                        background: activityGuidance.mode === "avoid"
                          ? "color-mix(in oklab, var(--color-destructive) 7%, transparent)"
                          : "color-mix(in oklab, var(--color-muted) 40%, transparent)",
                        borderColor: activityGuidance.mode === "avoid"
                          ? "color-mix(in oklab, var(--color-destructive) 20%, transparent)"
                          : "var(--color-border)",
                        borderLeftWidth: "2px",
                        borderLeftColor: activityGuidance.mode === "avoid"
                          ? "var(--color-destructive)" : "var(--color-success)",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Things to Watch */}
              {watchItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Eye className="size-3.5" /> Things to Watch
                  </div>
                  {watchItems.map((item, i) => {
                    const WatchIcon = watchIconMap(item.icon);
                    const isAlert = item.icon === "trend-up" || item.icon === "risk";
                    return (
                      <motion.div
                        key={i}
                        initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}
                        className="flex items-start gap-2.5 rounded-lg p-2.5 text-xs"
                        style={{
                          background: isAlert
                            ? "color-mix(in oklab, var(--color-warning) 7%, transparent)"
                            : "color-mix(in oklab, var(--color-muted) 30%, transparent)",
                          border: `1px solid ${isAlert
                            ? "color-mix(in oklab, var(--color-warning) 18%, transparent)"
                            : "var(--color-border)"}`,
                        }}
                      >
                        <WatchIcon
                          className="size-3.5 shrink-0 mt-0.5"
                          style={{ color: isAlert ? "var(--color-warning)" : "var(--color-muted-foreground)" }}
                        />
                        <span className="text-muted-foreground leading-relaxed">{item.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <div className="flex items-center gap-1">
                  <TrendIcon t={pollutionTrend} /> Generated {generatedAgo}
                </div>
                <a className="text-primary inline-flex items-center gap-0.5 font-medium hover:underline" href="/intelligence">
                  View full analysis <ChevronRight className="size-3" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlowCard>
  );
}
