import { formatDistanceToNow } from "date-fns";
import { useCity } from "@/lib/city-context";
import { findAqiBand, type City } from "@/lib/mock-data";
import { measureDistanceMeters, formatDistance } from "@/lib/map/map-visuals";
import { EnvNearbyCitiesSkeleton } from "@/components/environment/phase8/env-phase8-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

const MAX_NEARBY = 4;

function NearbyCityCard({ city, distanceMeters }: { city: City; distanceMeters: number }) {
  // A card only ever renders if aqi is present (guaranteed upstream), so
  // only truly optional fields are conditionally shown below.
  const band = findAqiBand(city.aqi);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border p-4 glass"
      aria-label={`${city.name}, AQI ${city.aqi}, ${band.label}, ${formatDistance(distanceMeters)} away`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{city.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{city.country}</div>
      </div>

      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border w-fit"
        style={{
          color: band.color,
          borderColor: `color-mix(in oklab, ${band.color} 35%, transparent)`,
          background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
        }}
      >
        AQI {city.aqi} · {band.label}
      </span>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        {typeof city.temp === "number" && <span>{city.temp}°C</span>}
        <span>{formatDistance(distanceMeters)} away</span>
      </div>

      {city.updatedAt && (
        <div className="text-[10px] text-muted-foreground">
          Updated {formatDistanceToNow(new Date(city.updatedAt), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}

export function NearbyCities({ className }: { className?: string }) {
  const { city, cities, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) {
    return <EnvNearbyCitiesSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load nearby city data."
      />
    );
  }

  // Real distance from the selected city's real coordinates — no invented
  // cities, no invented locations. Only cities with a usable AQI reading
  // and coordinates are eligible; partial/incomplete entries are dropped
  // rather than shown with fabricated gaps.
  const nearby = (cities ?? [])
    .filter(
      (c) =>
        c.id !== city.id &&
        typeof c.aqi === "number" &&
        typeof c.lat === "number" &&
        typeof c.lng === "number",
    )
    .map((c) => ({ city: c, distanceMeters: measureDistanceMeters(city, c) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_NEARBY);

  if (nearby.length === 0) {
    return (
      <EnvEmptyState className={className} title="No nearby city data is currently available." />
    );
  }

  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Compared to {city.name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {nearby.map(({ city: c, distanceMeters }) => (
          <NearbyCityCard key={c.id} city={c} distanceMeters={distanceMeters} />
        ))}
      </div>
    </div>
  );
}
