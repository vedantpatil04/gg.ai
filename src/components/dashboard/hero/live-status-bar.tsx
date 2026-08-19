/**
 * LiveStatusBar — Responsive Cinematic Hero Status Bar
 *
 * A floating glass pill row displaying live sensor telemetry at a glance.
 * Smoothly touch-scrollable on mobile with compact padding and crisp hierarchy.
 *
 * Displays:
 *   🛰 Live · AQI · Temperature · Humidity · Wind · Sensors Online · Last Updated
 */

import { motion, useReducedMotion } from "framer-motion";
import { Gauge, ThermometerSun, Droplets, Wind, Radio, Clock } from "lucide-react";
import { findAqiBand } from "@/lib/mock-data";

interface StatusPillProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  highlightColor?: string;
}

function StatusPill({ icon: Icon, label, value, unit, highlight, highlightColor }: StatusPillProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0 transition-colors"
      style={{
        background: highlight
          ? `${highlightColor}18`
          : "rgba(255,255,255,0.08)",
        border: highlight
          ? `1px solid ${highlightColor}45`
          : "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Icon
        className="size-3 sm:size-3.5 shrink-0"
        style={{ color: highlight ? highlightColor : "rgba(255,255,255,0.65)" }}
      />
      <span
        className="text-[10px] sm:text-[11px] font-semibold tabular-nums"
        style={{ color: highlight ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.80)" }}
      >
        {value}
        {unit && (
          <span style={{ color: highlight ? highlightColor : "rgba(255,255,255,0.50)" }}>
            &thinsp;{unit}
          </span>
        )}
      </span>
      <span className="text-[9px] sm:text-[10px] hidden md:inline" style={{ color: "rgba(255,255,255,0.40)" }}>
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <div
      aria-hidden
      className="w-px h-3.5 sm:h-4 shrink-0 self-center"
      style={{ background: "rgba(255,255,255,0.12)" }}
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

  const aqiColor = band.color;

  return (
    <motion.div
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full py-0.5"
      initial={prefersReduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {/* Live indicator */}
      <div
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0"
        style={{
          background: "rgba(16,185,129,0.18)",
          border: "1px solid rgba(16,185,129,0.40)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="size-1.5 sm:size-2 rounded-full shrink-0"
          style={{
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
            animation: prefersReduced ? "none" : "live-pulse 2s ease-in-out infinite",
          }}
        />
        <Radio className="size-3 sm:size-3.5 text-emerald-400 shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
          Live
        </span>
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              className="size-1.5 rounded-full bg-emerald-400 shrink-0"
              style={{ animation: prefersReduced ? "none" : "live-pulse 3s ease-in-out 1s infinite" }}
            />
            <span className="text-[10px] sm:text-[11px] text-white/75 font-medium">
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
