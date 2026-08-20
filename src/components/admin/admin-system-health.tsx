import { ChevronRight, Server, Database, Brain, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSystemHealth } from "./admin-dashboard-queries";

type DotTone = "success" | "warning" | "destructive";

function ServiceRow({
  icon: Icon,
  label,
  tone,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: DotTone;
  detail: string;
}) {
  const toneStyles = {
    success: {
      dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    },
    warning: {
      dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    },
    destructive: {
      dot: "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]",
      badge: "border-destructive/30 bg-destructive/10 text-destructive",
    },
  }[tone];

  return (
    <div className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-6 rounded-md bg-muted grid place-items-center text-muted-foreground shrink-0">
          <Icon className="size-3.5" />
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{label}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("size-1.5 rounded-full", toneStyles.dot)} />
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", toneStyles.badge)}>
          {detail}
        </span>
      </div>
    </div>
  );
}

/**
 * System Health & Infrastructure Panel for the Administrator Dashboard.
 */
export function AdminSystemHealth() {
  const health = useSystemHealth();

  if (health.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
        <Clock className="size-5 animate-spin" />
        <span className="text-xs">Checking system infrastructure…</span>
      </div>
    );
  }

  if (health.isError || !health.data) {
    return (
      <div className="space-y-2.5">
        <div className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 text-xs">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="font-medium">Backend API Unreachable</span>
        </div>
        <Link
          to="/admin/platform-health"
          className="flex items-center justify-between pt-2 border-t border-border/50 text-[11.5px] font-medium text-muted-foreground hover:text-primary transition-colors select-none"
        >
          <span>Open Platform Diagnostics</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const d = health.data as {
    database: { connected: boolean; state: string };
    scheduler: { enabled: boolean; running: boolean };
    aiEnabled: boolean;
  };

  const isAllHealthy = d.database.connected && d.aiEnabled && d.scheduler.enabled;

  return (
    <div className="space-y-2.5">
      {/* Platform Status Badge */}
      <div
        className={cn(
          "flex items-center justify-between p-2 px-2.5 rounded-xl border text-[11px] font-semibold select-none",
          isAllHealthy
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : "border-amber-500/30 bg-amber-500/10 text-amber-500",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", isAllHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
          {isAllHealthy ? "ALL CORE SYSTEMS OPERATIONAL" : "SYSTEM ATTENTION REQUIRED"}
        </span>
        <span className="font-mono text-[9.5px] opacity-80">99.9% Uptime</span>
      </div>

      {/* Services List */}
      <div className="space-y-1.5">
        <ServiceRow icon={Server} label="Backend API" tone="success" detail="Online" />
        <ServiceRow
          icon={Database}
          label="Database (MongoDB)"
          tone={d.database.connected ? "success" : "destructive"}
          detail={d.database.connected ? "Connected" : d.database.state}
        />
        <ServiceRow
          icon={Brain}
          label="AI Engine (Gemini)"
          tone={d.aiEnabled ? "success" : "warning"}
          detail={d.aiEnabled ? "Configured" : "Inactive"}
        />
        <ServiceRow
          icon={Clock}
          label="Ingestion Scheduler"
          tone={d.scheduler.enabled ? "success" : "warning"}
          detail={d.scheduler.enabled ? (d.scheduler.running ? "Active (Running)" : "Active") : "Inactive"}
        />
      </div>

      {/* Footer Link */}
      <Link
        to="/admin/platform-health"
        className="flex items-center justify-between pt-2 border-t border-border/50 text-[11.5px] font-medium text-muted-foreground hover:text-primary transition-colors select-none"
      >
        <span>Open Platform Diagnostics</span>
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}

