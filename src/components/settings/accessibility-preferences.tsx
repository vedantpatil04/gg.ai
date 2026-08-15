import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accessibility as AccessibilityIcon,
  AlertTriangle,
  Contrast,
  Waves,
  Type,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/lib/accessibility";
import {
  accessibilityApi,
  type AccessibilityPreferences,
} from "@/lib/api/accessibility.api";

// ─── Option metadata — only fields with a real, global effect are shown.
// Keyboard accessibility isn't a toggle here: it's built into the app itself
// (semantic controls, visible focus states, Radix-based components), so
// there's nothing for a switch to genuinely turn on or off. ─────────────────
type OptionField = "highContrast" | "largeText" | "reduceMotion";

interface OptionMeta {
  field: OptionField;
  label: string;
  description: string;
  icon: typeof Contrast;
}

// ─── Shared error state ───────────────────────────────────────────────────────
function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  const { t } = useTranslation("common");
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
        {t("retry")}
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function AccessibilityPreferencesPanel() {
  const qc = useQueryClient();
  const { t } = useTranslation("settings");
  const { t: tErrors } = useTranslation("errors");
  const { setSettings: setGlobalAccessibility } = useAccessibility();

  const OPTIONS: OptionMeta[] = useMemo(
    () => [
      {
        field: "highContrast",
        label: t("accessibility.highContrast"),
        description: t("accessibility.highContrastDesc"),
        icon: Contrast,
      },
      {
        field: "largeText",
        label: t("accessibility.largeText"),
        description: t("accessibility.largeTextDesc"),
        icon: Type,
      },
      {
        field: "reduceMotion",
        label: t("accessibility.reduceMotion"),
        description: t("accessibility.reduceMotionDesc"),
        icon: Waves,
      },
    ],
    [t],
  );

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["accessibility-preferences"],
    queryFn: () => accessibilityApi.get().then((r) => r.data.accessibility),
    staleTime: 15_000,
    throwOnError: false,
  });

  // This is what makes the preferences real: the moment the authenticated
  // value loads (or changes), it's pushed into the app-wide provider that
  // applies high-contrast/large-text/reduce-motion classes to <html> —
  // everywhere, not just this page.
  useEffect(() => {
    if (!prefs) return;
    setGlobalAccessibility({
      highContrast: prefs.highContrast,
      largeText: prefs.largeText,
      reduceMotion: prefs.reduceMotion,
    });
  }, [prefs, setGlobalAccessibility]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<AccessibilityPreferences>) =>
      accessibilityApi.update(patch).then((r) => r.data.accessibility),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["accessibility-preferences"] });
      const previous = qc.getQueryData<AccessibilityPreferences>([
        "accessibility-preferences",
      ]);
      if (previous)
        qc.setQueryData(["accessibility-preferences"], {
          ...previous,
          ...patch,
        });
      return { previous };
    },
    onSuccess: (updated) => {
      qc.setQueryData(["accessibility-preferences"], updated);
      toast.success(t("accessibility.updated"));
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["accessibility-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? tErrors("saveFailed");
      toast.error(message, {
        action: { label: t("retry", { ns: "common" }), onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setField = (field: OptionField, value: boolean) => {
    mutation.mutate({ [field]: value });
  };

  return (
    <Panel
      eyebrow={t("accessibility.title")}
      title={
        <span className="inline-flex items-center gap-2">
          <AccessibilityIcon className="size-4 text-primary" />
          {t("accessibility.title")}
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-5">
        {t("accessibility.description")}
      </p>

      {isError ? (
        <ErrorState text={tErrors("loadFailed")} onRetry={refetch} />
      ) : isLoading || !prefs ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const checked = prefs[opt.field];
            return (
              <label
                key={opt.field}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors duration-200",
                  checked
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div
                  className={cn(
                    "size-9 rounded-lg grid place-items-center shrink-0 transition-colors duration-200",
                    checked
                      ? "bg-primary/15 text-primary"
                      : "glass text-muted-foreground",
                  )}
                >
                  <opt.icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {opt.description}
                  </div>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(v) => setField(opt.field, v)}
                  aria-label={opt.label}
                  className="mt-0.5 shrink-0"
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>{t("saving", { ns: "common" })}</>}
      </div>
    </Panel>
  );
}
