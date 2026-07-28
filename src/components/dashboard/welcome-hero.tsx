/**
 * WelcomeHero — Phase 10
 *
 * The hero is now a "living environmental scene" driven by
 * computeSceneCondition() from src/lib/hero-scene.ts. The scene reacts to:
 *   - Time of day  (night / dawn / morning / afternoon / golden / evening)
 *   - AQI tier     (good / moderate / poor / hazardous)
 *   - Weather proxy derived from humidity + windSpeed + temp
 *     (clear / cloudy / rainy / windy / foggy)
 *
 * Visual layers (bottom → top):
 *   Sky gradient background
 *   Stars (night/dawn)
 *   Moon (night/dawn)
 *   Sun / sunrise disc (day/dusk)
 *   Eco-city SVG illustration (right, md+)
 *   Clouds (cloudy/rainy/poor AQI)
 *   Rain streaks (rainy proxy)
 *   Fog layers (foggy/hazardous)
 *   Environmental particles (leaves/dust)
 *   Floating AI orb (top-right, md+)
 *   Mouse-reactive spotlight
 *   Light sweep highlight
 *   Grid texture
 *   Bottom-gradient readability mask
 *   Content (greeting + telemetry strip)
 *
 * No external images, no video, no large assets.
 * All animation via Framer Motion transform/opacity — GPU-only.
 * prefers-reduced-motion suppresses every ambient animation.
 */

import { Sunrise, Sun, Moon, Wind, Droplets, ThermometerSun, Gauge } from "lucide-react";
import { getGreetingText } from "@/lib/format-time";
import { findAqiBand } from "@/lib/mock-data";
import { computeSceneCondition } from "@/lib/hero-scene";
import {
  SunLayer,
  MoonLayer,
  StarsLayer,
  CloudLayer,
  RainLayer,
  FogLayer,
  ParticleLayer,
  EcoIllustration,
  FloatingAIOrb,
} from "@/components/dashboard/hero-scene";
import { motion, useReducedMotion } from "framer-motion";
import { FADE_UP, DUR_MD, DUR_LG, EASE_OUT } from "@/lib/motion";
import { useRef, useState, useCallback } from "react";

function greetingIcon(text: string) {
  if (text === "Good morning") return Sunrise;
  if (text === "Good afternoon") return Sun;
  return Moon;
}

export function WelcomeHero({
  userName,
  cityName,
  country,
  aqi = 0,
  temp,
  humidity,
  windSpeed,
}: {
  userName?: string;
  cityName: string;
  country: string;
  aqi?: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
}) {
  const prefersReduced = useReducedMotion() ?? false;
  const hour = new Date().getHours();
  const greet = getGreetingText(hour);
  const Icon = greetingIcon(greet);
  const band = findAqiBand(aqi);
  const scene = computeSceneCondition({ aqi, temp, humidity, windSpeed });

  // Mouse-reactive spotlight
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
      className="relative overflow-hidden rounded-2xl min-h-[240px] md:min-h-[290px] flex items-end select-none noise"
      style={{
        background: `linear-gradient(145deg, ${scene.sky.top} 0%, ${scene.sky.bottom} 100%)`,
      }}
    >
      {/* ── Scene layers (back → front) ── */}

      {/* Stars */}
      {scene.showStars && <StarsLayer prefersReduced={prefersReduced} />}

      {/* Moon */}
      {scene.showMoon && <MoonLayer prefersReduced={prefersReduced} />}

      {/* Sun */}
      {scene.showSun && <SunLayer low={scene.sunLow} prefersReduced={prefersReduced} />}

      {/* Eco-city illustration (right side, behind clouds) */}
      {scene.showIllustration && <EcoIllustration aqiTier={scene.aqiTier} />}

      {/* Clouds */}
      {scene.showClouds && (
        <CloudLayer opacity={scene.cloudOpacity} prefersReduced={prefersReduced} />
      )}

      {/* Rain */}
      {scene.showRain && <RainLayer prefersReduced={prefersReduced} />}

      {/* Fog / mist */}
      {scene.showFog && <FogLayer prefersReduced={prefersReduced} />}

      {/* Environmental particles */}
      <ParticleLayer kind={scene.particleKind} prefersReduced={prefersReduced} />

      {/* Floating AI orb */}
      <FloatingAIOrb prefersReduced={prefersReduced} />

      {/* Ambient AQI glow */}
      <div
        aria-hidden
        className="absolute -top-1/3 -left-1/4 w-2/3 h-2/3 rounded-full blur-3xl pointer-events-none"
        style={{ background: scene.glowColor }}
      />

      {/* Mouse-reactive spotlight */}
      {!prefersReduced && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 38% 38% at ${mousePos.x}% ${mousePos.y}%, oklch(1 0 0 / 0.07), transparent 70%)`,
          }}
        />
      )}

      {/* Light sweep */}
      {!prefersReduced && <div className="light-sweep" aria-hidden />}

      {/* Grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Bottom readability gradient */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none"
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full p-5 md:p-8 md:max-w-[58%]">
        {/* Greeting */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: DUR_MD, ease: EASE_OUT }}
          className="flex items-center gap-2 text-2xl md:text-3xl font-semibold tracking-tight text-white drop-shadow-sm"
        >
          <Icon className="size-6 text-white/80 shrink-0" />
          {greet}
          {userName ? `, ${userName.split(" ")[0]}` : ""} 👋
        </motion.div>

        {/* City subtitle */}
        <motion.p
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: DUR_MD }}
          className="mt-1 text-sm text-white/60"
        >
          {cityName}, {country} · Your environmental dashboard is ready.
        </motion.p>

        {/* Live telemetry strip */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: DUR_LG, ease: EASE_OUT }}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {/* AQI badge — live pulse dot */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold backdrop-blur-sm"
            style={{
              background: `color-mix(in oklab, ${band.color} 22%, oklch(0 0 0 / 0.5))`,
              border: `1px solid color-mix(in oklab, ${band.color} 48%, transparent)`,
              color: "white",
            }}
          >
            {/* Live pulse dot */}
            {!prefersReduced && (
              <span
                className="size-1.5 rounded-full pulse-dot shrink-0"
                style={{ background: band.color }}
              />
            )}
            <Gauge className="size-3.5 shrink-0" />
            AQI {aqi}
            <span
              className="text-[11px] font-normal px-1.5 py-0.5 rounded-lg"
              style={{ background: `color-mix(in oklab, ${band.color} 30%, transparent)` }}
            >
              {band.shortLabel}
            </span>
          </div>

          {temp != null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/80 backdrop-blur-sm bg-white/10 border border-white/15">
              <ThermometerSun className="size-3.5 shrink-0" /> {temp}°C
            </div>
          )}
          {humidity != null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/80 backdrop-blur-sm bg-white/10 border border-white/15">
              <Droplets className="size-3.5 shrink-0" /> {humidity}%
            </div>
          )}
          {windSpeed != null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white/80 backdrop-blur-sm bg-white/10 border border-white/15">
              <Wind className="size-3.5 shrink-0" /> {windSpeed} km/h
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
