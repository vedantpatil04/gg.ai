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
  Loader2,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  notificationApi,
  type NotificationCategory,
  type NotificationChannels,
  type NotificationPreferences,
} from "@/lib/api/notification.api";

// ─── Category display metadata ────────────────────────────────────────────────
// Only the six functional categories are shown; forecast and admin are omitted
// since they are handled server-side and don't benefit from per-user toggles.
const CATEGORY_META: Record<
  string,
  { label: string; description: string; icon: typeof Bell }
> = {
  environment: {
    label: "Environmental Alerts",
    description: "AQI, water pollution, and noise pollution alerts.",
    icon: Cloud,
  },
  complaints: {
    label: "Complaint Updates",
    description: "Submitted, assigned, resolved, or rejected complaints.",
    icon: MessageSquareWarning,
  },
  reports: {
    label: "Report Updates",
    description: "Environmental reports generated or ready for export.",
    icon: FileBarChart,
  },
  authority: {
    label: "Authority Updates",
    description: "Authority responses, inspections, and enforcement actions.",
    icon: ShieldCheck,
  },
  system: {
    label: "System Notifications",
    description: "Application updates and maintenance.",
    icon: Bell,
  },
  security: {
    label: "Security Alerts",
    description: "Password changes, new logins, and new devices.",
    icon: ShieldAlert,
  },
};

// Ordered display list — subset of NotificationCategory
const DISPLAY_CATEGORIES: NotificationCategory[] = [
  "environment",
  "complaints",
  "reports",
  "authority",
  "system",
  "security",
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

  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationApi.getSettingsPreferences(),
    staleTime: 15_000,
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
      toast.success("Notification preferences updated");
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["notification-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your notification preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
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
      eyebrow="Notifications"
      title={
        <span className="inline-flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          Notification Preferences
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Manage how GreenGuard AI communicates with you.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your notification preferences."
          onRetry={refetch}
        />
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
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg glass grid place-items-center shrink-0">
                    <meta.icon
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {meta.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {meta.description}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {/* In-App */}
                  <label className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Bell
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      In-App
                    </span>
                    <Switch
                      checked={value.inApp}
                      onCheckedChange={(checked) =>
                        setChannel(category, "inApp", checked)
                      }
                      aria-label={`${meta.label} — In-App notifications`}
                    />
                  </label>

                  {/* Email */}
                  <label className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Mail
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      Email
                    </span>
                    <Switch
                      checked={value.email}
                      onCheckedChange={(checked) =>
                        setChannel(category, "email", checked)
                      }
                      aria-label={`${meta.label} — Email notifications`}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Saving…
          </>
        )}
      </div>
    </Panel>
  );
}
