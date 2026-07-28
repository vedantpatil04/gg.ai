import { useMemo } from "react";
import { findAqiBand } from "@/lib/mock-data";

/**
 * Phase 6 Visual Enhancement — Environmental Ambient Background.
 *
 * Renders a purely decorative, pointer-events-none animated atmosphere
 * behind the Environmental Overview page. Four visual layers:
 *
 *   1. AQI-reactive base gradient — subtly shifts between green/amber/red
 *      depending on the current AQI band (reuses `findAqiBand`).
 *   2. Aurora blobs — two large, slowly morphing radial gradients that
 *      drift across the background on a 20-second loop.
 *   3. Floating particles — 18 tiny divs positioned pseudo-randomly using
 *      a seeded deterministic layout (no Math.random() so SSR-safe, no
 *      re-renders). They drift upward on staggered CSS animations.
 *   4. Radial vignette — a subtle dark-edge overlay so text always reads
 *      against a dark enough surface regardless of gradient position.
 *
 * ALL animations use CSS keyframes / transforms + opacity only.
 * No requestAnimationFrame, no setInterval, no canvas, no WebGL.
 * Every moving element is pointer-events:none and aria-hidden.
 *
 * `prefers-reduced-motion: reduce` is respected via a CSS media-query
 * written into the <style> tag — the keyframes are paused globally when
 * the user has reduced-motion on, so zero JS polling is needed.
 */

// ─── AQI-reactive palette ────────────────────────────────────────────────────

function aqiAtmosphere(aqi: number): { a: string; b: string; c: string } {
  const band = findAqiBand(aqi);
  switch (band.label) {
    case "Good":
      return {
        a: "oklch(0.45 0.16 165 / 0.22)", // emerald
        b: "oklch(0.50 0.14 200 / 0.16)", // teal
        c: "oklch(0.42 0.13 230 / 0.12)", // cyan-blue
      };
    case "Moderate":
      return {
        a: "oklch(0.50 0.15 140 / 0.20)",
        b: "oklch(0.55 0.16 80  / 0.14)", // warm-green / amber tint
        c: "oklch(0.48 0.12 200 / 0.10)",
      };
    case "Unhealthy (SG)":
    case "Unhealthy":
      return {
        a: "oklch(0.52 0.18 55  / 0.20)", // amber
        b: "oklch(0.48 0.14 30  / 0.14)", // orange
        c: "oklch(0.45 0.10 165 / 0.08)",
      };
    case "Very Unhealthy":
    case "Hazardous":
      return {
        a: "oklch(0.50 0.18 25  / 0.20)", // red-orange
        b: "oklch(0.44 0.14 10  / 0.14)", // red
        c: "oklch(0.40 0.10 320 / 0.08)", // muted purple
      };
    default:
      return {
        a: "oklch(0.45 0.16 165 / 0.22)",
        b: "oklch(0.50 0.14 200 / 0.16)",
        c: "oklch(0.42 0.13 230 / 0.12)",
      };
  }
}

// ─── Particle layout ─────────────────────────────────────────────────────────

/** Deterministic pseudo-random — seeded so values are stable across renders. */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface Particle {
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: string;
  delay: string;
}

function buildParticles(count: number): Particle[] {
  const rng = seededRng(42);
  return Array.from({ length: count }, (_, i) => ({
    left: `${Math.round(rng() * 100)}%`,
    top: `${Math.round(rng() * 100)}%`,
    size: Math.round(rng() * 3) + 2, // 2–5 px
    opacity: Math.round((rng() * 0.25 + 0.08) * 100) / 100, // 0.08–0.33
    duration: `${Math.round(rng() * 12 + 14)}s`, // 14–26 s
    delay: `-${Math.round(rng() * 20)}s`, // stagger via negative delay
  }));
}

const PARTICLES = buildParticles(18);

// ─── Inline keyframes ────────────────────────────────────────────────────────

/**
 * We inject keyframes as a <style> element rather than adding them to
 * styles.css because:
 *   a) This component is the only consumer — no global namespace pollution.
 *   b) The `prefers-reduced-motion` pause rule can live right next to the
 *      keyframes it controls, making the intent self-documenting.
 */
const KEYFRAME_CSS = `
@keyframes env-aurora-drift-a {
  0%   { transform: translate(0%,    0%)   scale(1);    border-radius: 60% 40% 55% 45%; }
  33%  { transform: translate(8%,   -6%)  scale(1.08); border-radius: 45% 55% 40% 60%; }
  66%  { transform: translate(-5%,   8%)  scale(0.96); border-radius: 55% 45% 60% 40%; }
  100% { transform: translate(0%,    0%)   scale(1);    border-radius: 60% 40% 55% 45%; }
}
@keyframes env-aurora-drift-b {
  0%   { transform: translate(0%,   0%)   scale(1);    border-radius: 40% 60% 45% 55%; }
  33%  { transform: translate(-7%,  6%)  scale(0.94); border-radius: 55% 45% 60% 40%; }
  66%  { transform: translate(6%,  -8%)  scale(1.06); border-radius: 45% 55% 40% 60%; }
  100% { transform: translate(0%,   0%)   scale(1);    border-radius: 40% 60% 45% 55%; }
}
@keyframes env-particle-float {
  0%   { transform: translateY(0)   opacity(1);   }
  100% { transform: translateY(-80px) opacity(0); }
}
@media (prefers-reduced-motion: reduce) {
  .env-aurora-a,
  .env-aurora-b,
  .env-particle { animation: none !important; }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function EnvAmbientBackground({ aqi }: { aqi?: number }) {
  const palette = useMemo(() => aqiAtmosphere(aqi ?? 50), [aqi]);

  return (
    <>
      {/* Keyframes — injected once, not on every render */}
      <style>{KEYFRAME_CSS}</style>

      {/*
        Outer wrapper — absolute, fills the EnvironmentOverview div,
        behind all content (z-0), pointer-events:none so nothing is blocked.
      */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {/* 1 — Base gradient (AQI-reactive, static — no animation needed) */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 40% at 50% 0%,   ${palette.a}, transparent 65%),
              radial-gradient(ellipse 60% 30% at 15% 60%,  ${palette.b}, transparent 55%),
              radial-gradient(ellipse 50% 25% at 85% 40%,  ${palette.c}, transparent 50%)
            `,
          }}
        />

        {/* 2a — Aurora blob A */}
        <div
          className="env-aurora-a absolute"
          style={{
            top: "-15%",
            left: "-10%",
            width: "65%",
            height: "55%",
            background: `radial-gradient(ellipse, ${palette.a} 0%, transparent 70%)`,
            filter: "blur(60px)",
            animation: "env-aurora-drift-a 22s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* 2b — Aurora blob B */}
        <div
          className="env-aurora-b absolute"
          style={{
            bottom: "-10%",
            right: "-5%",
            width: "60%",
            height: "50%",
            background: `radial-gradient(ellipse, ${palette.b} 0%, transparent 70%)`,
            filter: "blur(70px)",
            animation: "env-aurora-drift-b 28s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* 3 — Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="env-particle absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              background: palette.a,
              boxShadow: `0 0 ${p.size * 2}px ${palette.b}`,
              animation: `env-particle-float ${p.duration} linear ${p.delay} infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}

        {/* 4 — Radial vignette — keeps edges dark for readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 40%, var(--color-background) 100%)",
          }}
        />
      </div>
    </>
  );
}
