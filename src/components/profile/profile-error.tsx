import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileError({
  onRetry,
  isRetrying = false,
}: {
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="glass rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center gap-3 animate-in fade-in-0 duration-300"
    >
      <div className="size-12 rounded-2xl bg-destructive/10 grid place-items-center text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">We couldn't load your profile</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Something went wrong while fetching your account details. Check your connection and try
        again.
      </p>
      <Button onClick={onRetry} disabled={isRetrying} className="mt-2">
        {isRetrying ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Retrying…
          </>
        ) : (
          <>
            <RefreshCw className="size-4" /> Retry
          </>
        )}
      </Button>
    </div>
  );
}
