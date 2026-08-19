import { format } from "date-fns";
import { Radar, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionTitle, Pill, EmptyState } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCityDirectory } from "@/components/admin/city-directory/city-directory-queries";
import { CityDetailPanel } from "@/components/admin/city-directory/city-detail-panel";
import { useState } from "react";
import type { DirectoryCity } from "@/components/admin/city-directory/city-directory-queries";

function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function aqiTone(aqi: number): "success" | "warning" | "destructive" | "muted" {
  if (aqi <= 50) return "success";
  if (aqi <= 100) return "warning";
  return "destructive";
}

function FreshnessBadge({ timestamp }: { timestamp?: string }) {
  if (!timestamp) return <Pill tone="muted">No data</Pill>;
  const ageMin = Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (ageMin <= 90) return <Pill tone="success"><CheckCircle2 className="size-2.5 mr-1" />{ageMin}m ago</Pill>;
  if (ageMin <= 1440) return <Pill tone="warning"><Clock className="size-2.5 mr-1" />{Math.round(ageMin / 60)}h ago</Pill>;
  return <Pill tone="destructive"><AlertTriangle className="size-2.5 mr-1" />Stale</Pill>;
}

export function EnvironmentalMonitoringPage() {
  const [selected, setSelected] = useState<DirectoryCity | null>(null);
  const qc = useQueryClient();
  const { cities, isLoading, isError } = useCityDirectory();

  const sorted = [...(cities ?? [])].sort((a, b) => {
    const aAqi = a.reading?.aqi ?? -1;
    const bAqi = b.reading?.aqi ?? -1;
    return bAqi - aAqi; // worst first
  });

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Intelligence"
        title="Environmental Monitoring"
        action={
          <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] }); qc.invalidateQueries({ queryKey: ["admin-city-directory-env"] }); }} className="h-8 text-xs">
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-10">Couldn't load environmental data.</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Radar className="size-4" />} title="No cities configured." description="Add cities to begin environmental monitoring." />
        ) : (
          <div className="space-y-2">
            {sorted.map(c => {
              const r = c.reading;
              return (
                <div key={c.cityId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelected(c)}>
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                    <div className={cn("size-3 rounded-full shrink-0 mt-1 sm:mt-0", r ? (r.aqi <= 50 ? "bg-success" : r.aqi <= 100 ? "bg-warning" : "bg-destructive") : "bg-muted")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.country}</span>
                      </div>
                      {r ? (
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2 sm:gap-3">
                          <span>PM2.5: <strong>{r.pm25.toFixed(1)}</strong></span>
                          <span>PM10: <strong>{r.pm10.toFixed(1)}</strong></span>
                          <span>NO₂: <strong>{r.no2.toFixed(1)}</strong></span>
                          <span>Temp: <strong>{r.temp.toFixed(0)}°C</strong></span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-0.5">No readings available</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                    {r && (
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-semibold tabular-nums">{Math.round(r.aqi)}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">AQI</div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r && <Pill tone={aqiTone(r.aqi)}>{aqiLabel(r.aqi)}</Pill>}
                      <FreshnessBadge timestamp={r?.timestamp} />
                      <Pill tone={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Inactive"}</Pill>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CityDetailPanel city={selected} onOpenChange={o => !o && setSelected(null)} />
    </div>
  );
}
