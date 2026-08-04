/**
 * EnvironmentParticles — Cinematic Hero Phase 1
 *
 * Renders subtle floating environmental particles as Layer 5 of the hero.
 * Particle type adapts to AQI level:
 *   - good/moderate → leaves (organic, natural feel)
 *   - poor          → pollen/dust motes (visible but subtle)
 *   - hazardous     → haze particles (ominous, drifting)
 *
 * All animations are CSS-only (transform + opacity), GPU-composited.
 * Opacity kept 5–15% for subtlety — these should feel atmospheric, not distracting.
 * prefers-reduced-motion: component renders null.
 */

import { useReducedMotion } from "framer-motion";

interface ParticleDef {
  left: number;   // % from left
  top: number;    // % from top
  size: number;   // px
  opacity: number;
  duration: number;
  delay: number;
  driftX: number; // px horizontal drift
  driftY: number; // px vertical drift (negative = up)
}

/** Seeded pseudo-random for stable SSR hydration */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateParticles(count: number, seed: number): ParticleDef[] {
  const rng = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    left: rng() * 95 + 2,
    top: rng() * 80 + 5,
    size: 2 + rng() * 4,
    opacity: 0.05 + rng() * 0.10, // 5–15%
    duration: 8 + rng() * 16,
    delay: rng() * 10,
    driftX: (rng() - 0.5) * 60,
    driftY: -20 - rng() * 50,
  }));
}

const LEAF_PARTICLES = generateParticles(14, 42);
const DUST_PARTICLES = generateParticles(20, 137);
const HAZE_PARTICLES = generateParticles(18, 89);

function getParticleKind(aqi: number): "leaves" | "dust" | "haze" {
  if (aqi <= 100) return "leaves";
  if (aqi <= 200) return "dust";
  return "haze";
}

/** A single floating leaf — SVG teardrop shape */
function LeafParticle({ p, index }: { p: ParticleDef; index: number }) {
  const animId = `leaf-${index}`;
  const rotateEnd = -120 + (index % 3) * 60;

  return (
    <>
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size * 1.8,
          height: p.size * 2.5,
          opacity: p.opacity,
          animation: `${animId} ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          willChange: "transform, opacity",
        }}
      >
        <svg viewBox="0 0 10 14" width="100%" fill="oklch(0.72 0.18 145)">
          <path d="M5 0 Q10 5 5 14 Q0 5 5 0Z" />
          <line x1="5" y1="2" x2="5" y2="12" stroke="oklch(0.55 0.14 145)" strokeWidth="0.6" />
        </svg>
      </div>
      <style>{`
        @keyframes ${animId} {
          0%   { transform: translate(0, 0) rotate(0deg);                    opacity: ${p.opacity * 0.6}; }
          50%  { transform: translate(${p.driftX * 0.5}px, ${p.driftY * 0.5}px) rotate(${rotateEnd * 0.5}deg); opacity: ${p.opacity}; }
          100% { transform: translate(${p.driftX}px, ${p.driftY}px)         rotate(${rotateEnd}deg); opacity: ${p.opacity * 0.4}; }
        }
      `}</style>
    </>
  );
}

/** A single dust/pollen mote — soft circle */
function DustParticle({ p, index }: { p: ParticleDef; index: number }) {
  const animId = `dust-${index}`;

  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size,
          height: p.size,
          background: "oklch(0.88 0.06 70)",
          opacity: p.opacity,
          filter: "blur(0.8px)",
          animation: `${animId} ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          willChange: "transform, opacity",
        }}
      />
      <style>{`
        @keyframes ${animId} {
          0%   { transform: translate(0, 0);                                           opacity: ${p.opacity * 0.5}; }
          50%  { transform: translate(${p.driftX * 0.4}px, ${p.driftY * 0.3}px);     opacity: ${p.opacity}; }
          100% { transform: translate(${p.driftX}px, ${p.driftY * 0.6}px);           opacity: ${p.opacity * 0.3}; }
        }
      `}</style>
    </>
  );
}

/** A single haze particle — larger, more blurred */
function HazeParticle({ p, index }: { p: ParticleDef; index: number }) {
  const animId = `haze-${index}`;

  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size * 3,
          height: p.size * 2,
          background: "oklch(0.60 0.04 45)",
          opacity: p.opacity * 0.8,
          filter: `blur(${p.size}px)`,
          animation: `${animId} ${p.duration * 1.5}s ease-in-out ${p.delay}s infinite alternate`,
          willChange: "transform, opacity",
        }}
      />
      <style>{`
        @keyframes ${animId} {
          0%   { transform: translate(0, 0);                                       opacity: ${p.opacity * 0.4}; }
          100% { transform: translate(${p.driftX * 0.5}px, ${p.driftY * 0.2}px); opacity: ${p.opacity * 0.9}; }
        }
      `}</style>
    </>
  );
}

export interface EnvironmentParticlesProps {
  aqi: number;
}

export function EnvironmentParticles({ aqi }: EnvironmentParticlesProps) {
  const prefersReduced = useReducedMotion() ?? false;
  if (prefersReduced) return null;

  const kind = getParticleKind(aqi);

  if (kind === "leaves") {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {LEAF_PARTICLES.map((p, i) => (
          <LeafParticle key={i} p={p} index={i} />
        ))}
      </div>
    );
  }

  if (kind === "dust") {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {DUST_PARTICLES.map((p, i) => (
          <DustParticle key={i} p={p} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {HAZE_PARTICLES.map((p, i) => (
        <HazeParticle key={i} p={p} index={i} />
      ))}
    </div>
  );
}
