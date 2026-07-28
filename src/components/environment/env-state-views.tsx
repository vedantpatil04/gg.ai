import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — reusable empty & error states.
 *
 * Phase 11 polish:
 *   - Retry now uses the project's `Button` primitive for consistent focus
 *     ring, hover state, disabled styling, and accessible label.
 *   - `EnvEmptyState` uses `role="status"` and `aria-live="polite"` so
 *     screen readers are notified when a section transitions to empty.
 *   - `EnvErrorState` uses `role="alert"` and `aria-live="assertive"` for
 *     errors that need immediate attention.
 *   - Both states get a subtle entrance animation (motion-safe).
 */

export function EnvEmptyState({
  className,
  title = "No environmental data available.",
  description = "This section will display live data once connected.",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "glass rounded-2xl p-8 flex flex-col items-center text-center gap-3",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
        className,
      )}
    >
      <div className="size-12 rounded-xl grid place-items-center bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
    </div>
  );
}

export function EnvErrorState({
  className,
  onRetry,
  retryDisabled = true,
  message = "Unable to load environmental data.",
}: {
  className?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  message?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "glass rounded-2xl p-8 flex flex-col items-center text-center gap-4",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
        className,
      )}
    >
      <div className="size-12 rounded-xl grid place-items-center bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retryDisabled}
          aria-label="Retry loading environmental data"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
