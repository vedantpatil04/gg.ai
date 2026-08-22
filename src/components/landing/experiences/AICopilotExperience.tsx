import { useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Send, Lock, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
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

type ChatMsg = {
  role: "user" | "ai";
  text: string;
  badge?: string;
  locked?: boolean;
};

function sampleAssistantResponse(city: City): string {
  const band = findAqiBand(city.aqi);
  return `${city.name}'s AQI is currently ${city.aqi} (${band.label}) with PM2.5 at ${city.pm25} µg/m³ and PM10 at ${city.pm10} µg/m³. Atmospheric conditions project steady dispersion over the next 24 hours.`;
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
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
            <Lock className="size-3" />
            Sign in for live conversational queries
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
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const previewMessages: ChatMsg[] = [
    {
      role: "ai",
      text: `Hi! I'm GreenGuard Intelligence. Ask me about ${city.name}'s real-time air quality, 72-hour forecasts, or environmental risk analysis.`,
    },
    {
      role: "user",
      text: `How is ${city.name}'s air quality and predictive dispersion today?`,
    },
    {
      role: "ai",
      text: sampleAssistantResponse(city),
      locked: true,
    },
  ];

  const handleAuthGate = () => {
    if (isAuthenticated) {
      navigate({ to: "/intelligence" });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <section className="relative overflow-hidden py-14 lg:py-16">
      {/* Command-center backdrop — kept quiet, not glowy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-chart-5)]/[0.04] to-background" />
        <div
          className={cn(
            "absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full opacity-[0.1] blur-[130px]",
            "drift-blob",
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
          eyebrow="GreenGuard Intelligence Center"
          title="Ask GreenGuard Intelligence anything."
          sub="An enterprise conversational intelligence system grounded in real environmental and sensor data. Sign in to start asking live questions."
        />

        <div className="glass-panel w-full max-w-2xl rounded-3xl p-4 shadow-2xl sm:p-6">
          <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-3.5 text-[color:var(--color-chart-5)]" />
              <span>Live Demonstration Preview</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="size-3 text-primary" />
              Grounded Model
            </span>
          </div>

          <div
            ref={chatContainerRef}
            aria-live="polite"
            className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1"
          >
            {previewMessages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
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
                  onClick={handleAuthGate}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[color:var(--color-chart-5)]/40 hover:text-foreground"
                >
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Input & Send Button — gated behind authentication */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuthGate();
            }}
            className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 py-1.5 focus-within:border-[color:var(--color-chart-5)]/50 transition-colors"
          >
            <Lock className="ml-1.5 size-4 shrink-0 text-muted-foreground/60" />
            <input
              type="text"
              readOnly
              onClick={handleAuthGate}
              onFocus={handleAuthGate}
              placeholder="Sign in to ask GreenGuard Intelligence…"
              aria-label="Sign in to ask GreenGuard Intelligence"
              className="flex-1 cursor-pointer bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Sign in to send"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>

        <ExperienceCTA to={isAuthenticated ? "/intelligence" : "/login"} tone="chart5">
          <Sparkles className="size-4" />
          Open GreenGuard Intelligence Center
        </ExperienceCTA>
      </div>
    </section>
  );
}
