import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, AlertTriangle, BarChart3, Sparkles, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { privacyApi, type PrivacyPreferences } from "@/lib/api/privacy.api";

// ─── Privacy controls metadata ────────────────────────────────────────────────
const CONTROLS: {
  field: keyof PrivacyPreferences;
  label: string;
  description: string;
  icon: typeof BarChart3;
}[] = [
  {
    field: "anonymousAnalytics",
    label: "Share Anonymous Usage Analytics",
    description:
      "Help improve GreenGuard AI by anonymously sharing usage statistics. No personally identifiable information is collected.",
    icon: BarChart3,
  },
  {
    field: "personalizedRecommendations",
    label: "Personalized Recommendations",
    description:
      "Enable AI-powered suggestions — dashboard insights, smart shortcuts, and widget recommendations.",
    icon: Sparkles,
  },
];

// Only what's genuinely safe to wipe client-side: locally cached UI
// preferences, never auth tokens (gg_access_token / gg_refresh_token) —
// clearing those would log the user out, which this action must not do.
const LOCAL_CACHE_KEYS = ["gg-theme", "gg-city"];
const LOCAL_CACHE_PREFIXES = ["greenguard.map.recentSearches."];

function clearLocalCache() {
  for (const key of LOCAL_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable — non-fatal */
    }
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (LOCAL_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
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
export function PrivacyPreferencesPanel() {
  const qc = useQueryClient();

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["privacy-preferences"],
    queryFn: () => privacyApi.get().then((r) => r.data.privacy),
    staleTime: 15_000,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<PrivacyPreferences>) =>
      privacyApi.update(patch).then((r) => r.data.privacy),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["privacy-preferences"] });
      const previous = qc.getQueryData<PrivacyPreferences>([
        "privacy-preferences",
      ]);
      if (previous)
        qc.setQueryData(["privacy-preferences"], { ...previous, ...patch });
      return { previous };
    },
    onSuccess: (updated) => {
      qc.setQueryData(["privacy-preferences"], updated);
      toast.success("Privacy preferences updated");
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["privacy-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your privacy preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setField = (field: keyof PrivacyPreferences, value: boolean) => {
    mutation.mutate({ [field]: value });
  };

  const handleClearCache = () => {
    clearLocalCache();
    toast.success("Local cache cleared");
  };

  return (
    <Panel
      eyebrow="Privacy"
      title={
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          Privacy
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Control what data GreenGuard AI collects and uses on your behalf.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your privacy preferences."
          onRetry={refetch}
        />
      ) : isLoading || !prefs ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {CONTROLS.map((c) => (
            <label
              key={c.field}
              className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-colors"
            >
              <div className="size-9 rounded-lg glass grid place-items-center shrink-0 text-primary">
                <c.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {c.description}
                </div>
              </div>
              <Switch
                checked={prefs[c.field]}
                onCheckedChange={(v) => setField(c.field, v)}
                aria-label={c.label}
                className="mt-0.5 shrink-0"
              />
            </label>
          ))}
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>Saving…</>}
      </div>

      {/* Local cache */}
      <div className="mt-2 pt-4 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Local Storage
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Clear Local Cache
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear local cache?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes locally stored preferences and cached application
                data from this device. You will not be logged out.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCache}>
                Clear Cache
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Panel>
  );
}
