/**
 * FloatingClouds — Responsive Atmospheric Cloud System
 *
 * Renders animated cloud shapes as Layer 4 of the hero with responsive scaling:
 *   - Desktop (>= 1024px): Full cinematic scale (~100%) for immersive depth
 *   - Tablet (768px - 1023px): Scaled down (~75%) for balanced composition
 *   - Mobile (< 768px): Intelligently scaled down (~40–45%), positioned away from text
 *     and cards so clouds never dominate or obstruct important information.
 *
 * Implementation:
 * - Pure CSS GPU-composited animations (transform: translateX)
 * - Zero JS animation loop; zero performance overhead
 * - prefers-reduced-motion: animations gracefully suppressed
 */

interface CloudDef {
  /** Starting translateX (fraction of container width) */
  startX: string;
  /** Vertical position (% of container height) */
  topPct: number;
  /** Desktop width in px */
  widthPx: number;
  /** Opacity of the cloud */
  opacity: number;
  /** Animation duration in seconds */
  duration: number;
  /** Animation delay in seconds */
  delay: number;
  /** Blur amount for distance effect */
  blur: number;
  /** Mobile-only visibility / positioning tweak */
  mobileHidden?: boolean;
}

const CLOUD_DEFS: CloudDef[] = [
  // Background horizon clouds (small, slow, subtle)
  { startX: "-10%", topPct: 6,  widthPx: 260, opacity: 0.18, duration: 130, delay: 0,  blur: 4 },
  { startX: "35%",  topPct: 10, widthPx: 200, opacity: 0.14, duration: 160, delay: 20, blur: 5 },
  { startX: "70%",  topPct: 5,  widthPx: 230, opacity: 0.16, duration: 140, delay: 55, blur: 4 },

  // Midground clouds (upper-right and center-sky)
  { startX: "-5%",  topPct: 16, widthPx: 320, opacity: 0.22, duration: 95,  delay: 10, blur: 3 },
  { startX: "55%",  topPct: 14, widthPx: 280, opacity: 0.18, duration: 110, delay: 40, blur: 3 },

  // Foreground clouds (desktop only — hidden or scaled way down on mobile to protect greeting)
  { startX: "20%",  topPct: 24, widthPx: 380, opacity: 0.12, duration: 75,  delay: 5,  blur: 2, mobileHidden: true },
  { startX: "65%",  topPct: 28, widthPx: 340, opacity: 0.10, duration: 85,  delay: 30, blur: 2, mobileHidden: true },
];

function CloudShape({
  def,
  index,
}: {
  def: CloudDef;
  index: number;
}) {
  const animId = `cloud-drift-${index}`;

  return (
    <>
      <div
        aria-hidden
        className={`absolute pointer-events-none origin-top-left ${
          def.mobileHidden ? "hidden md:block" : "block"
        } scale-[0.42] sm:scale-[0.65] md:scale-[0.80] lg:scale-100 opacity-60 md:opacity-100`}
        style={{
          top: `${def.topPct}%`,
          left: def.startX,
          width: `${def.widthPx}px`,
          filter: `blur(${def.blur}px)`,
          opacity: def.opacity,
          animation: `${animId} ${def.duration}s linear ${def.delay}s infinite`,
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 200 80"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
          fill="white"
        >
          {/* Natural cloud silhouette with overlapping ellipses */}
          <ellipse cx="100" cy="55" rx="90"  ry="28" />
          <ellipse cx="80"  cy="42" rx="55"  ry="35" />
          <ellipse cx="120" cy="40" rx="52"  ry="32" />
          <ellipse cx="55"  cy="50" rx="38"  ry="22" />
          <ellipse cx="148" cy="50" rx="40"  ry="22" />
          <ellipse cx="100" cy="32" rx="35"  ry="30" />
        </svg>
      </div>

      <style>{`
        @keyframes ${animId} {
          from { transform: translateX(0); }
          to   { transform: translateX(120vw); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ${animId} { from {} to {} }
        }
      `}</style>
    </>
  );
}

export function FloatingClouds() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {CLOUD_DEFS.map((def, i) => (
        <CloudShape key={i} def={def} index={i} />
      ))}
    </div>
  );
}
