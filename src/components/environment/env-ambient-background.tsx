import { useMemo } from "react";
import { findAqiBand } from "@/lib/mock-data";

/**
 * V3 Environmental Ambient Background — Cinematic Multi-Layer Atmosphere.
 *
 * Seven visual layers composited from back to front:
 *   1. Deep base gradient — dark environmental tone
 *   2. AQI-reactive radial atmosphere
 *   3. Primary aurora blob A — large, slow drift
 *   4. Secondary aurora blob B — offset drift
 *   5. Tertiary aurora blob C — accent, faster
 *   6. Light shaft rays — emanating from upper-center
 *   7. Floating particles (22) — deterministic positions
 *   8. Noise grain texture — via SVG feTurbulence
 *   9. Bottom vignette — readability anchor
 *
 * ALL animations: CSS keyframes, GPU-accelerated transform/opacity only.
 * prefers-reduced-motion respected via CSS media query.
 * No JS timers, no canvas, no WebGL.
 */

// ─── AQI-reactive palette ─────────────────────────────────────────────────────

interface AtmospherePalette {
  a: string; // primary aurora color
  b: string; // secondary aurora color
  c: string; // accent aurora color
  base1: string; // deep base gradient stop 1
  base2: string; // deep base gradient stop 2
  shaft: string; // light shaft color
}

function aqiAtmosphere(aqi: number): AtmospherePalette {
  const band = findAqiBand(aqi);
  switch (band.label) {
    case "Good":
      return {
        a: "oklch(0.55 0.18 160 / 0.28)",   // emerald
        b: "oklch(0.50 0.15 200 / 0.20)",   // teal
        c: "oklch(0.45 0.12 240 / 0.14)",   // cyan-blue
        base1: "oklch(0.12 0.025 200)",
        base2: "oklch(0.10 0.018 240)",
        shaft: "oklch(0.65 0.16 155 / 0.06)",
      };
    case "Moderate":
      return {
        a: "oklch(0.55 0.16 145 / 0.24)",
        b: "oklch(0.58 0.17 85  / 0.18)",   // warm amber-green
        c: "oklch(0.50 0.12 200 / 0.12)",
        base1: "oklch(0.12 0.022 180)",
        base2: "oklch(0.10 0.016 220)",
        shaft: "oklch(0.75 0.15 80 / 0.05)",
      };
    case "Unhealthy (SG)":
    case "Unhealthy":
      return {
        a: "oklch(0.56 0.20 58  / 0.24)",   // amber
        b: "oklch(0.50 0.16 32  / 0.18)",   // orange
        c: "oklch(0.46 0.10 165 / 0.10)",
        base1: "oklch(0.11 0.025 40)",
        base2: "oklch(0.09 0.020 220)",
        shaft: "oklch(0.72 0.18 60 / 0.05)",
      };
    case "Very Unhealthy":
    case "Hazardous":
      return {
        a: "oklch(0.52 0.20 28  / 0.24)",   // red-orange
        b: "oklch(0.46 0.16 12  / 0.18)",   // red
        c: "oklch(0.40 0.10 320 / 0.10)",   // muted purple
        base1: "oklch(0.10 0.028 20)",
        base2: "oklch(0.09 0.020 240)",
        shaft: "oklch(0.65 0.20 28 / 0.04)",
      };
    default:
      return {
        a: "oklch(0.55 0.18 160 / 0.28)",
        b: "oklch(0.50 0.15 200 / 0.20)",
        c: "oklch(0.45 0.12 240 / 0.14)",
        base1: "oklch(0.12 0.025 200)",
        base2: "oklch(0.10 0.018 240)",
        shaft: "oklch(0.65 0.16 155 / 0.06)",
      };
  }
}

// ─── Particle system ──────────────────────────────────────────────────────────

interface Particle {
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: string;
  delay: string;
  blur: number;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildParticles(count: number): Particle[] {
  const rng = seededRng(137);
  return Array.from({ length: count }, () => ({
    left: `${Math.round(rng() * 100)}%`,
    top: `${Math.round(rng() * 100)}%`,
    size: Math.round(rng() * 4) + 1,
    opacity: Math.round((rng() * 0.30 + 0.06) * 100) / 100,
    duration: `${Math.round(rng() * 15 + 18)}s`,
    delay: `-${Math.round(rng() * 25)}s`,
    blur: Math.round(rng() * 2),
  }));
}

const PARTICLES = buildParticles(22);

// ─── Keyframe CSS ─────────────────────────────────────────────────────────────

const KEYFRAME_CSS = `
@keyframes v3-aurora-a {
  0%   { transform: translate(0%,    0%)   scale(1)    rotate(0deg);   border-radius: 60% 40% 55% 45% / 55% 60% 40% 50%; }
  25%  { transform: translate(6%,   -8%)   scale(1.10) rotate(2deg);   border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; }
  50%  { transform: translate(-4%,   6%)   scale(0.95) rotate(-1deg);  border-radius: 55% 45% 60% 40% / 45% 55% 50% 60%; }
  75%  { transform: translate(8%,    4%)   scale(1.05) rotate(1.5deg); border-radius: 40% 60% 50% 55% / 50% 45% 60% 40%; }
  100% { transform: translate(0%,    0%)   scale(1)    rotate(0deg);   border-radius: 60% 40% 55% 45% / 55% 60% 40% 50%; }
}
@keyframes v3-aurora-b {
  0%   { transform: translate(0%,   0%)   scale(1)    rotate(0deg);   border-radius: 40% 60% 45% 55%; }
  33%  { transform: translate(-8%,  7%)   scale(0.93) rotate(-2deg);  border-radius: 55% 45% 60% 40%; }
  66%  { transform: translate(7%,  -9%)   scale(1.07) rotate(2deg);   border-radius: 45% 55% 40% 60%; }
  100% { transform: translate(0%,   0%)   scale(1)    rotate(0deg);   border-radius: 40% 60% 45% 55%; }
}
@keyframes v3-aurora-c {
  0%   { transform: translate(0%,  0%)  scale(1);   }
  50%  { transform: translate(-6%, 5%)  scale(1.12); }
  100% { transform: translate(0%,  0%)  scale(1);   }
}
@keyframes v3-shaft-rotate {
  0%   { transform: rotate(-12deg) scaleX(1);   opacity: 1; }
  50%  { transform: rotate(-9deg)  scaleX(1.08); opacity: 0.8; }
  100% { transform: rotate(-12deg) scaleX(1);   opacity: 1; }
}
@keyframes v3-shaft-rotate-2 {
  0%   { transform: rotate(5deg)  scaleX(1);    opacity: 0.7; }
  50%  { transform: rotate(8deg)  scaleX(0.95); opacity: 1; }
  100% { transform: rotate(5deg)  scaleX(1);    opacity: 0.7; }
}
@keyframes v3-particle-float {
  0%   { transform: translateY(0px)   scale(1);    opacity: var(--p-op); }
  50%  { transform: translateY(-40px) scale(1.1);  opacity: calc(var(--p-op) * 1.3); }
  100% { transform: translateY(-90px) scale(0.8);  opacity: 0; }
}
@keyframes v3-grain-shift {
  0%, 100% { transform: translate(0, 0); }
  20%       { transform: translate(-2%, -2%); }
  40%       { transform: translate(-1%, 2%); }
  60%       { transform: translate(2%, -1%); }
  80%       { transform: translate(1%, 1%); }
}
@media (prefers-reduced-motion: reduce) {
  .v3-aurora-a, .v3-aurora-b, .v3-aurora-c,
  .v3-shaft-1, .v3-shaft-2,
  .v3-particle, .v3-grain { animation-play-state: paused !important; }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function EnvAmbientBackground({ aqi }: { aqi?: number }) {
  const palette = useMemo(() => aqiAtmosphere(aqi ?? 50), [aqi]);

  return (
    <>
      <style>{KEYFRAME_CSS}</style>

      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {/* Layer 1 — Deep environmental base */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${palette.base1} 0%, ${palette.base2} 60%, oklch(0.08 0.012 230) 100%)`,
          }}
        />

        {/* Layer 2 — AQI-reactive atmospheric glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 90% 50% at 50% -10%,  ${palette.a}, transparent 65%),
              radial-gradient(ellipse 70% 35% at 10% 55%,   ${palette.b}, transparent 55%),
              radial-gradient(ellipse 60% 30% at 90% 45%,   ${palette.c}, transparent 50%)
            `,
          }}
        />

        {/* Layer 3a — Primary aurora blob */}
        <div
          className="v3-aurora-a absolute"
          style={{
            top: "-20%",
            left: "-15%",
            width: "70%",
            height: "65%",
            background: `radial-gradient(ellipse, ${palette.a} 0%, transparent 68%)`,
            filter: "blur(55px)",
            animation: "v3-aurora-a 26s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Layer 3b — Secondary aurora blob */}
        <div
          className="v3-aurora-b absolute"
          style={{
            bottom: "-15%",
            right: "-10%",
            width: "65%",
            height: "60%",
            background: `radial-gradient(ellipse, ${palette.b} 0%, transparent 68%)`,
            filter: "blur(65px)",
            animation: "v3-aurora-b 32s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Layer 3c — Accent aurora (upper right) */}
        <div
          className="v3-aurora-c absolute"
          style={{
            top: "5%",
            right: "-5%",
            width: "45%",
            height: "40%",
            background: `radial-gradient(ellipse, ${palette.c} 0%, transparent 65%)`,
            filter: "blur(80px)",
            animation: "v3-aurora-c 18s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Layer 4 — Cinematic light shafts */}
        <div
          className="v3-shaft-1 absolute"
          style={{
            top: "-5%",
            left: "35%",
            width: "2px",
            height: "75%",
            background: `linear-gradient(180deg, ${palette.shaft} 0%, transparent 100%)`,
            filter: "blur(18px)",
            transformOrigin: "top center",
            animation: "v3-shaft-rotate 14s ease-in-out infinite",
            willChange: "transform, opacity",
          }}
        />
        <div
          className="v3-shaft-2 absolute"
          style={{
            top: "-5%",
            left: "55%",
            width: "1.5px",
            height: "60%",
            background: `linear-gradient(180deg, ${palette.shaft} 0%, transparent 100%)`,
            filter: "blur(22px)",
            transformOrigin: "top center",
            animation: "v3-shaft-rotate-2 19s ease-in-out infinite",
            willChange: "transform, opacity",
          }}
        />

        {/* Layer 5 — Floating environmental particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="v3-particle absolute rounded-full"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                "--p-op": p.opacity,
                opacity: p.opacity,
                background: i % 3 === 0 ? palette.a : i % 3 === 1 ? palette.b : palette.c,
                filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
                animation: `v3-particle-float ${p.duration} linear ${p.delay} infinite`,
                willChange: "transform, opacity",
              } as React.CSSProperties
            }
          />
        ))}

        {/* Layer 6 — SVG noise grain overlay */}
        <svg
          className="v3-grain absolute inset-0 w-full h-full"
          style={{
            opacity: 0.035,
            mixBlendMode: "screen",
            animation: "v3-grain-shift 0.15s steps(1) infinite",
            willChange: "transform",
          }}
          aria-hidden="true"
        >
          <filter id="env-v3-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#env-v3-grain)" />
        </svg>

        {/* Layer 7 — Bottom vignette — text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 130% 90% at 50% 50%, transparent 30%, oklch(0.08 0.012 230 / 0.65) 100%)",
          }}
        />
      </div>
    </>
  );
}
