import { format } from "date-fns";
import { Server, Database, Sparkles, Clock, Radar, Loader2, RefreshCw, Cpu, HardDrive } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useSystemHealth, type ServiceStatus } from "./platform-admin-queries";

const STATUS_META: Record<string, { tone: "success" | "warning" | "destructive" | "muted" | "info"; label: string }> = {
  online: { tone: "success", label: "Online" },
  offline: { tone: "destructive", label: "Offline" },
  unconfigured: { tone: "muted", label: "Not Configured" },
  disabled: { tone: "muted", label: "Disabled" },
  delayed: { tone: "warning", label: "Delayed" },
  stale: { tone: "warning", label: "Stale" },
  "no-data": { tone: "muted", label: "No Data" },
  degraded: { tone: "warning", label: "Degraded" },
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Backend API": Server,
  MongoDB: Database,
  "AI Service (Gemini)": Sparkles,
  "Ingestion Scheduler": Clock,
  "Environmental Pipeline": Radar,
};

function ServiceCard({ service }: { service: ServiceStatus }) {
  const meta = STATUS_META[service.status] ?? { tone: "muted" as const, label: service.status };
  const Icon = SERVICE_ICONS[service.name] ?? Server;
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">{service.name}</div>
            {service.detail && <div className="text-xs text-muted-foreground mt-0.5">{service.detail}</div>}
          </div>
        </div>
        <Pill tone={meta.tone}>{meta.label}</Pill>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SystemHealthPanel() {
  const { data, isLoading, isError } = useSystemHealth();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["p6-system-health"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-destructive">Health check failed.</p>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="size-3.5 mr-1.5" />Retry</Button>
      </div>
    );
  }

  const { system, services, timestamp } = data;

  return (
    <div className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Last checked: {format(new Date(timestamp), "MMM d, yyyy 'at' h:mm:ss a")}
        <Button variant="ghost" size="sm" className="h-6 ml-2 text-xs px-2" onClick={refresh}>
          <RefreshCw className="size-3 mr-1" />Refresh
        </Button>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map(s => <ServiceCard key={s.name} service={s} />)}
      </div>

      {/* System metrics */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Metrics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</div>
            <div className="text-lg font-semibold">{formatUptime(system.uptimeSeconds)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Memory Used</div>
            <div className="text-lg font-semibold">{system.memUsedPct}%</div>
            <div className="text-[10px] text-muted-foreground">{system.usedMemMb}MB / {system.totalMemMb}MB</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Platform</div>
            <div className="text-lg font-semibold capitalize">{system.platform}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Node.js</div>
            <div className="text-lg font-semibold">{system.nodeVersion}</div>
          </div>
        </div>

        {/* Memory bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1"><HardDrive className="size-3" />Memory Usage</span>
            <span className="font-medium">{system.memUsedPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                system.memUsedPct > 85 ? "bg-destructive" : system.memUsedPct > 70 ? "bg-warning" : "bg-success")}
              style={{ width: `${system.memUsedPct}%` }}
            />
          </div>
        </div>

        {/* Load average */}
        {system.loadAvg && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Cpu className="size-3" />Load Average (1m / 5m / 15m)
            </div>
            <div className="flex gap-4">
              {system.loadAvg.map((v, i) => (
                <div key={i} className="text-sm font-semibold">{v.toFixed(2)}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
