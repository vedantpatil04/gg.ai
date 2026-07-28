import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSystemHealth } from "./admin-dashboard-queries";

type DotTone = "success" | "warning" | "destructive";

function StatusRow({ label, tone, detail }: { label: string; tone: DotTone; detail: string }) {
  const dotClass: Record<DotTone, string> = {
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    destructive: "bg-[var(--color-destructive)]",
  };
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", dotClass[tone])} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function ViewPlatformHealthLink() {
  return (
    <Link
      to="/admin/platform-health"
      className="flex items-center justify-between mt-2 pt-2 border-t border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      View Platform Health
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

/**
 * Reuses the existing /api/health endpoint (Phase 2.2 added `database` and
 * `scheduler` fields to it rather than creating a new endpoint). Polls
 * every 60s so status can't go silently stale between manual refreshes —
 * the one exception to this dashboard's otherwise manual-refresh design,
 * since a health panel that only updates on click defeats its own purpose.
 */
export function AdminSystemHealth() {
  const health = useSystemHealth();

  if (health.isLoading) {
    return <p className="text-sm text-muted-foreground">Checking system status…</p>;
  }

  if (health.isError || !health.data) {
    return (
      <div>
        <StatusRow label="Backend" tone="destructive" detail="Unreachable" />
        <ViewPlatformHealthLink />
      </div>
    );
  }

  const d = health.data as {
    database: { connected: boolean; state: string };
    scheduler: { enabled: boolean; running: boolean };
    aiEnabled: boolean;
  };

  return (
    <div>
      <StatusRow label="Backend" tone="success" detail="Online" />
      <StatusRow
        label="Database"
        tone={d.database.connected ? "success" : "destructive"}
        detail={d.database.connected ? "Connected" : d.database.state}
      />
      <StatusRow
        label="AI Service"
        tone={d.aiEnabled ? "success" : "warning"}
        detail={d.aiEnabled ? "Configured" : "Not configured"}
      />
      <StatusRow
        label="Ingestion Scheduler"
        tone={d.scheduler.enabled ? "success" : "warning"}
        detail={d.scheduler.enabled ? (d.scheduler.running ? "Running now" : "Active") : "Inactive"}
      />
      <ViewPlatformHealthLink />
    </div>
  );
}
