/**
 * FloatingClouds — Cinematic Hero Phase 1
 *
 * Renders realistic animated cloud shapes as Layer 4 of the hero.
 * Clouds drift horizontally with varying speeds, sizes, and opacities
 * to create a natural, parallax-like depth effect.
 *
 * Implementation:
 * - Pure CSS animations (transform: translateX) — GPU-composited
 * - No JavaScript animation loop; zero runtime cost
 * - prefers-reduced-motion: all animations suppressed
 * - Responsive: SVG viewBox + preserveAspectRatio handles any size
 */

interface CloudDef {
  /** Starting translateX (fraction of container width) */
  startX: string;
  /** Vertical position (% of container height) */
  topPct: number;
  /** Cloud width in vw-equivalent units */
  widthPx: number;
  /** Opacity of the cloud */
  opacity: number;
  /** Animation duration in seconds */
  duration: number;
  /** Animation delay in seconds */
  delay: number;
  /** Blur amount for distance effect */
  blur: number;
}

const CLOUD_DEFS: CloudDef[] = [
  // Background (smaller, slower, more blurred = feel farther away)
  { startX: "-15%",  topPct: 8,  widthPx: 280, opacity: 0.22, duration: 120, delay: 0,   blur: 4 },
  { startX: "30%",   topPct: 12, widthPx: 200, opacity: 0.16, duration: 160, delay: 20,  blur: 6 },
  { startX: "68%",   topPct: 5,  widthPx: 240, opacity: 0.18, duration: 140, delay: 55,  blur: 5 },
  // Midground
  { startX: "-5%",   topPct: 22, widthPx: 360, opacity: 0.28, duration: 90,  delay: 10,  blur: 3 },
  { startX: "50%",   topPct: 18, widthPx: 300, opacity: 0.22, duration: 100, delay: 40,  blur: 3 },
  // Foreground (larger, faster, less blurred = feel closer)
  { startX: "-20%",  topPct: 30, widthPx: 420, opacity: 0.14, duration: 70,  delay: 0,   blur: 2 },
  { startX: "60%",   topPct: 35, widthPx: 380, opacity: 0.10, duration: 80,  delay: 30,  blur: 2 },
];

/**
 * Renders a single fluffy cloud shape using SVG path.
 * The cloud is a combination of overlapping circles that form a natural silhouette.
 */
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
        className="absolute pointer-events-none"
        style={{
          top: `${def.topPct}%`,
          left: def.startX,
          width: def.widthPx,
          filter: `blur(${def.blur}px)`,
          opacity: def.opacity,
          // GPU-only: transform animation via CSS
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
          {/* Cloud body built from overlapping ellipses */}
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
