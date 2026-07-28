import type { ComponentType } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Globe2,
  Thermometer,
  Droplets,
  Gauge,
  Leaf,
  AlertTriangle,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Pill } from "@/components/ui-bits";
import { aqiPill } from "./aqi-pill";
import {
  getMonitoringStatus,
  useCityActiveAlerts,
  useCityComplaintCount,
  type DirectoryCity,
} from "./city-directory-queries";

const MONITORING_PILL_TONE = { online: "success", warning: "warning", offline: "muted" } as const;
const MONITORING_LABEL = { online: "Online", warning: "Warning", offline: "Offline" } as const;

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

interface CityDetailPanelProps {
  city: DirectoryCity | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only per Phase 2.6 scope. "Assigned Authorities" is intentionally
 * absent — the User model has a `city` field, but nothing in the current
 * signup flow (src/routes/signup.tsx) ever collects or sets it, so a count
 * would show 0 for essentially every city. Showing that would look like
 * "no authorities assigned" when the real situation is "this isn't tracked
 * yet" — a meaningfully different (and misleading) claim, so it's left out
 * rather than displayed. See Notes/Assumptions for the fuller gap writeup.
 */
export function CityDetailPanel({ city, onOpenChange }: CityDetailPanelProps) {
  const alerts = useCityActiveAlerts(city?.cityId);
  const complaintCount = useCityComplaintCount(city?.cityId);

  return (
    <Sheet open={!!city} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {city &&
          (() => {
            const status = getMonitoringStatus(city.reading);
            const aqi = city.reading ? aqiPill(city.reading.aqi) : null;
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{city.name}</SheetTitle>
                  <SheetDescription>{city.country}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {aqi ? (
                      <Pill tone={aqi.tone}>{aqi.label}</Pill>
                    ) : (
                      <Pill tone="muted">No data</Pill>
                    )}
                    <Pill tone={MONITORING_PILL_TONE[status]}>{MONITORING_LABEL[status]}</Pill>
                    {!city.isActive && <Pill tone="muted">Inactive city record</Pill>}
                  </div>

                  <div className="space-y-4">
                    <Field
                      icon={MapPin}
                      label="Location"
                      value={`${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}`}
                    />
                    <Field icon={Globe2} label="Timezone" value={city.timezone || "Not set"} />

                    {city.reading ? (
                      <>
                        <Field
                          icon={Gauge}
                          label="Air Quality Index"
                          value={String(city.reading.aqi)}
                        />
                        <Field
                          icon={Thermometer}
                          label="Weather Summary"
                          value={`${city.reading.temp}°C · ${city.reading.humidity}% humidity${city.reading.windSpeed != null ? ` · wind ${city.reading.windSpeed} km/h` : ""}`}
                        />
                        <Field
                          icon={Droplets}
                          label="Environmental Summary"
                          value={`Water quality ${city.reading.water}/100 · Eco score ${city.reading.eco}/100 · Risk ${city.reading.risk}/100`}
                        />
                        <Field
                          icon={Leaf}
                          label="Carbon Index"
                          value={String(city.reading.carbon)}
                        />
                        <Field
                          icon={CalendarDays}
                          label="Last Updated"
                          value={`${format(new Date(city.reading.timestamp), "MMMM d, yyyy 'at' h:mm a")} (${formatDistanceToNow(new Date(city.reading.timestamp), { addSuffix: true })})`}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No environmental readings have been ingested for this city yet.
                      </p>
                    )}

                    <Field
                      icon={AlertTriangle}
                      label="Active Alerts"
                      value={
                        alerts.isLoading
                          ? "Loading…"
                          : alerts.isError
                            ? "Couldn't load"
                            : String(alerts.data?.length ?? 0)
                      }
                    />
                    <Field
                      icon={ClipboardList}
                      label="Complaints Logged"
                      value={
                        complaintCount.isLoading
                          ? "Loading…"
                          : complaintCount.isError
                            ? "Couldn't load"
                            : String(complaintCount.data ?? 0)
                      }
                    />
                  </div>

                  {alerts.data && alerts.data.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Alert Detail
                      </div>
                      <ul className="space-y-1.5">
                        {alerts.data.slice(0, 5).map((a) => (
                          <li key={a._id} className="text-sm flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                            {a.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
      </SheetContent>
    </Sheet>
  );
}
