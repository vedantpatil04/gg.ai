import { Loader2, MapPinned } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pill } from "@/components/ui-bits";
import { AdminEmptyState } from "@/components/admin/admin-dashboard-container";
import { aqiPill } from "./aqi-pill";
import {
  getMonitoringStatus,
  useCityDirectory,
  type DirectoryCity,
} from "./city-directory-queries";

export type HealthFilter = "all" | "healthy" | "moderate" | "unhealthy";

const MONITORING_PILL_TONE = {
  online: "success",
  warning: "warning",
  offline: "muted",
} as const;

const MONITORING_LABEL = {
  online: "Online",
  warning: "Warning",
  offline: "Offline",
} as const;

function matchesHealthFilter(city: DirectoryCity, filter: HealthFilter): boolean {
  if (filter === "all") return true;
  if (!city.reading) return false; // no AQI to categorize
  const aqi = city.reading.aqi;
  if (filter === "healthy") return aqi <= 50;
  if (filter === "moderate") return aqi > 50 && aqi <= 100;
  return aqi > 100; // unhealthy — covers Unhealthy(SG)/Unhealthy/Very Unhealthy/Hazardous
}

interface CityDirectoryListProps {
  healthFilter: HealthFilter;
  searchTerm: string;
  onSelect: (city: DirectoryCity) => void;
}

export function CityDirectoryList({ healthFilter, searchTerm, onSelect }: CityDirectoryListProps) {
  const { cities, isLoading, isError } = useCityDirectory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center py-12">
        Couldn't load cities. Try refreshing.
      </p>
    );
  }

  const term = searchTerm.trim().toLowerCase();
  const filtered = (cities ?? [])
    .filter((c) => matchesHealthFilter(c, healthFilter))
    .filter((c) => !term || c.name.toLowerCase().includes(term));

  if (filtered.length === 0) {
    return (
      <AdminEmptyState
        icon={MapPinned}
        title="No monitored cities found."
        description={
          term ? `No city name matched "${searchTerm}".` : "No cities match the current filter."
        }
      />
    );
  }

  return (
    <div>
      {/* Mobile Stacked Cards (< md) */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((city) => {
          const status = getMonitoringStatus(city.reading);
          const aqi = city.reading ? aqiPill(city.reading.aqi) : null;
          return (
            <div
              key={city.cityId}
              onClick={() => onSelect(city)}
              className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/60 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold truncate leading-snug">{city.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{city.country}</div>
                </div>
                {aqi && (
                  <Pill tone={aqi.tone} className="shrink-0">
                    {aqi.label}
                  </Pill>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs pt-1.5 border-t border-border/40 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    AQI {city.reading?.aqi ?? "—"}
                  </span>
                  <Pill tone={MONITORING_PILL_TONE[status]}>{MONITORING_LABEL[status]}</Pill>
                </div>
                <span className="text-[11px] shrink-0">
                  {city.reading
                    ? formatDistanceToNow(new Date(city.reading.timestamp), { addSuffix: true })
                    : "Never"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Current AQI</TableHead>
              <TableHead>Air Quality</TableHead>
              <TableHead>Monitoring</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((city) => {
              const status = getMonitoringStatus(city.reading);
              const aqi = city.reading ? aqiPill(city.reading.aqi) : null;
              return (
                <TableRow key={city.cityId} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(city)}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell className="text-muted-foreground">{city.country}</TableCell>
                  <TableCell className="tabular-nums">{city.reading?.aqi ?? "—"}</TableCell>
                  <TableCell>
                    {aqi ? (
                      <Pill tone={aqi.tone}>{aqi.label}</Pill>
                    ) : (
                      <span className="text-muted-foreground">No data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Pill tone={MONITORING_PILL_TONE[status]}>{MONITORING_LABEL[status]}</Pill>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {city.reading
                      ? formatDistanceToNow(new Date(city.reading.timestamp), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
