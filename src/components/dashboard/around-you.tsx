/**
 * AroundYou — Section 8: Around You
 *
 * Compact local/regional comparison answering: "How does my environment compare with other places?"
 * Displays:
 *   - Current user's city first with "You are here" badge + AQI status
 *   - 3 comparison / nearby cities
 *   - Compact card format with band color coding
 *   - Link to /map for spatial exploration
 */

import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/ui-bits";
import { aqiBand, type City } from "@/lib/mock-data";
import { MapPin, ArrowRight } from "lucide-react";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function AroundYou({
  currentCity,
  cities,
  maxTotal = 4,
}: {
  currentCity: City;
  cities: City[];
  maxTotal?: number;
}) {
  const nearby = cities
    .filter((c) => c.id !== currentCity.id)
    .map((c) => ({
      city: c,
      dist: distanceKm(currentCity.lat, currentCity.lng, c.lat, c.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, Math.max(0, maxTotal - 1))
    .map((n) => n.city);

  const currentBand = aqiBand(currentCity.aqi);

  return (
    <Panel
      eyebrow="Regional Comparison"
      title="Around You"
      surface="card"
      action={
        <Link
          to="/map"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>Explore on Smart Map</span>
          <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      <div className="space-y-3">
        {/* Current city — prominent top row */}
        <div
          className="flex items-center justify-between gap-3 rounded-xl p-3.5 border transition-all"
          style={{
            background: `color-mix(in oklab, ${currentBand.color} 10%, transparent)`,
            borderColor: `color-mix(in oklab, ${currentBand.color} 30%, transparent)`,
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in oklab, ${currentBand.color} 20%, transparent)`,
                color: currentBand.color,
              }}
            >
              <MapPin className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                <span>{currentCity.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                  You are here
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{currentCity.country}</div>
            </div>
          </div>

          <div className="flex items-baseline gap-2 shrink-0 text-right">
            <span
              className="tabular-nums font-extrabold text-2xl"
              style={{ color: currentBand.color }}
            >
              {currentCity.aqi}
            </span>
            <span className="text-xs font-semibold" style={{ color: currentBand.color }}>
              {currentBand.label}
            </span>
          </div>
        </div>

        {/* Nearby / comparison cities */}
        {nearby.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {nearby.map((c) => {
              const band = aqiBand(c.aqi);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/35 px-3.5 py-3 text-sm transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.country}</div>
                  </div>

                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span
                      className="tabular-nums font-bold text-base"
                      style={{ color: band.color }}
                    >
                      {c.aqi}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
