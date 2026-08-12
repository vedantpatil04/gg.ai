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
import { useTranslation } from "react-i18next";
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
  retryLabel,
  className,
  compact = false,
}: ErrorStateBaseProps) {
  const { t } = useTranslation("common");
  const resolvedRetryLabel = retryLabel ?? t("retry");
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
          {resolvedRetryLabel}
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
  const { t } = useTranslation("errors");
  return (
    <ErrorStateBase
      icon={WifiOff}
      title={t("states.network.title")}
      description={t("states.network.description")}
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
  const { t } = useTranslation("errors");
  return (
    <ErrorStateBase
      icon={ServerCrash}
      title={t("states.server.title")}
      description={t("states.server.description")}
      onRetry={onRetry}
      compact={compact}
    />
  );
}

// ─── Authorization error ──────────────────────────────────────────────────────

export function AuthorizationError({ compact }: { compact?: boolean }) {
  const { t } = useTranslation("errors");
  return (
    <ErrorStateBase
      icon={ShieldOff}
      title={t("states.forbidden.title")}
      description={t("states.forbidden.description")}
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
  const { t } = useTranslation("errors");
  return (
    <ErrorStateBase
      title={t("states.loadFailed.title")}
      description={message ?? t("states.loadFailed.description")}
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
