import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Check,
  ChevronsUpDown,
  Pin,
  RotateCcw,
} from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import {
  dashboardApi,
  LANDING_PAGES,
  DASHBOARD_WIDGETS,
  PINNABLE_CARDS,
  type DashboardPreferences,
  type WidgetId,
  type PinnableCardId,
} from "@/lib/api/dashboard.api";

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
export function DashboardPreferencesPanel() {
  const qc = useQueryClient();
  const { cities } = useCity();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const {
    data: prefs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-preferences"],
    queryFn: () => dashboardApi.get().then((r) => r.data.dashboard),
    staleTime: 15_000,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<DashboardPreferences>) =>
      dashboardApi.update(patch).then((r) => r.data.dashboard),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["dashboard-preferences"] });
      const previous = qc.getQueryData<DashboardPreferences>([
        "dashboard-preferences",
      ]);
      if (previous)
        qc.setQueryData(["dashboard-preferences"], { ...previous, ...patch });
      return { previous };
    },
    onSuccess: (updated) => {
      qc.setQueryData(["dashboard-preferences"], updated);
      toast.success("Dashboard preferences updated");
    },
    onError: (err: unknown, patch, context) => {
      if (context?.previous)
        qc.setQueryData(["dashboard-preferences"], context.previous);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Couldn't save your dashboard preferences.";
      toast.error("Couldn't save", {
        description: message,
        action: { label: "Retry", onClick: () => mutation.mutate(patch) },
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () =>
      dashboardApi.restore().then((r) => r.data.dashboard),
    onSuccess: (defaults) => {
      qc.setQueryData(["dashboard-preferences"], defaults);
      toast.success("Dashboard preferences restored");
      setRestoreOpen(false);
    },
    onError: () => {
      toast.error("Couldn't restore defaults", {
        description: "Please try again.",
      });
    },
  });

  const setField = <K extends keyof DashboardPreferences>(
    field: K,
    value: DashboardPreferences[K],
  ) => {
    mutation.mutate({ [field]: value } as Partial<DashboardPreferences>);
  };

  const toggleWidget = (id: WidgetId) => {
    if (!prefs) return;
    const visible = prefs.visibleWidgets.includes(id)
      ? prefs.visibleWidgets.filter((w) => w !== id)
      : [...prefs.visibleWidgets, id];
    setField("visibleWidgets", visible);
  };

  const togglePinned = (id: PinnableCardId) => {
    if (!prefs) return;
    const pinned = prefs.pinnedCards.includes(id)
      ? prefs.pinnedCards.filter((c) => c !== id)
      : [...prefs.pinnedCards, id];
    setField("pinnedCards", pinned);
  };

  const selectedCity = cities.find((c) => c.id === prefs?.defaultCity);

  return (
    <Panel
      eyebrow="Dashboard"
      title={
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard className="size-4 text-primary" />
          Dashboard Preferences
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Customize your dashboard layout and defaults.
      </p>

      {isError ? (
        <ErrorState
          text="Couldn't load your dashboard preferences."
          onRetry={refetch}
        />
      ) : isLoading || !prefs ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
          {/* Default Landing Page */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Default Landing Page
            </div>
            <Select
              value={prefs.defaultLandingPage}
              onValueChange={(v) =>
                setField(
                  "defaultLandingPage",
                  v as DashboardPreferences["defaultLandingPage"],
                )
              }
            >
              <SelectTrigger aria-label="Default Landing Page">
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                {LANDING_PAGES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default City */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Default City
            </div>
            <Popover open={cityPickerOpen} onOpenChange={setCityPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={cityPickerOpen}
                  aria-label="Default City"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {selectedCity
                    ? `${selectedCity.name}${selectedCity.country ? `, ${selectedCity.country}` : ""}`
                    : "Select a city"}
                  <ChevronsUpDown
                    className="size-4 opacity-50"
                    aria-hidden="true"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search cities…" />
                  <CommandList>
                    <CommandEmpty>No city found.</CommandEmpty>
                    <CommandGroup>
                      {cities.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.country ?? ""}`}
                          onSelect={() => {
                            setField("defaultCity", c.id);
                            setCityPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              prefs.defaultCity === c.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                            aria-hidden="true"
                          />
                          {c.name}
                          {c.country ? `, ${c.country}` : ""}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Widget Visibility */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Widget Visibility
            </div>
            <div className="space-y-1">
              {DASHBOARD_WIDGETS.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={prefs.visibleWidgets.includes(w.id)}
                    onCheckedChange={() => toggleWidget(w.id)}
                    aria-label={`Show ${w.label} widget`}
                  />
                  {w.label}
                </label>
              ))}
            </div>
          </div>

          {/* Pinned Cards */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Pin className="size-3.5" />
              Pinned Cards
            </div>
            <div className="space-y-1">
              {PINNABLE_CARDS.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={prefs.pinnedCards.includes(c.id)}
                    onCheckedChange={() => togglePinned(c.id)}
                    aria-label={`Pin ${c.label}`}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {mutation.isPending && <>Saving…</>}
      </div>

      {/* Restore Defaults */}
      {prefs && (
        <div className="mt-2 pt-4 border-t border-border">
          <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Restore Defaults
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Restore dashboard preferences?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset widget visibility, default landing page,
                  default city, and pinned cards to their default values.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                >
                  {restoreMutation.isPending && (
                    <CheckCircle className="size-3.5 mr-1.5 animate-pulse" />
                  )}
                  Restore
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Panel>
  );
}
