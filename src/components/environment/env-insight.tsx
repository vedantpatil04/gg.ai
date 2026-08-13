import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, LogIn, Send, Sparkles } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { copilotApi, type EnvironmentInsightResponse } from "@/lib/api/services.api";
import { EnvInsightSkeleton } from "@/components/environment/env-loading-skeletons";
import { cn } from "@/lib/utils";

/**
 * EnvironmentalInsight — Environmental Overview, Phase 5: Grounded AI
 * Assistance.
 *
 * A restrained AI entry point, not a chatbot page: no persisted
 * conversation thread, no giant chat window — one grounded question,
 * one grounded answer, replaced (not accumulated) on the next question.
 *
 * Architecture rule (hard requirement): reuses the EXISTING Gemini/backend
 * AI infrastructure end-to-end.
 *  — Same Gemini client singleton and `generate()`/error-fallback helper as
 *    every other AI feature (services/gemini.service.ts) — no second
 *    provider.
 *  — Same `/api/copilot/*` auth/route family as the Copilot page's
 *    `/chat` — same `authenticate` + `authorize` middleware, same
 *    controller file, new endpoint `/environment-insight`.
 *  — Deliberately does NOT write to AIConversation — this is a lightweight,
 *    one-off contextual question per the Phase 5 spec, not a second
 *    conversation system.
 *  — Grounding (current readings, verified 7-day trend, selected Phase 4
 *    location) is assembled server-side from real data — this component
 *    never sends fabricated values, and never claims a modeled per-location
 *    estimate is a live sensor reading (the backend labels it explicitly;
 *    see gemini.service.ts's generateEnvironmentalInsight for how that
 *    label reaches the model).
 */

interface SelectedLocation {
  id: string;
  name: string;
  category: string;
  level: number;
}

// Rough, established WHO-adjacent thresholds used only to decide which
// suggested question to surface — not shown to the user as a claim, and
// never overrides what the AI itself says about the data.
function pickElevatedPollutant(city: {
  pm25?: number;
  no2?: number;
  o3?: number;
}): "pm25" | "no2" | "o3" | null {
  const candidates: Array<{ key: "pm25" | "no2" | "o3"; ratio: number }> = [];
  if (typeof city.pm25 === "number") candidates.push({ key: "pm25", ratio: city.pm25 / 35 });
  if (typeof city.no2 === "number") candidates.push({ key: "no2", ratio: city.no2 / 40 });
  if (typeof city.o3 === "number") candidates.push({ key: "o3", ratio: city.o3 / 70 });
  const elevated = candidates.filter((c) => c.ratio > 1).sort((a, b) => b.ratio - a.ratio);
  return elevated[0]?.key ?? null;
}

const POLLUTANT_QUESTION: Record<"pm25" | "no2" | "o3", string> = {
  pm25: "Why is PM2.5 elevated today?",
  no2: "Why is NO2 elevated today?",
  o3: "Why is ozone elevated today?",
};

function SectionHeader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
      <span
        id="env-insight-title"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
      >
        Environmental Insight
      </span>
    </div>
  );
}

export function EnvironmentalInsight({
  className,
  selectedLocation,
}: {
  className?: string;
  selectedLocation?: SelectedLocation | null;
}) {
  const { city } = useCity();
  const { isAuthenticated } = useAuth();
  const [customQuestion, setCustomQuestion] = useState("");
  const [result, setResult] = useState<EnvironmentInsightResponse | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const {
    mutate: ask,
    isPending,
    isError,
    reset,
  } = useMutation({
    mutationFn: (question: string) =>
      copilotApi.environmentInsight(question, city!.id, selectedLocation?.id),
    onSuccess: (res) => setResult(res.data),
  });

  // City switch: never let a previous city's answer linger.
  useEffect(() => {
    setResult(null);
    setAuthRequired(false);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?.id]);

  const suggestedQuestions = useMemo(() => {
    if (!city) return [];
    const qs = ["Why is air quality like this today?"];
    const elevated = pickElevatedPollutant(city);
    qs.push(elevated ? POLLUTANT_QUESTION[elevated] : "What should I pay attention to today?");
    qs.push(
      selectedLocation ? `Why is ${selectedLocation.name} different?` : "What changed recently?",
    );
    return qs;
  }, [city, selectedLocation]);

  if (!city) return <EnvInsightSkeleton className={className} />;

  const isUnauthenticated = !isAuthenticated;

  function handleAsk(question: string) {
    if (!question.trim()) return;
    if (isUnauthenticated) {
      setAuthRequired(true);
      return;
    }
    setAuthRequired(false);
    setResult(null);
    ask(question);
  }

  return (
    <section aria-labelledby="env-insight-title" className={cn("space-y-4", className)}>
      <SectionHeader />

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Ask GreenGuard about today&apos;s conditions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Answers are grounded in {city.name}&apos;s current, verified environmental data —
              GreenGuard will say so plainly if it doesn&apos;t have enough information to answer.
            </p>
          </div>
        </div>

        {/* Suggested questions — the primary, restrained entry point. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={isPending}
              className="text-xs font-medium px-3 py-2 rounded-full border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {q}
            </button>
          ))}
        </div>

        {/* One-line custom question — kept intentionally simple: no chat
            history, no multi-turn thread. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(customQuestion);
            setCustomQuestion("");
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="env-insight-input" className="sr-only">
            Ask a question about today&apos;s environmental conditions
          </label>
          <input
            id="env-insight-input"
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Or type your own question…"
            disabled={isPending}
            className="flex-1 min-w-0 text-sm rounded-full border border-border/70 bg-background px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !customQuestion.trim()}
            aria-label="Ask"
            className="shrink-0 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>

        {/* Live region: loading / answer / error are all announced here. */}
        <div aria-live="polite" className="min-h-0">
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1">
              <span
                className="size-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
                aria-hidden="true"
              />
              GreenGuard AI is thinking…
            </div>
          )}

          {!isPending && authRequired && (
            <div className="flex items-start gap-2 text-xs rounded-xl border border-border bg-muted/30 px-3.5 py-3">
              <AlertCircle
                className="size-4 shrink-0 text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                Sign in to ask GreenGuard AI about today&apos;s conditions.{" "}
                <Link to="/login" className="text-primary font-medium underline underline-offset-2">
                  <LogIn className="size-3 inline -mt-0.5 mr-0.5" aria-hidden="true" />
                  Sign in
                </Link>
              </span>
            </div>
          )}

          {!isPending && !authRequired && isError && (
            <div className="flex items-start gap-2 text-xs rounded-xl border border-border bg-muted/30 px-3.5 py-3">
              <AlertCircle
                className="size-4 shrink-0 text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                GreenGuard AI is temporarily unavailable. You can still explore the current
                environmental measurements and verified trend data above.
              </span>
            </div>
          )}

          {!isPending && !authRequired && !isError && result && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">“{result.question}”</p>
              <p className="text-sm whitespace-pre-line leading-relaxed">{result.answer}</p>
              {(result.hasVerifiedTrend || result.hasLocationContext) && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  Grounded in {city.name}&apos;s current readings
                  {result.hasVerifiedTrend ? ", verified 7-day trend" : ""}
                  {result.hasLocationContext ? ", and the selected location" : ""}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
