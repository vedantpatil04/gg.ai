/**
 * MapPreviewCard — Phase 8
 *
 * Phase 7 added location pulse + AQI badge.
 * Phase 8 adds:
 *  - Teal GlowCard ambient lighting (--glow-map)
 *  - Animated scan-line moving across the preview area
 *  - Hexagonal terrain texture (SVG pattern) for a premium map-like feel
 *  - Parallax-style depth: grid + terrain at different opacities
 */

import { GlowCard } from "@/components/dashboard/motion-primitives";
import { Map, ArrowRight, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { FADE, DUR_LG, EASE_OUT } from "@/lib/motion";
import { findAqiBand } from "@/lib/mock-data";

function LocationPulse({ color }: { color: string }) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return <MapPin className="size-5 text-white" />;
  return (
    <div className="relative grid place-items-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: `color-mix(in oklab, ${color} 55%, transparent)` }}
          animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: i * 0.75 }}
          initial={{ width: 18, height: 18 }}
        />
      ))}
      <MapPin className="relative z-10 size-5 text-white drop-shadow" />
    </div>
  );
}

export function MapPreviewCard({
  cityName, aqi, aqiBand,
}: {
  cityName?: string;
  aqi?: number;
  aqiBand?: { label: string; color: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  const band     = aqi != null ? findAqiBand(aqi) : null;
  const aqiColor = band?.color ?? "var(--color-muted-foreground)";

  return (
    <GlowCard glowVar="--glow-map" lift={false} className="p-0">
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Explore</div>
            <div className="text-base font-semibold tracking-tight mt-0.5">Smart Map Preview</div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3">
        <motion.div
          ref={ref}
          variants={FADE}
          initial={prefersReduced ? false : "hidden"}
          animate={inView ? "show" : "hidden"}
          transition={{ duration: DUR_LG, ease: EASE_OUT }}
          className="group relative overflow-hidden rounded-xl min-h-[180px] flex flex-col items-center justify-center gap-5 border border-dashed hover:border-primary/45 transition-colors duration-250 cursor-default"
          style={{ background: "color-mix(in oklab, var(--color-muted) 16%, transparent)" }}
        >
          {/* Hex terrain texture */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="hex" x="0" y="0" width="28" height="32" patternUnits="userSpaceOnUse">
                <polygon
                  points="14,2 26,8 26,24 14,30 2,24 2,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex)" />
          </svg>

          {/* Grid overlay */}
          <div className="absolute inset-0 grid-bg opacity-18 pointer-events-none" />

          {/* Radial glow */}
          <div className="absolute inset-0 radial-spot opacity-35 pointer-events-none" />

          {/* Scan line — Phase 8 */}
          {!prefersReduced && (
            <div className="scan-line" aria-hidden />
          )}

          {/* Corner AQI badge */}
          {band && aqi != null && (
            <div
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
              style={{
                background: `color-mix(in oklab, ${aqiColor} 22%, oklch(0 0 0 / 0.35))`,
                borderColor: `color-mix(in oklab, ${aqiColor} 42%, transparent)`,
                color: "white",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="size-1.5 rounded-full" style={{ background: aqiColor }} />
              AQI {aqi} · {band.shortLabel}
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
            <div
              className="size-14 rounded-2xl aurora grid place-items-center text-white shadow-xl transition-transform duration-200 group-hover:scale-105"
              style={{ boxShadow: `0 8px 28px color-mix(in oklab, var(--color-primary) 32%, transparent)` }}
            >
              <LocationPulse color={aqiColor} />
            </div>
            <div>
              {cityName && <div className="text-sm font-semibold">{cityName}</div>}
              <p className="text-xs text-muted-foreground mt-1">Interactive map coming in a later phase.</p>
            </div>
          </div>
        </motion.div>

        <Link
          to="/map"
          className={
            "w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary " +
            "py-2.5 rounded-xl border border-primary/20 bg-primary/5 " +
            "hover:bg-primary/12 hover:border-primary/40 " +
            "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          }
        >
          Open Smart Map <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </GlowCard>
  );
}
