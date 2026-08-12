import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, ArrowUpRight } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { copilotApi } from "@/lib/api/services.api";
import { findAqiBand, type City } from "@/lib/mock-data";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { ExperienceHeader, ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How is Belagavi AQI?",
  "Predict tomorrow's pollution.",
  "Summarize current environmental risks.",
  "Generate an environmental report.",
] as const;

type ChatMsg = { role: "user" | "ai"; text: string; locked?: boolean };

/**
 * The real `/copilot/chat` endpoint requires an authenticated session (by
 * design — it's the same endpoint the signed-in Copilot page uses). An
 * anonymous landing-page visitor can't reach it, so instead of a silent
 * failure or a fabricated "live" response, this grounds a preview answer in
 * the visitor's actual current city data and is upfront that a real
 * session unlocks the live model.
 */
function groundedPreviewAnswer(question: string, city: City): string {
  const band = findAqiBand(city.aqi);
  return `${city.name}'s AQI is currently ${city.aqi} (${band.label}). PM2.5 is ${city.pm25} µg/m³, PM10 is ${city.pm10} µg/m³. That's real current data — sign in for a live, personalized answer to "${question}" from the full GreenGuard Intelligence model.`;
}

function AiAvatar() {
  return (
    <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--color-chart-5)]/15 text-[color:var(--color-chart-5)]">
      <Sparkles className="size-3.5" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const reducedMotion = useReducedMotion();
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {!isUser && <AiAvatar />}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "border border-border/60 bg-card text-foreground",
        )}
      >
        {msg.text}
        {msg.locked && (
          <Link
            to="/login"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-[color:var(--color-primary)] hover:underline"
          >
            Sign in for live answers
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export function AICopilotExperience() {
  const { city } = useCity();
  const { isAuthenticated } = useAuth();
  const reducedMotion = useReducedMotion();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: `Hi! I'm GreenGuard Intelligence. Ask me about ${city.name}'s air quality, forecasts, or environmental risk.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, reducedMotion]);

  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id).then((r) => r.data),
    onSuccess: (data: { answer: string }) => {
      setMessages((h) => [...h, { role: "ai", text: data.answer }]);
    },
    // `variables` is the exact string passed to `.mutate()` below — using it
    // instead of the `question` state avoids a stale value, since the input
    // is already cleared by the time this fires.
    onError: (_error: unknown, variables: string) => {
      setMessages((h) => [...h, { role: "ai", text: groundedPreviewAnswer(variables, city), locked: true }]);
    },
  });

  const handleSend = (raw?: string) => {
    const text = (raw ?? question).trim();
    if (!text || chatMutation.isPending) return;

    setMessages((h) => [...h, { role: "user", text }]);
    setQuestion("");

    if (!isAuthenticated) {
      setMessages((h) => [...h, { role: "ai", text: groundedPreviewAnswer(text, city), locked: true }]);
      return;
    }
    chatMutation.mutate(text);
  };

  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      {/* Command-center backdrop — kept quiet, not glowy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-chart-5)]/[0.04] to-background" />
        <div
          className={cn(
            "absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full opacity-[0.1] blur-[130px]",
            !reducedMotion && "drift-blob",
          )}
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-chart-5) 55%, transparent), transparent 70%)",
          }}
        />
        <div
          className="grid-bg absolute inset-0 opacity-[0.18]"
          style={{
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 15%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 15%, transparent 75%)",
          }}
        />
      </div>

      <div className={`${LANDING_CONTAINER} flex flex-col items-center gap-8`}>
        <ExperienceHeader
          align="center"
          tone="chart5"
          eyebrow="AI Copilot"
          title="Ask GreenGuard Intelligence anything."
          sub="A real conversational interface, grounded in real city data. Sign in from any answer to unlock the full, live AI model."
        />

        <div className="glass-panel w-full max-w-2xl rounded-3xl p-4 shadow-2xl sm:p-6">
          <div
            aria-live="polite"
            className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            {chatMutation.isPending && (
              <div className="flex items-start gap-2">
                <AiAvatar />
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Try asking
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[color:var(--color-chart-5)]/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              handleSend();
            }}
            className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 py-1.5 focus-within:border-[color:var(--color-chart-5)]/50 transition-colors"
          >
            <Sparkles className="ml-1.5 size-4 shrink-0 text-muted-foreground/60" />
            <input
              value={question}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuestion(event.target.value)}
              placeholder="Ask about air quality, forecasts, risk…"
              aria-label="Ask GreenGuard Intelligence"
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!question.trim() || chatMutation.isPending}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>

        <ExperienceCTA to="/intelligence" tone="chart5">
          <Sparkles className="size-4" />
          Open AI Copilot
        </ExperienceCTA>
      </div>
    </section>
  );
}
