/**
 * WelcomeHero — Responsive Cinematic Citizen Dashboard Hero
 *
 * Immersive, atmospheric environmental hero that adapts seamlessly across
 * all desktop viewports (1920px down to 1280px) and mobile screens (320px to 430px).
 *
 * Layer stack:
 *   Layer 1 — Tier-reactive gradient background (EnvironmentBackground)
 *   Layer 2 — Responsively cropped environmental photo (EnvironmentBackground)
 *   Layer 3 — Multi-stage darkening and readability overlay (EnvironmentBackground)
 *   Layer 4 — Responsively scaled floating clouds (FloatingClouds)
 *   Layer 5 — Environmental particles (EnvironmentParticles)
 *   Layer 6 — Glassmorphism cards for AQI + Weather (AQIGlassCard, WeatherGlassCard)
 *   Layer 7 — Foreground content (live status bar, greeting, outdoor guidance)
 *
 * Structure:
 *   The hero shell is a neutral outer wrapper (rounded corners + shadow + clip)
 *   that contains:
 *     1. The photo panel — identical in every way to the original single-layer
 *        implementation (same min-height formula, same layers, same
 *        lg/md floating glass cards). This panel's rendered output for
 *        md/lg/xl viewports is byte-for-byte unchanged from before this fix.
 *     2. A mobile-only panel (md:hidden) that reuses the exact same
 *        AQIGlassCard / WeatherGlassCard components desktop uses, stacked
 *        full-width beneath the photo, so phones see the same premium glass
 *        cards — not a simplified, visually inconsistent substitute.
 *
 * Responsive Height (photo panel):
 *   Desktop: 420–480px  (unchanged — clamp(360px, 38vw, 480px))
 *   Tablet:  360–480px  (unchanged — same clamp, same breakpoints)
 *   Mobile:  400px      (scoped override, <768px only — see .gg-hero-photo
 *                        media query at the bottom of this file). The original
 *                        clamp() floors at 360px for effectively the entire
 *                        phone width range, which is shorter than this file's
 *                        own documented 360–420px mobile target and produces
 *                        an overly-squashed, near-square crop window for the
 *                        background photo. The override brings mobile in line
 *                        with the documented range without touching the
 *                        formula desktop/tablet rely on.
 */

import { useReducedMotion, motion } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { Sunrise, Sun, Moon, Moon as NightIcon, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getGreetingText } from "@/lib/format-time";
import { computeSceneCondition } from "@/lib/hero-scene";
import { FADE_UP, DUR_MD, EASE_OUT } from "@/lib/motion";

import { EnvironmentBackground } from "@/components/dashboard/hero/environment-background";
import { FloatingClouds } from "@/components/dashboard/hero/floating-clouds";
import { EnvironmentParticles } from "@/components/dashboard/hero/environment-particles";
import { AQIGlassCard } from "@/components/dashboard/hero/aqi-glass-card";
import { WeatherGlassCard } from "@/components/dashboard/hero/weather-glass-card";
import { LiveStatusBar } from "@/components/dashboard/hero/live-status-bar";

function greetingIcon(text: string) {
  if (text === "Good morning")   return Sunrise;
  if (text === "Good afternoon") return Sun;
  if (text === "Good night")     return NightIcon;
  return Moon;
}

function greetingEmoji(text: string) {
  if (text === "Good morning")   return "🌅";
  if (text === "Good afternoon") return "☀️";
  if (text === "Good evening")   return "🌆";
  return "🌙";
}

function getOutdoorMessage(aqi: number, cityName: string): string {
  if (aqi <= 50)  return `${cityName} is experiencing clean, healthy air quality today.`;
  if (aqi <= 100) return `Air quality in ${cityName} is acceptable for normal outdoor activity.`;
  if (aqi <= 150) return `Sensitive groups should consider reducing prolonged outdoor exposure in ${cityName}.`;
  if (aqi <= 200) return `Air quality is unhealthy — limit outdoor activities in ${cityName}.`;
  return `Hazardous air in ${cityName}. Minimize outdoor exposure and protect your health.`;
}

function getAqiGlow(aqi: number): string {
  if (aqi <= 50)  return "rgba(16,185,129,0.22)";
  if (aqi <= 100) return "rgba(234,179,8,0.22)";
  if (aqi <= 150) return "rgba(249,115,22,0.22)";
  if (aqi <= 200) return "rgba(239,68,68,0.22)";
  return "rgba(168,85,247,0.22)";
}

export interface WelcomeHeroProps {
  cityId?: string;
  userName?: string;
  cityName: string;
  country: string;
  aqi?: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number | null;
  isDay?: boolean | null;
  feelsLike?: number | null;
  uvIndex?: number | null;
  rainChance?: number | null;
  rainfall?: number | null;
  lastUpdated?: string;
  updatedAt?: string;
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
  weatherCode,
  isDay,
  feelsLike,
  uvIndex,
  rainChance,
  rainfall,
  sensorsOnline,
  lastUpdated,
  updatedAt,
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
  const scene = computeSceneCondition({ aqi, temp, humidity, windSpeed, weatherCode });
  const outdoorMessage = getOutdoorMessage(aqi, cityName);
  const aqiGlow = getAqiGlow(aqi);

  // Mouse-reactive spotlight (desktop only)
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
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl select-none border border-border/80 dark:border-white/10 shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.40)]"
      aria-label={`Citizen dashboard hero. ${greet}${userName ? `, ${userName.split(" ")[0]}` : ""}. ${outdoorMessage}`}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          PHOTO PANEL — single source of visual truth.
          Everything in this div is unchanged from the original
          implementation (same min-height formula, same layer stack, same
          lg/md floating glass cards). Desktop and tablet render identically
          to before. Only a scoped <768px min-height override (see the
          .gg-hero-photo media query below) and the removal of the
          mismatched mobile pill strip differ — the pill strip is replaced
          by the mobile card panel that follows this div, not by anything
          inside it.
          ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="gg-hero-photo relative overflow-hidden"
        style={{
          minHeight: "clamp(360px, 38vw, 480px)",
        }}
      >
        {/* ── Layers 1–3: Environment background + photo + responsive overlays ── */}
        <EnvironmentBackground aqi={aqi} cityName={cityName} cityId={cityId} />

        {/* ── Layer 4: Responsive animated clouds ── */}
        {!prefersReduced && <FloatingClouds />}

        {/* ── Layer 5: Atmospheric environmental particles ── */}
        <EnvironmentParticles aqi={aqi} />

        {/* ── Ambient AQI glow orb (top-left) ── */}
        <div
          aria-hidden
          className="absolute -top-1/4 -left-1/6 w-2/3 h-2/3 rounded-full blur-3xl pointer-events-none"
          style={{
            background: scene.glowColor,
            opacity: 0.45,
          }}
        />

        {/* ── Mouse-reactive spotlight (desktop only) ── */}
        {!prefersReduced && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none hidden md:block"
            style={{
              background: `radial-gradient(ellipse 35% 40% at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.05), transparent 70%)`,
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
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)",
                animation: "hero-sweep 9s ease-in-out 1s infinite",
              }}
            />
          </div>
        )}

        {/* ── Noise grain texture ── */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "180px 180px",
          }}
        />

        {/* ── Layer 6: Floating glassmorphism cards (Desktop: Stacked right) ── */}
        <div className="absolute bottom-6 right-6 hidden lg:flex flex-col gap-3 w-[215px] z-20">
          <AQIGlassCard aqi={aqi} />
          <WeatherGlassCard
            temp={temp}
            humidity={humidity}
            windSpeed={windSpeed}
            weatherCode={weatherCode}
            isDay={isDay}
            feelsLike={feelsLike ?? undefined}
            uvIndex={uvIndex ?? undefined}
            rainChance={rainChance ?? undefined}
            rainfall={rainfall ?? undefined}
            lastUpdated={lastUpdated}
            updatedAt={updatedAt}
          />
        </div>

        {/* ── Medium screens (Tablet): Horizontal compact card row ── */}
        <div className="absolute bottom-6 right-6 hidden md:flex lg:hidden flex-row gap-2.5 z-20 max-w-[320px]">
          <AQIGlassCard aqi={aqi} className="flex-1" />
        </div>

        {/* ── Layer 7: Foreground interactive content ── */}
        <div className="relative z-10 flex flex-col justify-between h-full p-4 sm:p-6 md:p-8 min-h-[inherit]">
          {/* Top: Live status bar */}
          <div className="w-full">
            <LiveStatusBar
              aqi={aqi}
              temp={temp}
              humidity={humidity}
              windSpeed={windSpeed}
              sensorsOnline={sensorsOnline}
              lastUpdated={lastUpdated}
            />
          </div>

          {/* Bottom: Location, Greeting + outdoor message */}
          <div className="mt-auto w-full md:max-w-[58%] lg:max-w-[50%] xl:max-w-[46%] pt-4">
            {/* Location badge */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR_MD, ease: EASE_OUT }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-[11px] font-medium text-white/80 mb-2"
            >
              <MapPin className="size-3 text-primary shrink-0" />
              <span>{cityName}, {country}</span>
            </motion.div>

            {/* Greeting line */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: DUR_MD, ease: EASE_OUT }}
              className="flex items-center gap-2 sm:gap-2.5 flex-wrap"
            >
              <Icon className="size-5 sm:size-6 text-white/80 shrink-0" aria-hidden />
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-md leading-tight">
                {greet}
                {userName ? `, ${userName.split(" ")[0]}` : ""}{" "}
                <span aria-hidden>{emoji}</span>
              </h1>
            </motion.div>

            {/* Subtitle / Outdoor message */}
            <motion.p
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: DUR_MD }}
              className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-white/70 leading-relaxed drop-shadow-sm max-w-xl"
            >
              {outdoorMessage}
            </motion.p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE AQI + WEATHER PANEL (md:hidden — below 768px only)
          Reuses the exact same AQIGlassCard / WeatherGlassCard components
          the desktop floating layer uses (same ring, icons, glow, typography,
          glassmorphism treatment), stacked full-width directly beneath the
          photo panel instead of floating over it. This replaces the old
          flattened "pill strip" so phones see the same premium cards
          desktop sees, just rearranged to fit — not a different design.
          Tablet (md, 768–1023px) keeps its existing single floating
          AQIGlassCard inside the photo panel above, so nothing is
          duplicated at that breakpoint.
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden px-4 sm:px-5 pt-3.5 pb-4 sm:pb-5 space-y-3 bg-card/95 dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.82),rgba(10,12,16,0.94))] border-t border-border/60 dark:border-white/10"
      >
        <AQIGlassCard aqi={aqi} />
        <WeatherGlassCard
          temp={temp}
          humidity={humidity}
          windSpeed={windSpeed}
          weatherCode={weatherCode}
          isDay={isDay}
          feelsLike={feelsLike ?? undefined}
          uvIndex={uvIndex ?? undefined}
          rainChance={rainChance ?? undefined}
          rainfall={rainfall ?? undefined}
          lastUpdated={lastUpdated}
          updatedAt={updatedAt}
        />
      </div>

      {/* ── Global CSS keyframes for this hero ── */}
      <style>{`
        @keyframes hero-sweep {
          0%   { transform: translateX(0); }
          100% { transform: translateX(300%); }
        }
        @keyframes live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes hero-sweep { from {} to {} }
          @keyframes live-dot   { from {} to {} }
        }
        /*
         * Mobile-only photo panel height override.
         * The desktop/tablet clamp(360px, 38vw, 480px) formula floors at
         * 360px for effectively the entire phone width range (320–767px),
         * which is shorter than this component's own documented 360–420px
         * mobile target and produces an overly-squashed background crop.
         * Scoped strictly to <768px so md/lg/xl (tablet + desktop) are
         * completely untouched.
         */
        @media (max-width: 767px) {
          .gg-hero-photo { min-height: 400px !important; }
        }
      `}</style>
    </motion.div>
  );
}
