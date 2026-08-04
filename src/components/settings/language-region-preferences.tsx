import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  CalendarDays,
  Hash,
  Ruler,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// i18n integration: the i18n module is initialized at import time
import { i18n } from "@/i18n";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "@/i18n/config";

import {
  languageRegionApi,
  AUTO_TIMEZONE,
  type LanguageRegionPreferences,
  type DateFormat,
  type TimeFormat,
  type NumberFormat,
  type MeasurementUnit,
  type Language,
} from "@/lib/api/language-region.api";

// ─── Static option metadata ───────────────────────────────────────────────────

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "24h", label: "24 Hour" },
  { value: "12h", label: "12 Hour" },
];

const NUMBER_FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
];

const UNIT_OPTIONS: {
  value: MeasurementUnit;
  label: string;
  desc: string;
}[] = [
  { value: "metric", label: "Metric", desc: "°C · km · μg/m³ · mm" },
  { value: "imperial", label: "Imperial", desc: "°F · mi · inches" },
];

function getTimezoneGroups(): Record<string, string[]> {
  let zones: string[];
  try {
    zones =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];
  } catch {
    zones = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];
  }
  const groups: Record<string, string[]> = {};
  for (const zone of zones) {
    const region = zone.includes("/") ? zone.split("/")[0] : "Other";
    (groups[region] ??= []).push(zone);
  }
  return groups;
}

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
export function LanguageRegionPanel() {
  const qc = useQueryClient();
  const timezoneGroups = useMemo(() => getTimezoneGroups(), []);

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["language-region-preferences"],
    queryFn: () =>
      languageRegionApi.get().then((r) => r.data.languageRegion),
    staleTime: 15_000,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<LanguageRegionPreferences>) =>
      languageRegionApi.update(patch).then((r) => r.data.languageRegion),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["language-region-preferences"] });
      const previous = qc.getQueryData<LanguageRegionPreferences>([
        "language-region-preferences",
      ]);
      if (previous)
        qc.setQueryData(["language-region-preferences"], {
          ...previous,
          ...patch,
        });
      return { previous };
    },
    onSuccess: (updated, patch) => {
      qc.setQueryData(["language-region-preferences"], updated);
      toast.success("Language & Region preferences updated");

      // ── i18n integration ────────────────────────────────────────────────
      // If the user changed their language, apply it to i18next immediately.
      // This updates the active locale for the entire app without a page
      // reload. The i18n module's `languageChanged` listener persists the
      // new value to localStorage automatically.
      if (patch.language && SUPPORTED_LANGUAGES.includes(patch.language)) {
        void i18n.changeLanguage(patch.language);
      }
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["language-region-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your language & region preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setField = <K extends keyof LanguageRegionPreferences>(
    field: K,
    value: LanguageRegionPreferences[K],
  ) => {
    mutation.mutate({ [field]: value } as Partial<LanguageRegionPreferences>);
  };

  return (
    <Panel
      eyebrow="Language & Region"
      title={
        <span className="inline-flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          Language & Region
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Customize regional preferences for GreenGuard AI.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your language & region preferences."
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
          {/* ── Language ── */}
          <div className="sm:col-span-2">
            <div className="text-xs font-medium text-muted-foreground mb-3">
              Language
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Language"
            >
              {SUPPORTED_LANGUAGES.map((code) => {
                const meta = LANGUAGE_NAMES[code as Language];
                const isActive = prefs.language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${meta.english} (${meta.native})`}
                    onClick={() =>
                      setField("language", code as Language)
                    }
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {/* Native name — confirms the user can read it before switching */}
                    <span className={cn(isActive ? "text-primary" : "")}>
                      {meta.native}
                    </span>
                    {/* English name alongside, for discoverability */}
                    {meta.native !== meta.english && (
                      <span className="text-muted-foreground text-xs">
                        {meta.english}
                      </span>
                    )}
                    {isActive && (
                      <CheckCircle
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Language-change feedback — only visible while saving */}
            {mutation.isPending && (
              <p className="mt-2 text-xs text-muted-foreground">
                Updating language…
              </p>
            )}
          </div>

          {/* ── Timezone ── */}
          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              id="timezone-label"
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Timezone
              </span>
            </label>
            <Select
              value={prefs.timezone}
              onValueChange={(v) => setField("timezone", v)}
            >
              <SelectTrigger aria-labelledby="timezone-label">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_TIMEZONE}>
                  Automatically detect
                </SelectItem>
                {Object.entries(timezoneGroups)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([region, zones]) => (
                    <SelectGroup key={region}>
                      <SelectLabel>{region}</SelectLabel>
                      {zones.sort().map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone
                            .split("/")
                            .slice(1)
                            .join("/")
                            .replace(/_/g, " ") || zone}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Date Format ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Date Format
            </div>
            <RadioGroup
              value={prefs.dateFormat}
              onValueChange={(v) => setField("dateFormat", v as DateFormat)}
              aria-label="Date Format"
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`date-${opt.value}`}
                  />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Time Format ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Time Format
            </div>
            <RadioGroup
              value={prefs.timeFormat}
              onValueChange={(v) => setField("timeFormat", v as TimeFormat)}
              aria-label="Time Format"
            >
              {TIME_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`time-${opt.value}`}
                  />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Number Format ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Hash className="size-3.5" />
              Number Format
            </div>
            <RadioGroup
              value={prefs.numberFormat}
              onValueChange={(v) =>
                setField("numberFormat", v as NumberFormat)
              }
              aria-label="Number Format"
            >
              {NUMBER_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`num-${opt.value}`}
                  />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Measurement Units ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Ruler className="size-3.5" />
              Measurement Units
            </div>
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
                    id={`unit-${opt.value}`}
                  />
                  <span>
                    {opt.label}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({opt.desc})
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>
      )}
    </Panel>
  );
}
