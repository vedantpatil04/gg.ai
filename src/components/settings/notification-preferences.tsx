import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  MessageSquareWarning,
  FileBarChart,
  ShieldCheck,
  Cloud,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  notificationApi,
  type NotificationCategory,
  type NotificationChannels,
  type NotificationPreferences,
} from "@/lib/api/notification.api";

// Ordered display list — subset of NotificationCategory. Forecast and admin
// categories are handled server-side and don't benefit from per-user toggles,
// so they're intentionally omitted here.
const DISPLAY_CATEGORIES: NotificationCategory[] = [
  "environment",
  "complaints",
  "reports",
  "authority",
  "system",
  "security",
];

const CATEGORY_ICON: Record<string, typeof Bell> = {
  environment: Cloud,
  complaints: MessageSquareWarning,
  reports: FileBarChart,
  authority: ShieldCheck,
  system: Bell,
  security: ShieldAlert,
};

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

function CategorySkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function NotificationPreferencesPanel() {
  const qc = useQueryClient();
  const { t } = useTranslation("settings");
  const { t: tErrors } = useTranslation("errors");

  const CATEGORY_META: Record<
    NotificationCategory,
    { label: string; description: string; icon: typeof Bell }
  > = useMemo(
    () => ({
      environment: {
        label: t("notifications.categories.environment"),
        description: t("notifications.descriptions.environment"),
        icon: CATEGORY_ICON.environment,
      },
      complaints: {
        label: t("notifications.categories.complaints"),
        description: t("notifications.descriptions.complaints"),
        icon: CATEGORY_ICON.complaints,
      },
      reports: {
        label: t("notifications.categories.reports"),
        description: t("notifications.descriptions.reports"),
        icon: CATEGORY_ICON.reports,
      },
      authority: {
        label: t("notifications.categories.authority"),
        description: t("notifications.descriptions.authority"),
        icon: CATEGORY_ICON.authority,
      },
      system: {
        label: t("notifications.categories.system"),
        description: t("notifications.descriptions.system"),
        icon: CATEGORY_ICON.system,
      },
      security: {
        label: t("notifications.categories.security"),
        description: t("notifications.descriptions.security"),
        icon: CATEGORY_ICON.security,
      },
      // Categories that exist server-side but aren't shown in Settings
      // (see DISPLAY_CATEGORIES above) still need a fallback shape here so
      // the Record<NotificationCategory, ...> type stays fully satisfied.
      forecast: { label: "", description: "", icon: Bell },
      admin: { label: "", description: "", icon: Bell },
    }),
    [t],
  );

  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationApi.getSettingsPreferences(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (
      patch: Partial<Record<NotificationCategory, Partial<NotificationChannels>>>,
    ) => notificationApi.updateSettingsPreferences(patch),
    // Optimistic update: the switch flips immediately — network confirmation
    // happens quietly in the background.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = qc.getQueryData<NotificationPreferences>([
        "notification-preferences",
      ]);
      if (previous) {
        const optimistic = { ...previous };
        for (const [category, channels] of Object.entries(patch) as [
          NotificationCategory,
          Partial<NotificationChannels>,
        ][]) {
          optimistic[category] = { ...optimistic[category], ...channels };
        }
        qc.setQueryData(["notification-preferences"], optimistic);
      }
      return { previous };
    },
    onSuccess: (updated) => {
      qc.setQueryData(["notification-preferences"], updated);
      toast.success(t("notifications.updated"));
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["notification-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? tErrors("saveFailed");
      toast.error(message, {
        action: { label: t("retry", { ns: "common" }), onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setChannel = (
    category: NotificationCategory,
    channel: "inApp" | "email",
    value: boolean,
  ) => {
    mutation.mutate({ [category]: { [channel]: value } });
  };

  return (
    <Panel
      eyebrow={t("sections.notifications")}
      title={
        <span className="inline-flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          {t("notifications.title")}
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        {t("notifications.description")}
      </p>

      {isError ? (
        <ErrorState text={tErrors("loadFailed")} onRetry={refetch} />
      ) : isLoading || !preferences ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {DISPLAY_CATEGORIES.map((c) => (
            <CategorySkeleton key={c} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {DISPLAY_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const value = preferences[category];
            if (!meta || !value) return null;

            return (
              <div
                key={category}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-start gap-2.5">
                  <div className="size-8 rounded-lg glass grid place-items-center shrink-0">
                    <meta.icon
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {meta.description}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {/* In-App */}
                  <label className={cn("flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors", mutation.isPending ? "cursor-wait opacity-80" : "cursor-pointer")}>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Bell
                        className="size-3.5 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      {t("notifications.inApp")}
                    </span>
                    <Switch
                      checked={value.inApp}
                      disabled={mutation.isPending}
                      onCheckedChange={(checked) =>
                        setChannel(category, "inApp", checked)
                      }
                      aria-label={`${meta.label} — ${t("notifications.inApp")}`}
                      className="shrink-0"
                    />
                  </label>

                  {/* Email */}
                  <label className={cn("flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors", mutation.isPending ? "cursor-wait opacity-80" : "cursor-pointer")}>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Mail
                        className="size-3.5 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      {t("notifications.email")}
                    </span>
                    <Switch
                      checked={value.email}
                      disabled={mutation.isPending}
                      onCheckedChange={(checked) =>
                        setChannel(category, "email", checked)
                      }
                      aria-label={`${meta.label} — ${t("notifications.email")}`}
                      className="shrink-0"
                    />
                  </label>
                </div>
              </div>
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
