import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

// i18n: importing the module here ensures initialization has run.
// `i18n.changeLanguage()` is called on successful save so the active locale
// switches immediately without a page reload.
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

// ─── Option metadata ──────────────────────────────────────────────────────────

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormat; labelKey: string }[] = [
  { value: "24h", labelKey: "language.hour24" },
  { value: "12h", labelKey: "language.hour12" },
];

const NUMBER_FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
];

const UNIT_OPTIONS: { value: MeasurementUnit; labelKey: string; desc: string }[] = [
  { value: "metric",   labelKey: "language.metric",   desc: "°C · km · μg/m³ · mm" },
  { value: "imperial", labelKey: "language.imperial", desc: "°F · mi · inches" },
];

function getTimezoneGroups(otherLabel: string): Record<string, string[]> {
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
    const region = zone.includes("/") ? zone.split("/")[0] : otherLabel;
    (groups[region] ??= []).push(zone);
  }
  return groups;
}

// ─── Shared error state ───────────────────────────────────────────────────────
function ErrorState({
  text,
  onRetry,
}: {
  text?: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-8 text-center"
      role="alert"
    >
      <div className="size-10 rounded-full bg-destructive/10 grid place-items-center">
        <AlertTriangle className="size-4 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground">{text ?? t("language.couldntLoad")}</p>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1"
      >
        {t("language.tryAgain")}
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function LanguageRegionPanel() {
  const qc = useQueryClient();
  const { t } = useTranslation("settings");
  const timezoneGroups = useMemo(
    () => getTimezoneGroups(t("language.otherTimezoneRegion")),
    [t],
  );

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["language-region-preferences"],
    // languageRegionApi.get() resolves to:
    //   { success: boolean; data: { languageRegion: LanguageRegionPreferences } }
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
      toast.success(t("language.updated"));

      // ── i18n integration ────────────────────────────────────────────────────
      // Apply the new language to i18next immediately so the entire app
      // switches locale without a page reload.  The i18n module's
      // `languageChanged` listener automatically persists the change to
      // localStorage and updates <html lang>.
      if (patch.language && SUPPORTED_LANGUAGES.includes(patch.language)) {
        void i18n.changeLanguage(patch.language);
      }
    },

    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["language-region-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t("language.couldntSave");
      toast.error(t("language.couldntSaveTitle"), {
        description: message,
        action: { label: t("language.retry"), onClick: () => mutation.mutate(patch) },
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
      eyebrow={t("language.title")}
      title={
        <span className="inline-flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          {t("language.title")}
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        {t("language.description")}
      </p>

      {isError ? (
        <ErrorState
          text={t("language.couldntLoad")}
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
              {t("language.language")}
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={t("language.language")}
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
                    onClick={() => setField("language", code as Language)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {/* Native script — lets the user recognise their language
                        before selecting it, even if the UI hasn't switched yet */}
                    <span>{meta.native}</span>
                    {/* English label for discoverability */}
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
          </div>

          {/* ── Timezone ── */}
          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-2 block"
              id="tz-label"
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                {t("language.timezone")}
              </span>
            </label>
            <Select
              value={prefs.timezone}
              onValueChange={(v) => setField("timezone", v)}
            >
              <SelectTrigger aria-labelledby="tz-label">
                <SelectValue placeholder={t("language.selectTimezone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_TIMEZONE}>
                  {t("language.timezoneAuto")}
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
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {t("language.dateFormat")}
            </div>
            <RadioGroup
              value={prefs.dateFormat}
              onValueChange={(v) => setField("dateFormat", v as DateFormat)}
              aria-label={t("language.dateFormat")}
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem value={opt.value} id={`date-${opt.value}`} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Time Format ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {t("language.timeFormat")}
            </div>
            <RadioGroup
              value={prefs.timeFormat}
              onValueChange={(v) => setField("timeFormat", v as TimeFormat)}
              aria-label={t("language.timeFormat")}
            >
              {TIME_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem value={opt.value} id={`time-${opt.value}`} />
                  {t(opt.labelKey)}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Number Format ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Hash className="size-3.5" aria-hidden="true" />
              {t("language.numberFormat")}
            </div>
            <RadioGroup
              value={prefs.numberFormat}
              onValueChange={(v) =>
                setField("numberFormat", v as NumberFormat)
              }
              aria-label={t("language.numberFormat")}
            >
              {NUMBER_FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <RadioGroupItem value={opt.value} id={`num-${opt.value}`} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* ── Measurement Units ── */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Ruler className="size-3.5" aria-hidden="true" />
              {t("language.measurementUnits")}
            </div>
            <RadioGroup
              value={prefs.measurementUnit}
              onValueChange={(v) =>
                setField("measurementUnit", v as MeasurementUnit)
              }
              aria-label={t("language.measurementUnits")}
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
                    {t(opt.labelKey)}{" "}
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

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>{t("saving", { ns: "common" })}</>}
      </div>
    </Panel>
  );
}
