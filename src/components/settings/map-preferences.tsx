import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Map as MapIcon,
  AlertTriangle,
  CheckCircle,
  Car,
  Wind,
  CloudSun,
  History,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  mapPreferencesApi,
  MIN_ZOOM,
  MAX_ZOOM,
  type MapPreferences,
  type MapType,
  type MeasurementUnit,
} from "@/lib/api/maps.api";

// ─── Option metadata ──────────────────────────────────────────────────────────
const MAP_TYPE_OPTIONS: { value: MapType; emoji: string; label: string }[] = [
  { value: "street", emoji: "🗺️", label: "Street" },
  { value: "satellite", emoji: "🛰️", label: "Satellite" },
  { value: "terrain", emoji: "🏔️", label: "Terrain" },
];

const UNIT_OPTIONS: { value: MeasurementUnit; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

// ─── Shared error state ───────────────────────────────────────────────────────
function ErrorState({
  text = "Couldn't load this right now.",
  onRetry,
}: {
  text?: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-8 text-center"
      role="alert"
    >
      <div className="size-10 rounded-full bg-destructive/10 grid place-items-center">
        <AlertTriangle className="size-4 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function MapPreferencesPanel() {
  const qc = useQueryClient();

  // Local mirror for the zoom slider — only commits (auto-saves) on pointer
  // release so dragging doesn't fire a PATCH per pixel.
  const [zoomDraft, setZoomDraft] = useState<number | null>(null);

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["map-preferences"],
    queryFn: () => mapPreferencesApi.get().then((r) => r.data.maps),
    staleTime: 15_000,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<MapPreferences>) =>
      mapPreferencesApi.update(patch).then((r) => r.data.maps),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["map-preferences"] });
      const previous = qc.getQueryData<MapPreferences>(["map-preferences"]);
      if (previous)
        qc.setQueryData(["map-preferences"], { ...previous, ...patch });
      return { previous };
    },
    onSuccess: (updated) => {
      qc.setQueryData(["map-preferences"], updated);
      toast.success("Map preferences updated");
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["map-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your map preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setField = <K extends keyof MapPreferences>(
    field: K,
    value: MapPreferences[K],
  ) => {
    mutation.mutate({ [field]: value } as Partial<MapPreferences>);
  };

  const zoom = zoomDraft ?? prefs?.zoom ?? MIN_ZOOM;

  return (
    <Panel
      eyebrow="Maps"
      title={
        <span className="inline-flex items-center gap-2">
          <MapIcon className="size-4 text-primary" />
          Map Preferences
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Configure your default map display and layers.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your map preferences."
          onRetry={refetch}
        />
      ) : isLoading || !prefs ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
          {/* Map Type */}
          <div className="sm:col-span-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Map Type
            </div>
            <div
              className="grid grid-cols-3 gap-2.5"
              role="radiogroup"
              aria-label="Map Type"
            >
              {MAP_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.mapType === opt.value}
                  onClick={() => setField("mapType", opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    prefs.mapType === opt.value
                      ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="text-xl" aria-hidden="true">
                    {opt.emoji}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {opt.label}
                    {prefs.mapType === opt.value && (
                      <CheckCircle
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Zoom */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                Default Zoom
              </div>
              <span className="text-xs font-medium tabular-nums">
                Zoom: {zoom}
              </span>
            </div>
            <Slider
              value={[zoom]}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={1}
              onValueChange={([v]) => setZoomDraft(v)}
              onValueCommit={([v]) => {
                setZoomDraft(null);
                setField("zoom", v);
              }}
              aria-label="Default Zoom"
              aria-valuetext={`Zoom level ${zoom}`}
            />
          </div>

          {/* Layers */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Layers
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm">
                <Checkbox
                  checked={prefs.weatherLayer}
                  onCheckedChange={(c) => setField("weatherLayer", !!c)}
                  aria-label="Show Weather Layer"
                />
                <CloudSun
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                Weather
              </label>
              <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm">
                <Checkbox
                  checked={prefs.pollutionLayer}
                  onCheckedChange={(c) => setField("pollutionLayer", !!c)}
                  aria-label="Show Pollution Layer"
                />
                <Wind
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                Pollution
              </label>
              <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm">
                <Checkbox
                  checked={prefs.trafficLayer}
                  onCheckedChange={(c) => setField("trafficLayer", !!c)}
                  aria-label="Show Traffic Layer"
                />
                <Car
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                Traffic
              </label>
            </div>
          </div>

          {/* Measurement Units */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Measurement Units
            </div>
            <p className="text-xs text-muted-foreground -mt-1 mb-1.5">
              Affects map measurements only.
            </p>
            <RadioGroup
              value={prefs.measurementUnit}
              onValueChange={(v) =>
                setField("measurementUnit", v as MeasurementUnit)
              }
              aria-label="Measurement Units"
            >
              {UNIT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`map-unit-${opt.value}`}
                  />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Remember Last Position */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm w-fit">
              <Checkbox
                checked={prefs.rememberLastLocation}
                onCheckedChange={(c) =>
                  setField("rememberLastLocation", !!c)
                }
                aria-label="Remember Last Viewed Map Position"
              />
              <History
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Remember Last Map Position
            </label>
          </div>
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>Saving…</>}
      </div>
    </Panel>
  );
}
