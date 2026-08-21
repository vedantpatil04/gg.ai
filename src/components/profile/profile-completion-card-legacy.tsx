/**
 * Legacy standalone ProfileCompletionCard — kept for any future consumer
 * that needs a self-contained completion widget outside the hero.
 * The Phase 10 layout embeds completion in the hero and recommendations
 * in the overview; this file is not rendered in the default profile page.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui-bits";
import { profileApi, type CompletionStatus } from "@/lib/api/profile.api";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CircularProgress({ value, status }: { value: number; status: CompletionStatus }) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color =
    status === "complete"
      ? "var(--color-success)"
      : status === "nearly_complete"
        ? "var(--color-primary)"
        : status === "good_progress"
          ? "var(--color-warning)"
          : "var(--color-destructive)";
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-24 sm:size-28 shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-muted/40"
      />
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s ease",
        }}
      />
    </svg>
  );
}

export function ProfileCompletionCardLegacy({ userId }: { userId?: string } = {}) {
  const { user } = useAuth();
  const targetId = userId ?? user?._id;
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["profile", "completion", targetId],
    queryFn: () => profileApi.getCompletion(),
    enabled: !!targetId,
    retry: 1,
  });
  const c = data?.data;

  return (
    <Panel
      eyebrow="Account quality"
      title={<h3 className="text-base font-semibold tracking-tight">Profile completion</h3>}
    >
      {isLoading ? (
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-4">
            <Skeleton className="size-24 rounded-full shrink-0 shimmer" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16 shimmer" />
              <Skeleton className="h-6 w-28 shimmer" />
              <Skeleton className="h-3.5 w-36 shimmer" />
            </div>
          </div>
        </div>
      ) : isError || !c ? (
        <div className="flex flex-col items-center text-center gap-3 py-5">
          <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4 py-1" aria-live="polite">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <CircularProgress value={c.completion} status={c.status} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-xl font-semibold tabular-nums"
                  aria-label={`${c.completion}% complete`}
                >
                  {c.completion}%
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{c.statusLabel}</p>
              <p className="text-xs text-muted-foreground">
                {c.completedCount} of {c.totalFields} fields
              </p>
              {c.missingFields.length === 0 && (
                <p
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: "var(--color-success)" }}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" /> All complete
                </p>
              )}
            </div>
          </div>
          {c.suggestedActions.length > 0 && (
            <ul className="space-y-1 border-t border-border/60 pt-3" role="list">
              {c.suggestedActions.map((action, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs bg-muted/30 hover:bg-muted/60 transition-colors duration-150 cursor-default"
                >
                  <span className="text-foreground/80">{action}</span>
                  <ChevronRight
                    className="size-3 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
