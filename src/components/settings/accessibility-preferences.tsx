import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accessibility as AccessibilityIcon,
  AlertTriangle,
  Contrast,
  Waves,
  Type,
  Keyboard,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  accessibilityApi,
  type AccessibilityPreferences,
} from "@/lib/api/accessibility.api";

// ─── Option metadata — only the four functional options ──────────────────────
interface OptionMeta {
  field: keyof AccessibilityPreferences;
  label: string;
  description: string;
  icon: typeof Contrast;
}

const OPTIONS: OptionMeta[] = [
  {
    field: "highContrast",
    label: "High Contrast",
    description:
      "Boosts color contrast throughout the interface for easier reading.",
    icon: Contrast,
  },
  {
    field: "largeText",
    label: "Large Text",
    description: "Increases base text size for improved readability.",
    icon: Type,
  },
  {
    field: "reduceMotion",
    label: "Reduce Motion",
    description:
      "Minimizes animations and transitions across GreenGuard AI.",
    icon: Waves,
  },
  {
    field: "keyboardNavigation",
    label: "Keyboard Navigation",
    description:
      "Enables enhanced keyboard shortcuts and tab order throughout the app.",
    icon: Keyboard,
  },
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
export function AccessibilityPreferencesPanel() {
  const qc = useQueryClient();

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["accessibility-preferences"],
    queryFn: () =>
      accessibilityApi.get().then((r) => r.data.accessibility),
    staleTime: 15_000,
    throwOnError: false,
  });

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
      toast.success("Accessibility preferences updated");
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["accessibility-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your accessibility preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const setField = (
    field: keyof AccessibilityPreferences,
    value: boolean,
  ) => {
    mutation.mutate({ [field]: value });
  };

  // This panel respects its own Reduce Motion toggle live — animations on
  // this page adapt instantly as a live demonstration of the setting.
  const reduceMotion = prefs?.reduceMotion ?? false;
  const fadeUp = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <Panel
      eyebrow="Accessibility"
      title={
        <span className="inline-flex items-center gap-2">
          <AccessibilityIcon className="size-4 text-primary" />
          Accessibility
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-5">
        Make GreenGuard AI easier to use for everyone.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your accessibility preferences."
          onRetry={refetch}
        />
      ) : isLoading || !prefs ? (
        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Live accessibility preview */}
          <motion.div
            {...fadeUp}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-6 transition-colors duration-300",
              prefs.highContrast
                ? "border-foreground bg-background text-foreground"
                : "border-border glass",
            )}
          >
            {!prefs.highContrast && (
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent"
                aria-hidden="true"
              />
            )}
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Preview
              </div>
              <h3
                className={cn(
                  "font-semibold tracking-tight transition-all duration-300",
                  prefs.largeText ? "text-3xl" : "text-xl",
                  prefs.highContrast && "text-foreground",
                )}
              >
                Aa Sample Heading
              </h3>
              <p
                className={cn(
                  "text-muted-foreground mt-2 max-w-md transition-all duration-300",
                  prefs.largeText ? "text-base leading-relaxed" : "text-sm",
                  prefs.highContrast && "text-foreground/90",
                )}
              >
                This preview updates as you change your accessibility settings.
              </p>
              <button
                type="button"
                className={cn(
                  "mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  prefs.largeText ? "text-base" : "text-sm",
                  prefs.highContrast
                    ? "bg-foreground text-background hover:opacity-90"
                    : "aurora text-primary-foreground hover:opacity-90",
                )}
              >
                Example Button
              </button>
            </div>
          </motion.div>

          {/* Accessibility options */}
          <div className="grid sm:grid-cols-2 gap-3">
            {OPTIONS.map((opt, i) => {
              const checked = prefs[opt.field];
              return (
                <motion.label
                  key={opt.field}
                  {...fadeUp}
                  transition={{
                    ...fadeUp.transition,
                    delay: reduceMotion ? 0 : i * 0.04,
                  }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
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
                </motion.label>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>Saving…</>}
      </div>
    </Panel>
  );
}
