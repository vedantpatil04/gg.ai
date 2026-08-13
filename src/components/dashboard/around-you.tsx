/**
 * AroundYou — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 *
 * Compact local comparison — the current city plus its 3 nearest
 * neighbours by straight-line distance, from the same city list already
 * used app-wide (live API list when connected, the existing offline
 * fallback list otherwise). No sparklines, no artificial rankings, no
 * invented cities or readings.
 *
 * Phase 2 change (UI only, same data/props): stronger AQI/name hierarchy,
 * tighter row rhythm, and a subtle hover state on the comparison rows.
 * Rows remain non-interactive display data (no navigation exists today),
 * so no focus/keyboard affordance was added — that would be a false
 * signal without a real action behind it.
 */

import { Panel } from "@/components/ui-bits";
import { aqiBand, type City } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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
    .map((c) => ({ city: c, dist: distanceKm(currentCity.lat, currentCity.lng, c.lat, c.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, Math.max(0, maxTotal - 1))
    .map((n) => n.city);

  const rows = [currentCity, ...nearby];

  return (
    <Panel title="Around You" surface="card">
      <div className="divide-y divide-border/70">
        {rows.map((c, i) => {
          const band = aqiBand(c.aqi);
          const isCurrent = i === 0;
          return (
            <div
              key={c.id}
              className={cn(
                "flex items-center justify-between gap-3 py-3 px-2.5 -mx-2.5 rounded-lg text-sm transition-colors",
                isCurrent ? "bg-muted/40" : "hover:bg-muted/25",
              )}
            >
              <span className="font-medium flex items-center gap-2 min-w-0">
                <span className="truncate">{c.name}</span>
                {isCurrent && (
                  <span className="shrink-0 text-[10px] font-normal text-muted-foreground uppercase tracking-wider">
                    You
                  </span>
                )}
              </span>
              <span className="flex items-baseline gap-1.5 shrink-0">
                <span className="tabular-nums font-semibold text-base" style={{ color: band.color }}>
                  {c.aqi}
                </span>
                <span className="text-xs" style={{ color: band.color }}>
                  {band.label}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
