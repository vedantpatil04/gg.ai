import { useMemo } from "react";
import { findAqiBand } from "@/lib/mock-data";

/**
 * Phase 1 Architecture Rebuild — Ambient Background Engine.
 *
 * Deep multi-layer atmospheric canvas:
 *  1. Base — near-black neutral charcoal (never green-tinted)
 *  2. Ambient radials — structural blue-gray depth glows
 *  3. AQI-reactive accent mesh A (primary, animated morph)
 *  4. AQI-reactive accent mesh B (secondary, opposing drift)
 *  5. AQI-reactive accent mesh C (upper accent)
 *  6. Floating micro-particles — always neutral slate
 *  7. SVG noise grain — film texture layer
 *  8. Deep vignette — readability anchor
 *
 * All animations: transform + opacity only (GPU). prefers-reduced-motion guarded.
 */

interface AmbientPalette {
  accentA: string;
  accentB: string;
  accentC: string;
}

function aqiAccents(aqi: number): AmbientPalette {
  const band = findAqiBand(aqi);
  switch (band.label) {
    case "Good":
      return {
        accentA: "oklch(0.55 0.18 160 / 0.18)",
        accentB: "oklch(0.50 0.14 200 / 0.12)",
        accentC: "oklch(0.45 0.12 240 / 0.08)",
      };
    case "Moderate":
      return {
        accentA: "oklch(0.55 0.15 145 / 0.16)",
        accentB: "oklch(0.58 0.16 82  / 0.12)",
        accentC: "oklch(0.50 0.12 200 / 0.08)",
      };
    case "Unhealthy (SG)":
    case "Unhealthy":
      return {
        accentA: "oklch(0.56 0.18 58  / 0.16)",
        accentB: "oklch(0.50 0.15 32  / 0.12)",
        accentC: "oklch(0.46 0.10 165 / 0.07)",
      };
    case "Very Unhealthy":
    case "Hazardous":
      return {
        accentA: "oklch(0.52 0.18 28  / 0.16)",
        accentB: "oklch(0.46 0.14 12  / 0.11)",
        accentC: "oklch(0.40 0.10 320 / 0.07)",
      };
    default:
      return {
        accentA: "oklch(0.55 0.18 160 / 0.18)",
        accentB: "oklch(0.50 0.14 200 / 0.12)",
        accentC: "oklch(0.45 0.12 240 / 0.08)",
      };
  }
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const PARTICLES = (() => {
  const rng = seededRng(73);
  return Array.from({ length: 12 }, () => ({
    left: `${Math.round(rng() * 100)}%`,
    top: `${Math.round(rng() * 100)}%`,
    size: Math.round(rng() * 3) + 1,
    opacity: Math.round((rng() * 0.18 + 0.04) * 100) / 100,
    duration: `${Math.round(rng() * 16 + 18)}s`,
    delay: `-${Math.round(rng() * 24)}s`,
    blur: Math.round(rng() * 1),
  }));
})();

const KF = `
@keyframes amb-mesh-a {
  0%,100%{ transform:translate(0%,0%) scale(1) rotate(0deg); border-radius:60% 40% 55% 45%/55% 60% 40% 50%; }
  30%    { transform:translate(5%,-7%) scale(1.08) rotate(2deg); border-radius:45% 55% 40% 60%/60% 40% 55% 45%; }
  65%    { transform:translate(-4%,5%) scale(0.96) rotate(-1deg); border-radius:55% 45% 60% 40%/45% 55% 50% 60%; }
}
@keyframes amb-mesh-b {
  0%,100%{ transform:translate(0%,0%) scale(1) rotate(0deg); }
  35%    { transform:translate(-7%,6%) scale(0.94) rotate(-2deg); }
  72%    { transform:translate(6%,-8%) scale(1.06) rotate(2deg); }
}
@keyframes amb-mesh-c {
  0%,100%{ transform:translate(0%,0%) scale(1); }
  50%    { transform:translate(-5%,4%) scale(1.10); }
}
@keyframes amb-particle {
  0%  { transform:translateY(0)   scale(1);    opacity:var(--op); }
  50% { transform:translateY(-30px) scale(1.06); opacity:calc(var(--op)*1.25); }
  100%{ transform:translateY(-75px) scale(0.85); opacity:0; }
}
@keyframes amb-grain {
  0%,100%{ transform:translate(0,0); }
  25%    { transform:translate(-1%,-2%); }
  50%    { transform:translate(2%,-1%); }
  75%    { transform:translate(-2%,1%); }
}
@media(prefers-reduced-motion:reduce){
  .amb-a,.amb-b,.amb-c,.amb-p,.amb-grain{ animation-play-state:paused!important; }
}
`;

export function EnvAmbientBackground({ aqi }: { aqi?: number }) {
  const acc = useMemo(() => aqiAccents(aqi ?? 50), [aqi]);

  return (
    <>
      <style>{KF}</style>
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}
      >
        {/* 1. Deep neutral base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(165deg, oklch(0.12 0.022 236) 0%, oklch(0.10 0.018 248) 50%, oklch(0.08 0.014 256) 100%)",
        }} />

        {/* 2. Structural ambient radials — neutral blue-gray only */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 75% 45% at 15% 0%,   oklch(0.22 0.024 235/0.50),transparent 65%),
            radial-gradient(ellipse 60% 35% at 85% 90%,  oklch(0.18 0.020 250/0.40),transparent 60%),
            radial-gradient(ellipse 50% 30% at 50% 50%,  oklch(0.15 0.015 240/0.22),transparent 70%)
          `,
        }} />

        {/* 3. AQI-reactive blob A */}
        <div className="amb-a" style={{
          position: "absolute", top: "-20%", left: "-14%", width: "68%", height: "62%",
          background: `radial-gradient(ellipse, ${acc.accentA} 0%, transparent 68%)`,
          filter: "blur(64px)",
          animation: "amb-mesh-a 30s ease-in-out infinite",
          willChange: "transform",
        }} />

        {/* 4. AQI-reactive blob B */}
        <div className="amb-b" style={{
          position: "absolute", bottom: "-18%", right: "-10%", width: "62%", height: "58%",
          background: `radial-gradient(ellipse, ${acc.accentB} 0%, transparent 68%)`,
          filter: "blur(75px)",
          animation: "amb-mesh-b 38s ease-in-out infinite",
          willChange: "transform",
        }} />

        {/* 5. Blob C — upper right */}
        <div className="amb-c" style={{
          position: "absolute", top: "6%", right: "-5%", width: "42%", height: "36%",
          background: `radial-gradient(ellipse, ${acc.accentC} 0%, transparent 65%)`,
          filter: "blur(90px)",
          animation: "amb-mesh-c 22s ease-in-out infinite",
          willChange: "transform",
        }} />

        {/* 6. Micro-particles — neutral slate always */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="amb-p"
            style={{
              position: "absolute",
              left: p.left, top: p.top,
              width: p.size, height: p.size,
              borderRadius: "50%",
              background: i % 2 === 0 ? "oklch(0.70 0.08 220)" : "oklch(0.60 0.06 240)",
              opacity: p.opacity,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
              animation: `amb-particle ${p.duration} linear ${p.delay} infinite`,
              ["--op" as string]: p.opacity,
              willChange: "transform, opacity",
            }}
          />
        ))}

        {/* 7. Noise grain */}
        <svg
          className="amb-grain"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.025, mixBlendMode: "screen", animation: "amb-grain 0.2s steps(1) infinite", willChange: "transform" }}
        >
          <filter id="env-grain-bg">
            <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#env-grain-bg)" />
        </svg>

        {/* 8. Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 120% 100% at 50% 45%, transparent 20%, oklch(0.06 0.010 242/0.75) 100%)",
        }} />
      </div>
    </>
  );
}
