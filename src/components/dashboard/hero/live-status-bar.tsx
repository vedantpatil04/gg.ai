/**
 * LiveStatusBar — Cinematic Hero Phase 1
 *
 * A floating glass pill row that shows live sensor data at a glance.
 * Positioned at the top of the hero (or bottom on mobile).
 *
 * Displays:
 *   🛰 Live · AQI · Temperature · Humidity · Wind · Sensors Online · Last Updated
 *
 * Features:
 * - Pulsing live indicator
 * - Glassmorphism pill
 * - Subtle glow on active
 * - Horizontally scrollable on mobile (no wrapping needed)
 * - Reduced motion: pulse suppressed
 */

import { motion, useReducedMotion } from "framer-motion";
import { Gauge, ThermometerSun, Droplets, Wind, Radio, Clock } from "lucide-react";
import { findAqiBand } from "@/lib/mock-data";

interface StatusPillProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  highlightColor?: string;
}

function StatusPill({ icon: Icon, label, value, unit, highlight, highlightColor }: StatusPillProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-colors"
      style={{
        background: highlight
          ? `${highlightColor}18`
          : "rgba(255,255,255,0.06)",
        border: highlight
          ? `1px solid ${highlightColor}40`
          : "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <Icon
        className="size-3.5 shrink-0"
        style={{ color: highlight ? highlightColor : "rgba(255,255,255,0.55)" }}
      />
      <span
        className="text-[11px] font-medium tabular-nums"
        style={{ color: highlight ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.65)" }}
      >
        {value}
        {unit && (
          <span style={{ color: highlight ? highlightColor : "rgba(255,255,255,0.40)" }}>
            &thinsp;{unit}
          </span>
        )}
      </span>
      <span className="text-[10px] hidden sm:inline" style={{ color: "rgba(255,255,255,0.30)" }}>
        {label}
      </span>
    </div>
  );
}

/** Separator between pills */
function Sep() {
  return (
    <div
      aria-hidden
      className="w-px h-4 shrink-0 self-center"
      style={{ background: "rgba(255,255,255,0.10)" }}
    />
  );
}

export interface LiveStatusBarProps {
  aqi: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  sensorsOnline?: number;
  lastUpdated?: string;
}

export function LiveStatusBar({
  aqi,
  temp,
  humidity,
  windSpeed,
  sensorsOnline,
  lastUpdated,
}: LiveStatusBarProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const band = findAqiBand(aqi);

  // Derive highlight color from AQI
  const aqiColor =
    aqi <= 50  ? "#10b981" :
    aqi <= 100 ? "#eab308" :
    aqi <= 150 ? "#f97316" :
    aqi <= 200 ? "#ef4444" :
                 "#a855f7";

  return (
    <motion.div
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      initial={prefersReduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      style={{ scrollbarWidth: "none" }}
    >
      {/* Live indicator */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
        style={{
          background: "rgba(16,185,129,0.15)",
          border: "1px solid rgba(16,185,129,0.35)",
        }}
      >
        <span
          className="size-2 rounded-full shrink-0"
          style={{
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
            animation: prefersReduced ? "none" : "live-pulse 2s ease-in-out infinite",
          }}
        />
        <Radio className="size-3.5 text-emerald-400 shrink-0" />
        <span className="text-[11px] font-semibold text-emerald-400">Live</span>
      </div>

      <Sep />

      {/* AQI */}
      <StatusPill
        icon={Gauge}
        label="AQI"
        value={aqi}
        highlight
        highlightColor={aqiColor}
      />

      {/* Temperature */}
      {temp != null && (
        <>
          <Sep />
          <StatusPill icon={ThermometerSun} label="Temp" value={temp} unit="°C" />
        </>
      )}

      {/* Humidity */}
      {humidity != null && (
        <>
          <Sep />
          <StatusPill icon={Droplets} label="Humidity" value={humidity} unit="%" />
        </>
      )}

      {/* Wind */}
      {windSpeed != null && (
        <>
          <Sep />
          <StatusPill icon={Wind} label="Wind" value={windSpeed} unit="km/h" />
        </>
      )}

      {/* Sensors online */}
      {sensorsOnline != null && (
        <>
          <Sep />
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <span
              className="size-1.5 rounded-full bg-emerald-400 shrink-0"
              style={{ animation: prefersReduced ? "none" : "live-pulse 3s ease-in-out 1s infinite" }}
            />
            <span className="text-[11px] text-white/65 font-medium">
              {sensorsOnline} sensors
            </span>
          </div>
        </>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <>
          <Sep />
          <StatusPill icon={Clock} label="Updated" value={lastUpdated} />
        </>
      )}

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #10b981; }
          50%       { opacity: 0.5; box-shadow: 0 0 12px #10b981; }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </motion.div>
  );
}
