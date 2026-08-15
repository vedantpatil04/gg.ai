/**
 * WelcomeHero — Cinematic Phase 1
 *
 * Complete replacement of the Phase 10 hero with an immersive, cinematic
 * environmental experience. All existing props and exports are preserved
 * for backward compatibility with dashboard.tsx.
 *
 * Layer stack (bottom → top):
 *   Layer 1 — Animated gradient background           (EnvironmentBackground)
 *   Layer 2 — Real environmental photo               (EnvironmentBackground)
 *   Layer 3 — Dark overlay                           (EnvironmentBackground)
 *   Layer 4 — Animated clouds                        (FloatingClouds)
 *   Layer 5 — Environmental particles                (EnvironmentParticles)
 *   Layer 6 — Glassmorphism cards (AQI + Weather)    (AQIGlassCard, WeatherGlassCard)
 *   Layer 7 — Foreground content                     (greeting, status bar)
 *
 * Height: 460px desktop / 520px on wide screens / responsive on mobile
 * All animations: GPU-only (transform + opacity).
 * prefers-reduced-motion: ambient layers suppressed, content remains.
 *
 * No backend / API changes. No route changes. TypeScript strict.
 */

import { useReducedMotion, motion } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { Sunrise, Sun, Moon, Moon as NightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getGreetingText } from "@/lib/format-time";
import { findAqiBand } from "@/lib/mock-data";
import { computeSceneCondition } from "@/lib/hero-scene";
import { FADE_UP, DUR_MD, EASE_OUT } from "@/lib/motion";

import { EnvironmentBackground } from "@/components/dashboard/hero/environment-background";
import { FloatingClouds } from "@/components/dashboard/hero/floating-clouds";
import { EnvironmentParticles } from "@/components/dashboard/hero/environment-particles";
import { AQIGlassCard } from "@/components/dashboard/hero/aqi-glass-card";
import { WeatherGlassCard } from "@/components/dashboard/hero/weather-glass-card";
import { LiveStatusBar } from "@/components/dashboard/hero/live-status-bar";

// ─── Greeting icon ────────────────────────────────────────────────────────────

function greetingIcon(text: string) {
  if (text === "Good morning")   return Sunrise;
  if (text === "Good afternoon") return Sun;
  if (text === "Good night")     return NightIcon;
  return Moon;
}

// ─── Greeting emoji ───────────────────────────────────────────────────────────

function greetingEmoji(text: string) {
  if (text === "Good morning")   return "🌅";
  if (text === "Good afternoon") return "☀️";
  if (text === "Good evening")   return "🌆";
  return "🌙";
}

// ─── Outdoor safety message driven by AQI ────────────────────────────────────

function getOutdoorMessage(aqi: number, cityName: string): string {
  if (aqi <= 50)  return `${cityName} is experiencing healthy environmental conditions today.`;
  if (aqi <= 100) return `Air quality in ${cityName} is acceptable for most people.`;
  if (aqi <= 150) return `Sensitive groups should limit outdoor activities in ${cityName}.`;
  if (aqi <= 200) return `Air quality is unhealthy — limit outdoor exposure in ${cityName}.`;
  return `Very unhealthy air in ${cityName}. Avoid outdoor activities.`;
}

// ─── AQI theme color (for glow / borders) ────────────────────────────────────

function getAqiGlow(aqi: number): string {
  if (aqi <= 50)  return "rgba(16,185,129,0.25)";
  if (aqi <= 100) return "rgba(234,179,8,0.25)";
  if (aqi <= 150) return "rgba(249,115,22,0.25)";
  if (aqi <= 200) return "rgba(239,68,68,0.25)";
  return "rgba(168,85,247,0.25)";
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface WelcomeHeroProps {
  /** city.id from CityContext — used to resolve the background photo */
  cityId?: string;
  userName?: string;
  cityName: string;
  country: string;
  aqi?: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  /** Passed as lastUpdated string from dashboard */
  lastUpdated?: string;
  /** Number of active sensors (optional enhancement) */
  sensorsOnline?: number;
}

export function WelcomeHero({
  cityName,
  cityId,
  country,
  aqi = 0,
  temp,
  humidity,
  windSpeed,
  sensorsOnline,
  lastUpdated,
  userName,
}: WelcomeHeroProps) {
  const { t } = useTranslation("dashboard");
  const prefersReduced = useReducedMotion() ?? false;
  const rawGreet = getGreetingText();
  const greet =
    rawGreet === "Good morning"
      ? t("goodMorning")
      : rawGreet === "Good afternoon"
        ? t("goodAfternoon")
        : t("goodEvening");
  const emoji = greetingEmoji(rawGreet);
  const Icon = greetingIcon(rawGreet);
  const band = findAqiBand(aqi);
  const scene = computeSceneCondition({ aqi, temp, humidity, windSpeed });
  const outdoorMessage = getOutdoorMessage(aqi, cityName);
  const aqiGlow = getAqiGlow(aqi);

  // Mouse-reactive spotlight (desktop only, respects reduced-motion)
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [prefersReduced],
  );

  return (
    <motion.div
      ref={containerRef}
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden rounded-2xl select-none"
      style={{
        minHeight: "clamp(320px, 40vw, 520px)",
        // AQI-reactive border glow (hero only — not the whole app)
        boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.45), 0 0 60px ${aqiGlow}`,
      }}
      aria-label={`Environmental dashboard hero. ${greet}${userName ? `, ${userName.split(" ")[0]}` : ""}. ${outdoorMessage}`}
    >
      {/* ── Layers 1–3: Environment background + photo + overlay ── */}
      <EnvironmentBackground aqi={aqi} cityName={cityName} cityId={cityId} />

      {/* ── Layer 4: Animated clouds ── */}
      {!prefersReduced && <FloatingClouds />}

      {/* ── Layer 5: Environmental particles ── */}
      <EnvironmentParticles aqi={aqi} />

      {/* ── Ambient AQI glow orb (top-left) ── */}
      <div
        aria-hidden
        className="absolute -top-1/4 -left-1/6 w-2/3 h-2/3 rounded-full blur-3xl pointer-events-none"
        style={{
          background: scene.glowColor,
          opacity: 0.5,
        }}
      />

      {/* ── Mouse-reactive spotlight ── */}
      {!prefersReduced && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 35% 40% at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.06), transparent 70%)`,
          }}
        />
      )}

      {/* ── Light sweep highlight ── */}
      {!prefersReduced && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <div
            className="absolute top-0 left-[-100%] w-1/2 h-full"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
              animation: "hero-sweep 8s ease-in-out 1s infinite",
            }}
          />
        </div>
      )}

      {/* ── Noise grain texture ── */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />

      {/* ── Bottom readability gradient ── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.20) 45%, transparent 100%)",
        }}
      />

      {/* ── Layer 6: Glassmorphism cards (positioned right, stacked) ── */}
      <div className="absolute bottom-5 right-5 hidden lg:flex flex-col gap-3 w-[220px] z-20">
        <AQIGlassCard aqi={aqi} />
        <WeatherGlassCard
          temp={temp}
          humidity={humidity}
          windSpeed={windSpeed}
        />
      </div>

      {/* ── Medium screens: horizontal card row ── */}
      <div className="absolute bottom-5 right-5 hidden md:flex lg:hidden flex-row gap-2 z-20 max-w-[340px]">
        <AQIGlassCard aqi={aqi} className="flex-1" />
      </div>

      {/* ── Layer 7: Foreground content ── */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5 md:p-8 min-h-[inherit]">
        {/* Top: Live status bar */}
        <LiveStatusBar
          aqi={aqi}
          temp={temp}
          humidity={humidity}
          windSpeed={windSpeed}
          sensorsOnline={sensorsOnline}
          lastUpdated={lastUpdated}
        />

        {/* Bottom: Greeting + subtitle */}
        <div className="mt-auto md:max-w-[56%] lg:max-w-[48%] xl:max-w-[44%]">
          {/* Greeting line */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: DUR_MD, ease: EASE_OUT }}
            className="flex items-center gap-2.5 flex-wrap"
          >
            <Icon className="size-6 text-white/75 shrink-0" aria-hidden />
            <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold tracking-tight text-white drop-shadow-md leading-tight">
              {greet}
              {userName ? `, ${userName.split(" ")[0]}` : ""}{" "}
              <span aria-hidden>{emoji}</span>
            </h1>
          </motion.div>

          {/* City subtitle */}
          <motion.p
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.30, duration: DUR_MD }}
            className="mt-2 text-sm md:text-base text-white/65 leading-relaxed drop-shadow-sm"
          >
            {cityName}, {country} · {outdoorMessage}
          </motion.p>

          {/* Mobile-only inline AQI badge */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: DUR_MD, ease: EASE_OUT }}
            className="mt-4 flex flex-wrap items-center gap-2 md:hidden"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold"
              style={{
                background: `color-mix(in oklab, ${band.color} 20%, rgba(0,0,0,0.55))`,
                border: `1px solid color-mix(in oklab, ${band.color} 45%, transparent)`,
                backdropFilter: "blur(12px)",
                color: "white",
              }}
            >
              {!prefersReduced && (
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{
                    background: band.color,
                    animation: "live-dot 2s ease-in-out infinite",
                  }}
                />
              )}
              AQI {aqi}
              <span
                className="text-[11px] font-normal px-1.5 py-0.5 rounded-lg"
                style={{
                  background: `color-mix(in oklab, ${band.color} 28%, transparent)`,
                  color: band.color,
                }}
              >
                {band.label}
              </span>
            </div>

            {temp != null && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/80"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {temp}°C
              </div>
            )}
            {humidity != null && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/80"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {humidity}%
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Global CSS keyframes for this hero ── */}
      <style>{`
        @keyframes hero-sweep {
          0%   { transform: translateX(0); }
          100% { transform: translateX(300%); }
        }
        @keyframes live-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes hero-sweep { from {} to {} }
          @keyframes live-dot   { from {} to {} }
        }
      `}</style>
    </motion.div>
  );
}
