import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui-bits";
import { profileApi, type CompletionStatus } from "@/lib/api/profile.api";

// ─── Circular progress ring ────────────────────────────────────────────────

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * SVG-based circular progress indicator.  Drawn with a background track
 * and a foreground arc whose stroke-dashoffset encodes the percentage.
 * Colour follows the completion status so the ring reads as green at 100%,
 * amber in the middle, and red/muted at low percentages.
 */
function CircularProgress({ value, status }: { value: number; status: CompletionStatus }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = RING_CIRCUMFERENCE * (1 - clampedValue / 100);

  const arcColor =
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
      {/* Track */}
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-muted/40"
      />
      {/* Progress arc */}
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke={arcColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
      />
    </svg>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: CompletionStatus; label: string }) {
  const styles: Record<CompletionStatus, { color: string; bg: string }> = {
    complete: {
      color: "var(--color-success)",
      bg: "color-mix(in oklab, var(--color-success) 12%, transparent)",
    },
    nearly_complete: {
      color: "var(--color-primary)",
      bg: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
    },
    good_progress: {
      color: "var(--color-warning)",
      bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)",
    },
    needs_attention: {
      color: "var(--color-destructive)",
      bg: "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
    },
  };
  const safeStatus = status in styles ? status : "needs_attention";

  const { color, bg } = styles[safeStatus];

  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

// ─── Skeleton state ────────────────────────────────────────────────────────

function CompletionSkeleton() {
  return (
    <div className="space-y-4 py-1">
      {/* Ring + percentage row */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-24 sm:size-28 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      </div>
      {/* Action list */}
      <div className="space-y-2 pt-1 border-t border-border/60">
        <Skeleton className="h-3.5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────────────

function CompletionError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-5">
      <div className="size-10 rounded-full bg-destructive/10 grid place-items-center text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium">Couldn't load completion data</p>
        <p className="text-xs text-muted-foreground mt-0.5">Check your connection and try again.</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="gap-1.5"
      >
        <RefreshCw className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

// ─── Main card ─────────────────────────────────────────────────────────────

export function ProfileCompletionCard({ userId }: { userId?: string } = {}) {
  const { user } = useAuth();
  const targetId = userId ?? user?._id;
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["profile", "completion", targetId],
    queryFn: () => profileApi.getCompletion(),
    enabled: !!targetId,
    retry: 1,
  });

  const completion = data?.data;

  return (
    <Panel
      eyebrow="Account quality"
      title={<h3 className="text-base font-semibold tracking-tight">Profile completion</h3>}
    >
      {isLoading ? (
        <CompletionSkeleton />
      ) : isError || !completion ? (
        <CompletionError onRetry={() => refetch()} isRetrying={isFetching} />
      ) : (
        <div className="space-y-4 py-1" aria-live="polite">
          {/* ── Ring + summary ─────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            {/* Circular ring with percentage label inside */}
            <div className="relative shrink-0">
              <CircularProgress value={completion.completion} status={completion.status} />
              {/* Centred percentage label — rotate back from the SVG's -90° */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rotate-0"
                aria-label={`${completion.completion} percent profile complete`}
              >
                <span className="text-xl sm:text-2xl font-semibold tabular-nums leading-none">
                  {completion.completion}%
                </span>
              </div>
            </div>

            {/* Status + counts */}
            <div className="min-w-0 space-y-1.5">
              <StatusBadge status={completion.status} label={completion.statusLabel} />
              <p className="text-sm text-muted-foreground leading-snug">
                {completion.completedCount} of {completion.totalFields} fields complete
              </p>
              {completion.missingFields.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-success)] font-medium">
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                  Your profile is fully complete
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {completion.missingFields.length} field
                  {completion.missingFields.length === 1 ? "" : "s"} remaining
                </p>
              )}
            </div>
          </div>

          {/* ── Suggested actions ──────────────────────────────────────── */}
          {(completion.suggestedActions?.length ?? 0) > 0 && (
            <div className="border-t border-border/60 pt-3 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Recommended
              </p>
              <ul className="space-y-1" role="list">
                {(completion.suggestedActions ?? []).map((action, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-foreground/80">{action}</span>
                    <ChevronRight
                      className="size-3 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
