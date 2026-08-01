/**
 * Phase 8 — Shared error state components
 *
 * Consistent error handling across the platform:
 *  - Network/API failures with retry
 *  - Authentication failures
 *  - Authorization failures (403)
 *  - Generic section errors
 */

import { AlertTriangle, RefreshCw, ShieldOff, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Base error state ─────────────────────────────────────────────────────────

interface ErrorStateBaseProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function ErrorStateBase({
  icon: Icon = AlertTriangle,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className,
  compact = false,
}: ErrorStateBaseProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-2" : "py-14 gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-destructive/10 grid place-items-center text-destructive",
          compact ? "size-10" : "size-14",
        )}
      >
        <Icon className={compact ? "size-4" : "size-6"} />
      </div>
      <div className="space-y-1 max-w-[260px]">
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>{title}</p>
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 mt-1">
          <RefreshCw className="size-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// ─── Network error ────────────────────────────────────────────────────────────

export function NetworkError({
  onRetry,
  compact,
}: {
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <ErrorStateBase
      icon={WifiOff}
      title="Connection error"
      description="Unable to reach the server. Check your connection and try again."
      onRetry={onRetry}
      compact={compact}
    />
  );
}

// ─── Server error ─────────────────────────────────────────────────────────────

export function ServerError({
  onRetry,
  compact,
}: {
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <ErrorStateBase
      icon={ServerCrash}
      title="Something went wrong"
      description="The server returned an error. This is usually temporary — please try again."
      onRetry={onRetry}
      compact={compact}
    />
  );
}

// ─── Authorization error ──────────────────────────────────────────────────────

export function AuthorizationError({ compact }: { compact?: boolean }) {
  return (
    <ErrorStateBase
      icon={ShieldOff}
      title="Access denied"
      description="You don't have permission to view this content."
      compact={compact}
    />
  );
}

// ─── Generic query error ──────────────────────────────────────────────────────

export function QueryError({
  message,
  onRetry,
  compact,
}: {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <ErrorStateBase
      title="Failed to load"
      description={message ?? "Something went wrong loading this data. Please try refreshing."}
      onRetry={onRetry}
      compact={compact}
    />
  );
}

// ─── Inline error banner ──────────────────────────────────────────────────────

export function ErrorBanner({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="size-4 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="shrink-0 h-7 px-2">
          <RefreshCw className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
