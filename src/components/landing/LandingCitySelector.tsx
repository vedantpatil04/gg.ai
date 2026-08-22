import { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, ChevronDown, Check, Search, X } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand, type City } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Map country names to ISO-like 2-letter codes for compact premium badge display
function getCountryCode(country: string): string {
  const map: Record<string, string> = {
    India: "IN",
    Japan: "JP",
    "United Arab Emirates": "AE",
    UAE: "AE",
    "United Kingdom": "GB",
    UK: "GB",
    Singapore: "SG",
    "United States": "US",
    USA: "US",
  };
  return map[country] || country.slice(0, 2).toUpperCase();
}

export function LandingCitySelector({ className }: { className?: string }) {
  const { city, setCityId, cities } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter cities by search term
  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase().trim();
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [cities, search]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCities.length]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCities.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCities[highlightedIndex]) {
        handleSelectCity(filteredCities[highlightedIndex]);
      }
    }
  };

  const handleSelectCity = (selected: City) => {
    setCityId(selected.id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select city. Current city: ${city.name}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 text-xs font-medium text-foreground backdrop-blur transition-all hover:bg-foreground/[0.06] hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1"
      >
        <MapPin className="size-3.5 text-[color:var(--color-primary)]" />
        <span className="max-w-[100px] truncate sm:max-w-[130px]">{city.name}</span>
        <ChevronDown
          className={cn("size-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Monitored Cities"
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Search Input */}
          <div className="relative mb-1 flex items-center border-b border-border/40 px-2 pb-1.5 pt-0.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monitored city…"
              className="w-full bg-transparent px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Cities List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
            {filteredCities.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No matching monitored city found
              </div>
            ) : (
              filteredCities.map((c, idx) => {
                const isSelected = c.id === city.id;
                const isHighlighted = idx === highlightedIndex;
                const aqiBand = findAqiBand(c.aqi);

                return (
                  <button
                    key={c.id}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                      isHighlighted ? "bg-muted/70 text-foreground" : "text-muted-foreground hover:text-foreground",
                      isSelected && "font-semibold text-foreground bg-primary/10",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                        {getCountryCode(c.country)}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${aqiBand.color} 15%, transparent)`,
                          color: aqiBand.color,
                        }}
                      >
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: aqiBand.color }} />
                        AQI {c.aqi}
                      </span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
