/**
 * Hero Scene Components — Phase 10
 *
 * Purely visual SVG/CSS layers rendered inside the WelcomeHero.
 * Every animation uses only transform + opacity (GPU-composited).
 * All components receive a `prefersReduced` prop so they can suppress
 * their motion without re-querying the OS preference.
 */

import { motion } from "framer-motion";
import type { SceneCondition } from "@/lib/hero-scene";

// ─── Sun / Sunrise disc ───────────────────────────────────────────────────────

export function SunLayer({ low, prefersReduced }: { low: boolean; prefersReduced: boolean }) {
  // Low sun = near horizon (dawn / golden hour)
  const cy = low ? "72%" : "22%";
  const glow = low ? "oklch(0.85 0.18 60 / 0.35)" : "oklch(0.95 0.12 80 / 0.20)";

  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.97 0.10 80)" stopOpacity="0.9" />
          <stop offset="40%" stopColor="oklch(0.90 0.18 60)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.90 0.18 60)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glow halo */}
      <circle
        cx="78%"
        cy={cy}
        r={low ? 60 : 40}
        fill={glow}
        style={{
          filter: "blur(18px)",
          animation: prefersReduced ? "none" : "breathing-glow 6s ease-in-out infinite",
        }}
      />
      {/* Disc */}
      <circle
        cx="78%"
        cy={cy}
        r={low ? 22 : 16}
        fill="url(#sunGlow)"
        style={{ filter: "blur(1px)" }}
      />
    </svg>
  );
}

// ─── Moon ─────────────────────────────────────────────────────────────────────

export function MoonLayer({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.96 0.02 250)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="oklch(0.80 0.04 250)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft glow */}
      <circle
        cx="76%"
        cy="20%"
        r="38"
        fill="oklch(0.80 0.05 250 / 0.18)"
        style={{ filter: "blur(12px)" }}
      />
      {/* Crescent: white disc minus offset disc */}
      <circle cx="76%" cy="20%" r="14" fill="oklch(0.96 0.02 255)" />
      <circle cx="81%" cy="17%" r="11" fill="oklch(0.13 0.05 256)" />
    </svg>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────

const STARS = [
  { x: 10, y: 8, r: 1.2, delay: 0 },
  { x: 22, y: 5, r: 0.9, delay: 0.7 },
  { x: 35, y: 12, r: 1.5, delay: 1.2 },
  { x: 48, y: 4, r: 0.8, delay: 0.3 },
  { x: 58, y: 9, r: 1.1, delay: 1.8 },
  { x: 68, y: 6, r: 0.9, delay: 0.9 },
  { x: 30, y: 18, r: 0.7, delay: 2.1 },
  { x: 15, y: 20, r: 1.0, delay: 1.5 },
  { x: 52, y: 18, r: 1.3, delay: 0.5 },
];

export function StarsLayer({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 30"
      preserveAspectRatio="xMidYMin slice"
    >
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={s.y}
          r={s.r}
          fill="white"
          fillOpacity="0.7"
          style={
            prefersReduced
              ? {}
              : {
                  animation: `opacity ${2.5 + s.delay}s ease-in-out ${s.delay}s infinite alternate`,
                }
          }
        />
      ))}
    </svg>
  );
}

// ─── Clouds ───────────────────────────────────────────────────────────────────

function Cloud({
  cx,
  cy,
  opacity,
  duration,
  delay,
  prefersReduced,
}: {
  cx: number;
  cy: number;
  opacity: number;
  duration: number;
  delay: number;
  prefersReduced: boolean;
}) {
  return (
    <motion.ellipse
      cx={cx}
      cy={cy}
      rx={38}
      ry={18}
      fill="white"
      fillOpacity={opacity}
      style={{ filter: "blur(6px)" }}
      animate={prefersReduced ? {} : { cx: [cx - 12, cx + 12, cx - 12] }}
      transition={
        prefersReduced
          ? {}
          : {
              duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
    />
  );
}

export function CloudLayer({
  opacity,
  prefersReduced,
}: {
  opacity: number;
  prefersReduced: boolean;
}) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      <Cloud
        cx={80}
        cy={45}
        opacity={opacity * 0.6}
        duration={28}
        delay={0}
        prefersReduced={prefersReduced}
      />
      <Cloud
        cx={220}
        cy={30}
        opacity={opacity * 0.8}
        duration={35}
        delay={4}
        prefersReduced={prefersReduced}
      />
      <Cloud
        cx={340}
        cy={55}
        opacity={opacity * 0.55}
        duration={22}
        delay={8}
        prefersReduced={prefersReduced}
      />
      <Cloud
        cx={160}
        cy={65}
        opacity={opacity * 0.4}
        duration={30}
        delay={12}
        prefersReduced={prefersReduced}
      />
    </svg>
  );
}

// ─── Rain ─────────────────────────────────────────────────────────────────────

const RAIN_DROPS = Array.from({ length: 18 }, (_, i) => ({
  x: (i / 17) * 100,
  delay: (i * 0.11) % 1.2,
  len: 8 + (i % 4) * 3,
  speed: 0.6 + (i % 3) * 0.25,
}));

export function RainLayer({ prefersReduced }: { prefersReduced: boolean }) {
  if (prefersReduced) return null;
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      {RAIN_DROPS.map((d, i) => (
        <motion.line
          key={i}
          x1={`${d.x}%`}
          y1={-10}
          x2={`${d.x + 2}%`}
          y2={d.len - 10}
          stroke="oklch(0.85 0.03 220 / 0.45)"
          strokeWidth="1"
          animate={{ y: [0, 280] }}
          transition={{
            duration: d.speed,
            repeat: Infinity,
            ease: "linear",
            delay: d.delay,
          }}
        />
      ))}
    </svg>
  );
}

// ─── Fog / mist ───────────────────────────────────────────────────────────────

export function FogLayer({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-16 w-[130%]"
          style={{
            top: `${20 + i * 22}%`,
            left: "-15%",
            background: `linear-gradient(90deg, transparent, oklch(0.85 0.01 220 / 0.28), transparent)`,
            filter: "blur(12px)",
          }}
          animate={
            prefersReduced
              ? {}
              : {
                  x: [0, 30, 0],
                  opacity: [0.4, 0.7, 0.4],
                }
          }
          transition={
            prefersReduced
              ? {}
              : {
                  duration: 18 + i * 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 3,
                }
          }
        />
      ))}
    </div>
  );
}

// ─── Environmental particles ──────────────────────────────────────────────────

// Leaf particles for good AQI day
const LEAF_SEEDS = [
  { x: 12, delay: 0, size: 7, drift: 30 },
  { x: 28, delay: 2.1, size: 5, drift: -20 },
  { x: 45, delay: 0.8, size: 8, drift: 25 },
  { x: 62, delay: 3.4, size: 6, drift: -15 },
  { x: 78, delay: 1.5, size: 5, drift: 20 },
];

function Leaf({
  x,
  delay,
  size,
  drift,
  prefersReduced,
}: {
  x: number;
  delay: number;
  size: number;
  drift: number;
  prefersReduced: boolean;
}) {
  return (
    <motion.svg
      aria-hidden
      style={{ position: "absolute", left: `${x}%`, top: "-10px", width: size, height: size }}
      viewBox="0 0 10 10"
      animate={
        prefersReduced
          ? {}
          : {
              y: [0, 280],
              x: [0, drift, 0],
              rotate: [0, 360],
              opacity: [0, 0.8, 0.8, 0],
            }
      }
      transition={
        prefersReduced
          ? {}
          : {
              duration: 6 + delay,
              repeat: Infinity,
              ease: "easeIn",
              delay,
            }
      }
    >
      <ellipse cx="5" cy="5" rx="3.5" ry="5" fill="oklch(0.55 0.18 150 / 0.7)" />
      <line x1="5" y1="0" x2="5" y2="10" stroke="oklch(0.40 0.15 150 / 0.5)" strokeWidth="0.5" />
    </motion.svg>
  );
}

// Dust particles for poor AQI
const DUST_SEEDS = Array.from({ length: 12 }, (_, i) => ({
  x: (i / 11) * 90 + 5,
  y: 20 + (i % 4) * 15,
  delay: i * 0.4,
  size: 2 + (i % 3),
}));

function DustParticle({
  x,
  y,
  delay,
  size,
  prefersReduced,
}: {
  x: number;
  y: number;
  delay: number;
  size: number;
  prefersReduced: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: "oklch(0.65 0.08 55 / 0.45)",
        filter: "blur(1px)",
      }}
      animate={
        prefersReduced
          ? {}
          : {
              x: [0, 20, -10, 0],
              y: [0, -8, 4, 0],
              opacity: [0.3, 0.6, 0.3],
            }
      }
      transition={
        prefersReduced
          ? {}
          : {
              duration: 5 + delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
    />
  );
}

export function ParticleLayer({
  kind,
  prefersReduced,
}: {
  kind: SceneCondition["particleKind"];
  prefersReduced: boolean;
}) {
  if (kind === "none" || prefersReduced) return null;
  if (kind === "leaves") {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {LEAF_SEEDS.map((l, i) => (
          <Leaf key={i} {...l} prefersReduced={prefersReduced} />
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {DUST_SEEDS.map((d, i) => (
        <DustParticle key={i} {...d} prefersReduced={prefersReduced} />
      ))}
    </div>
  );
}

// ─── Eco-city SVG illustration ────────────────────────────────────────────────
// Inline SVG: silhouette of city buildings, wind turbine, solar panels, trees.
// Rendered on the right side of the hero (hidden on mobile, visible md+).
// Completely silent / no animation — the moving scene layers do the work.

export function EcoIllustration({ aqiTier }: { aqiTier: SceneCondition["aqiTier"] }) {
  const skyline =
    aqiTier === "good" || aqiTier === "moderate"
      ? "oklch(0.85 0.10 170 / 0.35)" // clean green-tinted silhouette
      : "oklch(0.55 0.06 45 / 0.35)"; // smoggy amber silhouette

  return (
    <div
      aria-hidden
      className="hidden md:block absolute right-0 bottom-0 h-full w-2/5 pointer-events-none"
    >
      <svg
        viewBox="0 0 320 200"
        className="absolute bottom-0 right-0 w-full h-full"
        preserveAspectRatio="xMaxYMax meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background hills */}
        <ellipse
          cx="160"
          cy="240"
          rx="220"
          ry="90"
          fill={skyline}
          style={{ filter: "blur(8px)" }}
        />

        {/* Buildings */}
        <rect x="20" y="120" width="28" height="80" rx="2" fill={skyline} />
        <rect x="52" y="90" width="22" height="110" rx="2" fill={skyline} />
        <rect x="78" y="105" width="18" height="95" rx="2" fill={skyline} />
        <rect x="100" y="80" width="30" height="120" rx="2" fill={skyline} />
        <rect x="134" y="100" width="20" height="100" rx="2" fill={skyline} />
        <rect x="158" y="115" width="24" height="85" rx="2" fill={skyline} />
        <rect x="186" y="95" width="18" height="105" rx="2" fill={skyline} />

        {/* Wind turbine */}
        <line x1="240" y1="200" x2="240" y2="100" stroke={skyline} strokeWidth="3" />
        {/* Blades — rotated star */}
        <ellipse cx="240" cy="100" rx="4" ry="28" fill={skyline} transform="rotate(0 240 100)" />
        <ellipse cx="240" cy="100" rx="4" ry="28" fill={skyline} transform="rotate(120 240 100)" />
        <ellipse cx="240" cy="100" rx="4" ry="28" fill={skyline} transform="rotate(240 240 100)" />

        {/* Solar panels */}
        <rect x="265" y="150" width="40" height="20" rx="2" fill={skyline} transform="skewY(-8)" />
        <rect x="268" y="145" width="2" height="45" rx="1" fill={skyline} />
        <rect x="295" y="145" width="2" height="45" rx="1" fill={skyline} />

        {/* Trees */}
        <ellipse cx="290" cy="175" rx="16" ry="22" fill={skyline} style={{ filter: "blur(1px)" }} />
        <line x1="290" y1="195" x2="290" y2="200" stroke={skyline} strokeWidth="3" />
        <ellipse cx="310" cy="182" rx="12" ry="16" fill={skyline} style={{ filter: "blur(1px)" }} />
        <line x1="310" y1="196" x2="310" y2="200" stroke={skyline} strokeWidth="3" />
      </svg>
    </div>
  );
}

// ─── Floating AI Orb ──────────────────────────────────────────────────────────
// A small glowing sphere that "floats" gently — the AI assistant motif.

export function FloatingAIOrb({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="hidden md:flex absolute top-6 right-8 size-9 rounded-full items-center justify-center z-20"
      style={{
        background:
          "radial-gradient(circle at 35% 35%, oklch(0.85 0.20 270), oklch(0.55 0.25 260))",
        boxShadow: "0 0 20px oklch(0.65 0.25 270 / 0.6), 0 0 6px oklch(0.85 0.20 270 / 0.8)",
      }}
      animate={
        prefersReduced
          ? {}
          : {
              y: [0, -8, 0],
              boxShadow: [
                "0 0 16px oklch(0.65 0.25 270 / 0.5)",
                "0 0 28px oklch(0.65 0.25 270 / 0.75)",
                "0 0 16px oklch(0.65 0.25 270 / 0.5)",
              ],
            }
      }
      transition={
        prefersReduced
          ? {}
          : {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      {/* Inner highlight */}
      <div className="size-2 rounded-full bg-white/60" style={{ filter: "blur(1px)" }} />
    </motion.div>
  );
}
