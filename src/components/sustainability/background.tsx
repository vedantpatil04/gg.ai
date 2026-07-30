/**
 * background.tsx — Phase 1 enterprise background system
 *
 * Purely decorative, absolutely-positioned layer sat behind the page
 * content (parent must be `relative`). Built entirely from CSS/SVG using
 * the existing theme tokens (var(--color-*)) and the already-established
 * `grid-bg` / `radial-spot` / `floaty` utilities from styles.css, so no
 * shared global stylesheet changes were needed for this phase.
 *
 * Pure presentation — no props, no data.
 */
export function SustainabilityBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base environmental gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 6%, var(--color-background)) 0%, var(--color-background) 38%, color-mix(in oklab, var(--color-info) 5%, var(--color-background)) 100%)",
        }}
      />

      {/* Ambient radial lighting */}
      <div className="absolute inset-0 radial-spot opacity-70" />

      {/* Animated mesh blobs */}
      <div
        className="absolute -top-32 -left-20 size-[26rem] rounded-full blur-3xl opacity-30 floaty"
        style={{ background: "var(--color-primary)", animationDuration: "12s" }}
      />
      <div
        className="absolute top-24 -right-28 size-[30rem] rounded-full blur-3xl opacity-20 floaty"
        style={{ background: "var(--color-info)", animationDuration: "15s", animationDelay: "1.2s" }}
      />
      <div
        className="absolute bottom-[-8rem] left-1/3 size-[24rem] rounded-full blur-3xl opacity-20 floaty"
        style={{ background: "oklch(0.55 0.18 290)", animationDuration: "13s", animationDelay: "0.6s" }}
      />

      {/* Subtle moving grid */}
      <div
        className="absolute inset-0 grid-bg opacity-30"
        style={{ maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent)" }}
      />

      {/* Soft noise texture */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay">
        <filter id="sustainability-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sustainability-noise)" />
      </svg>

      {/* Bottom fade so content stays legible */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(180deg, transparent, var(--color-background))" }}
      />
    </div>
  );
}
