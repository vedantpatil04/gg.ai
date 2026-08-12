/**
 * status-ribbon.tsx — Phase 1 live status ribbon
 *
 * Compact strip beneath the hero summarizing the same live readings at a
 * glance. Scrolling/ticker motion is called out as optional in the phase
 * brief — a static, wrapping flex row was used instead so the numbers stay
 * readable rather than animating past the user.
 *
 * Same wind/condition note as hero.tsx: those two fields aren't present
 * on the live City model, so CO₂ and Water Quality (both real, live
 * fields) fill the ribbon instead.
 */
import { Gauge, Thermometer, Droplets, CloudCog, Waves, Clock } from "lucide-react";
import type { City } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/format-time";

export function LiveStatusRibbon({ city }: { city: City }) {
  const items = [
    { icon: Gauge, label: "AQI", value: `${city.aqi}` },
    { icon: Thermometer, label: "Temp", value: `${city.temp}°C` },
    { icon: Droplets, label: "Humidity", value: `${city.humidity}%` },
    { icon: CloudCog, label: "CO₂", value: `${city.co2} ppm` },
    { icon: Waves, label: "Water quality", value: `${city.water}%` },
    // Real reading timestamp (same field the Environment page and
    // Dashboard use), not a hardcoded literal — see format-time.ts.
    { icon: Clock, label: "Updated", value: formatRelativeTime(city.updatedAt) },
  ];

  return (
    <div
      className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2"
      role="status"
      aria-label="Live environmental status"
    >
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-2">
          <it.icon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.label}</span>
          <span className="text-xs font-semibold tabular-nums">{it.value}</span>
          {i < items.length - 1 && <span className="hidden sm:inline-block w-px h-3 bg-border ml-4" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
