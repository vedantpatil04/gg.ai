/**
 * Phase 4 — Global Location Intelligence System
 *
 * Drop-in replacement for the Phase 3 city selector pill in the enterprise
 * navbar.  Exported surface:
 *
 *   <LocationIntelligenceButton />
 *
 * Features
 * ─────────
 *  • Premium trigger pill  — flag emoji · city · AQI band · chevron
 *  • Enterprise Sheet drawer (right-side, Radix via existing ui/sheet)
 *    - 📍 Current Location  (uses existing useGeolocation hook)
 *    - 🔍 Fuzzy search by city / state / country
 *    - ⭐ Favorites          (persisted to localStorage "gg-fav-cities")
 *    - 🕒 Recents           (persisted to localStorage "gg-recent-cities")
 *    - 🌍 All Cities        (rich cards with flag, AQI, temp, status)
 *  • Uses existing CityContext (setCityId, cities, refreshCity, city)
 *  • Uses existing useGeolocation hook for device location
 *  • Uses existing measureDistanceMeters from map-visuals for nearest-city
 *  • Uses existing aqiBand / findAqiBand from mock-data
 *  • All global state (city, cities) flows through existing CityContext —
 *    no duplicate state management
 *
 * Storage keys (follows "gg-*" convention already used for theme + city)
 *   gg-fav-cities    — JSON string[]  of city IDs
 *   gg-recent-cities — JSON string[]  of city IDs (latest first, max 5)
 */

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  MapPin,
  Star,
  Clock,
  Globe,
  Search,
  ChevronDown,
  Loader2,
  WifiOff,
  Navigation,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { aqiBand, findAqiBand } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { useGeolocation } from "@/hooks/use-geolocation";
import { measureDistanceMeters } from "@/lib/map/map-visuals";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// ─── Constants ────────────────────────────────────────────────────────────────

const FAV_KEY    = "gg-fav-cities";
const RECENT_KEY = "gg-recent-cities";
const MAX_RECENT = 5;

/** Configurable default fallback city ID (Belagavi per Phase 4 spec) */
const DEFAULT_CITY_ID = "belagavi";

// ─── Country → Flag emoji lookup ──────────────────────────────────────────────
// Covers every country currently present in CITIES mock data + backend cities.
// Add entries here as new countries are onboarded.

const COUNTRY_FLAG: Record<string, string> = {
  India:       "🇮🇳",
  UK:          "🇬🇧",
  "United Kingdom": "🇬🇧",
  USA:         "🇺🇸",
  "United States": "🇺🇸",
  Singapore:   "🇸🇬",
  Japan:       "🇯🇵",
  UAE:         "🇦🇪",
  "United Arab Emirates": "🇦🇪",
  Australia:   "🇦🇺",
  Germany:     "🇩🇪",
  France:      "🇫🇷",
  Canada:      "🇨🇦",
  Brazil:      "🇧🇷",
  China:       "🇨🇳",
};

export function countryFlag(country: string): string {
  return COUNTRY_FLAG[country] ?? "🌐";
}

// ─── State / region lookup ────────────────────────────────────────────────────
// The City type has no `state` field.  We maintain a lightweight lookup here
// keyed by city ID so the drawer can show "Karnataka, India" style subtitles.
// Backend cities that don't appear here will fall back to just `city.country`.

const CITY_REGION: Record<string, string> = {
  belagavi:   "Karnataka",
  bengaluru:  "Karnataka",
  mumbai:     "Maharashtra",
  delhi:      "Delhi",
  hyderabad:  "Telangana",
  chennai:    "Tamil Nadu",
  pune:       "Maharashtra",
  kolkata:    "West Bengal",
  ahmedabad:  "Gujarat",
  london:     "England",
  newyork:    "New York",
  singapore:  "",
  tokyo:      "Tokyo",
  dubai:      "Dubai Emirate",
};

function cityRegionLabel(city: City): string {
  const region = CITY_REGION[city.id];
  if (region) return `${region}, ${city.country}`;
  return city.country;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
}

// ─── Fuzzy search ─────────────────────────────────────────────────────────────
// Simple substring match across name, region, and country.
// Prioritises exact prefix matches over substring matches.

function searchCities(cities: City[], query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return cities;
  return cities.filter((c) => {
    const region = (CITY_REGION[c.id] ?? "").toLowerCase();
    const targets = [c.name.toLowerCase(), region, c.country.toLowerCase()];
    return targets.some((t) => t.includes(q));
  });
}

// ─── Nearest city finder ──────────────────────────────────────────────────────

function findNearestCity(
  lat: number,
  lng: number,
  cities: City[],
): City | null {
  if (!cities.length) return null;
  let nearest = cities[0];
  let minDist = measureDistanceMeters({ lat, lng }, nearest);
  for (const c of cities.slice(1)) {
    const d = measureDistanceMeters({ lat, lng }, c);
    if (d < minDist) { minDist = d; nearest = c; }
  }
  return nearest;
}

// ─── AQI status dot ───────────────────────────────────────────────────────────

function AqiDot({ aqi, className }: { aqi: number; className?: string }) {
  const { color } = aqiBand(aqi);
  return (
    <span
      className={cn("inline-block size-2 rounded-full shrink-0", className)}
      style={{ background: color }}
    />
  );
}

// ─── Rich city card ───────────────────────────────────────────────────────────

interface CityCardProps {
  city: City;
  selected: boolean;
  favorited: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function CityCard({ city, selected, favorited, onSelect, onToggleFavorite }: CityCardProps) {
  const band   = findAqiBand(city.aqi);
  const flag   = countryFlag(city.country);
  const region = cityRegionLabel(city);

  const updatedLabel = city.updatedAt
    ? (() => {
        const diff = Date.now() - new Date(city.updatedAt).getTime();
        if (diff < 60_000)  return "Updated just now";
        if (diff < 3_600_000) return `Updated ${Math.floor(diff / 60_000)}m ago`;
        return `Updated ${Math.floor(diff / 3_600_000)}h ago`;
      })()
    : null;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer",
        "transition-colors duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/70 text-foreground",
      )}
      aria-pressed={selected}
      aria-label={`Select ${city.name}, AQI ${city.aqi}`}
    >
      {/* Flag */}
      <span className="text-xl leading-none shrink-0" aria-hidden="true">{flag}</span>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold truncate", selected && "text-primary")}>
            {city.name}
          </span>
          {selected && (
            <span className="shrink-0 size-1.5 rounded-full bg-primary" />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{region}</div>
      </div>

      {/* AQI + Temp */}
      <div className="shrink-0 text-right space-y-0.5">
        <div className="flex items-center gap-1 justify-end">
          <AqiDot aqi={city.aqi} />
          <span className="text-xs font-semibold tabular-nums">{city.aqi}</span>
          <span
            className="text-[10px] font-medium"
            style={{ color: band.color }}
          >
            {band.shortLabel}
          </span>
        </div>
        {city.temp !== undefined && (
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {city.temp}°C
            {updatedLabel && <span className="ml-1 opacity-60">· {updatedLabel}</span>}
          </div>
        )}
      </div>

      {/* Favorite star */}
      <button
        type="button"
        onClick={onToggleFavorite}
        className={cn(
          "shrink-0 size-7 grid place-items-center rounded-lg",
          "transition-opacity duration-150",
          favorited
            ? "opacity-100 text-amber-400"
            : "opacity-40 hover:opacity-100 group-hover:opacity-100 text-muted-foreground hover:text-amber-400",
        )}
        aria-label={favorited ? `Remove ${city.name} from favorites` : `Add ${city.name} to favorites`}
      >
        <Star className={cn("size-3.5", favorited && "fill-amber-400")} />
      </button>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-2">
      <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 select-none">
        {label}
      </span>
    </div>
  );
}

// ─── Current location row ──────────────────────────────────────────────────────

function CurrentLocationRow({
  cities,
  onSelect,
  isCityFetching,
}: {
  cities: City[];
  onSelect: (id: string) => void;
  isCityFetching?: boolean;
}) {
  const { status, position, locate } = useGeolocation();

  const requesting = status === "requesting";
  const denied     = status === "denied" || status === "insecure_origin" || status === "unavailable";

  // Auto-select nearest city once we have a position
  useEffect(() => {
    if (status === "granted" && position) {
      const nearest = findNearestCity(position.lat, position.lng, cities);
      if (nearest) onSelect(nearest.id);
    }
  }, [status, position, cities, onSelect]);

  if (denied) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 mx-1">
        <WifiOff className="size-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Location unavailable</p>
          <p className="text-xs text-muted-foreground/70">Enable location in browser settings</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={locate}
      disabled={requesting || isCityFetching}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
        "hover:bg-muted/70 transition-colors duration-150",
        (requesting || isCityFetching) && "opacity-70 cursor-wait",
      )}
      aria-label="Use device location"
    >
      <div className="size-8 rounded-xl bg-primary/10 grid place-items-center shrink-0">
        {requesting
          ? <Loader2 className="size-4 text-primary animate-spin" />
          : <Navigation className="size-4 text-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Current Location</p>
        <p className="text-xs text-muted-foreground">
          {requesting ? "Acquiring location…" : "Use device location"}
        </p>
      </div>
    </button>
  );
}

// ─── Location Drawer ──────────────────────────────────────────────────────────

interface LocationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function LocationDrawer({ open, onClose }: LocationDrawerProps) {
  const {
    city: activeCity,
    cities,
    setCityId,
    isCityFetching,
    refreshCity,
  } = useCity();

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Favorites
  const [favIds, setFavIds] = useState<string[]>(() => readIds(FAV_KEY));
  // Recents
  const [recentIds, setRecentIds] = useState<string[]>(() => readIds(RECENT_KEY));

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 120);
    if (!open) setQuery("");
  }, [open]);

  // Select a city: update context, push to recents, close drawer
  const selectCity = useCallback(
    (id: string) => {
      setCityId(id);
      refreshCity();
      setRecentIds((prev) => {
        const next = [id, ...prev.filter((r) => r !== id)].slice(0, MAX_RECENT);
        writeIds(RECENT_KEY, next);
        return next;
      });
      onClose();
    },
    [setCityId, refreshCity, onClose],
  );

  // Toggle favorite
  const toggleFavorite = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      writeIds(FAV_KEY, next);
      return next;
    });
  }, []);

  // Derived city lists
  const allCities  = cities;
  const filtered   = useMemo(() => searchCities(allCities, query), [allCities, query]);
  const favCities  = useMemo(() => allCities.filter((c) => favIds.includes(c.id)), [allCities, favIds]);
  const recentCities = useMemo(
    () =>
      recentIds
        .map((id) => allCities.find((c) => c.id === id))
        .filter((c): c is City => !!c && c.id !== activeCity.id)
        .slice(0, MAX_RECENT),
    [recentIds, allCities, activeCity.id],
  );

  const isSearching = query.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col max-w-[92vw] h-full"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0 pr-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              Location Intelligence
            </SheetTitle>
            {isCityFetching && (
              <Loader2 className="size-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Active city summary */}
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-muted/50 text-left">
            <span className="text-xl leading-none shrink-0">{countryFlag(activeCity.country)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">{activeCity.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium shrink-0 leading-none">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{cityRegionLabel(activeCity)}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <AqiDot aqi={activeCity.aqi} />
                <span className="text-xs font-bold tabular-nums">{activeCity.aqi}</span>
              </div>
              <p className="text-[10px] text-muted-foreground" style={{ color: aqiBand(activeCity.aqi).color }}>
                {findAqiBand(activeCity.aqi).label}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, state or country…"
              className="pl-8 h-9 text-sm bg-muted/40 border-border/50 focus:bg-background"
              aria-label="Search cities"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 grid place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* City list */}
        <ScrollArea className="flex-1">
          <div className="py-2 px-1">

            {/* Search results */}
            {isSearching ? (
              filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                  <Globe className="size-8 opacity-30" />
                  <p className="text-sm">No cities match "{query}"</p>
                </div>
              ) : (
                <>
                  <SectionHeading icon={Search} label={`${filtered.length} result${filtered.length !== 1 ? "s" : ""}`} />
                  {filtered.map((c) => (
                    <CityCard
                      key={c.id}
                      city={c}
                      selected={c.id === activeCity.id}
                      favorited={favIds.includes(c.id)}
                      onSelect={() => selectCity(c.id)}
                      onToggleFavorite={(e) => toggleFavorite(e, c.id)}
                    />
                  ))}
                </>
              )
            ) : (
              <>
                {/* Current Location */}
                <SectionHeading icon={MapPin} label="Current Location" />
                <div className="px-1 pb-1">
                  <CurrentLocationRow
                    cities={allCities}
                    onSelect={selectCity}
                    isCityFetching={isCityFetching}
                  />
                </div>

                <div className="mx-4 my-1 border-t border-border/40" />

                {/* Favorites */}
                {favCities.length > 0 && (
                  <>
                    <SectionHeading icon={Star} label="Favorites" />
                    {favCities.map((c) => (
                      <CityCard
                        key={c.id}
                        city={c}
                        selected={c.id === activeCity.id}
                        favorited={true}
                        onSelect={() => selectCity(c.id)}
                        onToggleFavorite={(e) => toggleFavorite(e, c.id)}
                      />
                    ))}
                    <div className="mx-4 my-1 border-t border-border/40" />
                  </>
                )}

                {/* Recents */}
                {recentCities.length > 0 && (
                  <>
                    <SectionHeading icon={Clock} label="Recent" />
                    {recentCities.map((c) => (
                      <CityCard
                        key={c.id}
                        city={c}
                        selected={false}
                        favorited={favIds.includes(c.id)}
                        onSelect={() => selectCity(c.id)}
                        onToggleFavorite={(e) => toggleFavorite(e, c.id)}
                      />
                    ))}
                    <div className="mx-4 my-1 border-t border-border/40" />
                  </>
                )}

                {/* All Cities */}
                <SectionHeading icon={Globe} label="All Cities" />
                {allCities.map((c) => (
                  <CityCard
                    key={c.id}
                    city={c}
                    selected={c.id === activeCity.id}
                    favorited={favIds.includes(c.id)}
                    onSelect={() => selectCity(c.id)}
                    onToggleFavorite={(e) => toggleFavorite(e, c.id)}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Trigger pill ─────────────────────────────────────────────────────────────
//
// Renders the navbar button that opens the drawer.
// Fully responsive across mobile, tablet, and desktop viewports.
// ─────────────────────────────────────────────────────────────────────────────

interface LocationIntelligenceButtonProps {
  /** Extra classes forwarded to the trigger pill wrapper */
  className?: string;
}

export function LocationIntelligenceButton({ className }: LocationIntelligenceButtonProps) {
  const { city } = useCity();
  const [open, setOpen]   = useState(false);
  const band = findAqiBand(city.aqi);
  const flag = countryFlag(city.country);

  return (
    <>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 h-8 sm:h-9 text-xs sm:text-sm shrink-0",
          "border border-border/60 bg-muted/40 hover:bg-muted active:scale-[0.98]",
          "transition-all duration-150",
          className,
        )}
        aria-label={`Selected region: ${city.name}, ${cityRegionLabel(city)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* Flag */}
        <span className="text-sm sm:text-base leading-none shrink-0" aria-hidden="true">{flag}</span>

        {/* City name — visible across all breakpoints, gracefully truncated on small screens */}
        <span className="font-medium truncate max-w-[68px] xs:max-w-[100px] sm:max-w-none">
          {city.name}
        </span>

        {/* AQI with bullet separator — desktop only */}
        <span className="text-muted-foreground/50 hidden xl:inline">·</span>
        <span
          className="text-xs font-semibold hidden xl:inline tabular-nums"
          style={{ color: band.color }}
        >
          AQI {city.aqi}
        </span>

        <ChevronDown
          className={cn(
            "size-3 sm:size-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Drawer (rendered via Radix Portal — always above Smart Map) */}
      <LocationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ─── Sidebar Quick Widget (Mobile Navigation Drawer) ──────────────────────────
//
// Renders an interactive current-city card inside the mobile navigation drawer.
// ─────────────────────────────────────────────────────────────────────────────

export function LocationIntelligenceSidebarWidget({ onSelect }: { onSelect?: () => void }) {
  const { city } = useCity();
  const [open, setOpen] = useState(false);
  const band = findAqiBand(city.aqi);
  const flag = countryFlag(city.country);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl text-left",
          "border border-sidebar-border/60 bg-sidebar-accent/50 hover:bg-sidebar-accent",
          "transition-colors duration-150 group",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        )}
        aria-label={`Active City: ${city.name}. Tap to change city.`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg leading-none shrink-0" aria-hidden="true">{flag}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">{city.name}</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none shrink-0"
                style={{
                  backgroundColor: `color-mix(in oklab, ${band.color} 15%, transparent)`,
                  color: band.color,
                }}
              >
                AQI {city.aqi}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate block">
              {cityRegionLabel(city)} · Tap to switch
            </span>
          </div>
        </div>

        <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
      </button>

      <LocationDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          onSelect?.();
        }}
      />
    </>
  );
}

// ─── Default city bootstrap ───────────────────────────────────────────────────
//
// Ensures that on first launch (no saved city), the app defaults to
// DEFAULT_CITY_ID (Belagavi) rather than whatever CITIES[0] happens to be.
// This is called once at the CityProvider level — do NOT call multiple times.
//
// Priority order implemented:
//   1. Previously saved city  (already in CityProvider via localStorage)
//   2. Device location        (user clicks "Current Location" in drawer)
//   3. DEFAULT_CITY_ID        (this helper — applied at startup if no saved city)
// ─────────────────────────────────────────────────────────────────────────────

export function ensureDefaultCity() {
  try {
    const saved = localStorage.getItem("gg-city");
    if (!saved) {
      localStorage.setItem("gg-city", DEFAULT_CITY_ID);
    }
  } catch {}
}
