/**
 * AroundYou — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 * Phase 2A: Correction & Production Polish
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
 *
 * Phase 2A layout: the previous single-column list (name left, AQI right)
 * left most of the panel's width empty on wide screens — every row used
 * the same narrow shape regardless of how much room the card had. The
 * current city now gets one prominent full-width row (it's the one the
 * citizen actually cares about), and its neighbours sit in a 3-column
 * grid below, so the same data fills the available width instead of
 * stretching a single thin column across it. Same rows, same fields, no
 * new metrics.
 */

import { Panel } from "@/components/ui-bits";
import { aqiBand, type City } from "@/lib/mock-data";

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

  const currentBand = aqiBand(currentCity.aqi);

  return (
    <Panel title="Around You" surface="card">
      <div className="space-y-3">
        {/* Current city — the one row the citizen is actually here for,
            so it stays full-width and visually first regardless of how
            many neighbours are shown below. */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3.5 py-3 text-sm">
          <span className="font-medium flex items-center gap-2 min-w-0">
            <span className="truncate">{currentCity.name}</span>
            <span className="shrink-0 text-[10px] font-normal text-muted-foreground uppercase tracking-wider">
              You
            </span>
          </span>
          <span className="flex items-baseline gap-1.5 shrink-0">
            <span className="tabular-nums font-semibold text-lg" style={{ color: currentBand.color }}>
              {currentCity.aqi}
            </span>
            <span className="text-xs" style={{ color: currentBand.color }}>
              {currentBand.label}
            </span>
          </span>
        </div>

        {nearby.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {nearby.map((c) => {
              const band = aqiBand(c.aqi);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2.5 rounded-lg border border-border/70 px-3 py-2.5 text-sm transition-colors hover:bg-muted/25"
                >
                  <span className="font-medium truncate min-w-0">{c.name}</span>
                  <span className="flex items-baseline gap-1 shrink-0">
                    <span className="tabular-nums font-semibold" style={{ color: band.color }}>
                      {c.aqi}
                    </span>
                    <span className="text-[11px]" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
