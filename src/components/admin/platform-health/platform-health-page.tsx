import {
  RefreshCw,
  Server,
  Database,
  Clock,
  Sparkles,
  Radar as RadarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionTitle, Panel } from "@/components/ui-bits";
import { PlatformServiceCard, type ServiceStatus } from "./platform-service-card";
import { PlatformEventsList } from "./platform-events-list";
import {
  useSystemHealth,
  useAdminStats,
  useEnvironmentalReadings,
  deriveOverallStatus,
  type OverallPlatformStatus,
} from "./platform-health-queries";

const OVERALL_COPY: Record<
  OverallPlatformStatus,
  { label: string; description: string; icon: typeof CheckCircle2; className: string }
> = {
  healthy: {
    label: "All Systems Healthy",
    description: "The backend is reachable and the database is connected.",
    icon: CheckCircle2,
    className: "text-[var(--color-success)]",
  },
  degraded: {
    label: "Platform Degraded",
    description:
      "The backend is reachable, but the database is not connected. Core features may fail.",
    icon: AlertTriangle,
    className: "text-[var(--color-warning)]",
  },
  offline: {
    label: "Platform Unreachable",
    description: "The backend did not respond to a health check.",
    icon: XCircle,
    className: "text-destructive",
  },
};

function timeAgoOrNever(iso: string | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function PlatformHealthPage() {
  const health = useSystemHealth();
  const stats = useAdminStats();
  const readings = useEnvironmentalReadings();
  const qc = useQueryClient();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["platform-health"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-city-directory-env"] });
  };

  const overall = health.isLoading
    ? null
    : deriveOverallStatus(health.isError, health.data?.database?.connected);
  const copy = overall ? OVERALL_COPY[overall] : null;

  const lastChecked = timeAgoOrNever(health.data?.timestamp);

  const backendStatus: ServiceStatus = health.isLoading
    ? "unknown"
    : health.isError
      ? "offline"
      : "online";
  const dbStatus: ServiceStatus = health.isLoading
    ? "unknown"
    : health.data?.database?.connected
      ? "online"
      : "offline";
  const schedulerEnabled = health.data?.scheduler?.enabled;
  const schedulerStatus: ServiceStatus = health.isLoading
    ? "unknown"
    : schedulerEnabled
      ? "online"
      : "warning";
  const aiStatus: ServiceStatus = health.isLoading
    ? "unknown"
    : health.data?.aiEnabled
      ? "online"
      : "warning";

  const mostRecentReadingMs = (readings.data?.cities ?? []).reduce(
    (max, c) => Math.max(max, new Date(c.timestamp).getTime()),
    0,
  );
  const pipelineStatus: ServiceStatus = readings.isLoading
    ? "unknown"
    : mostRecentReadingMs === 0
      ? "warning"
      : Date.now() - mostRecentReadingMs <= 1.5 * 60 * 60 * 1000
        ? "online"
        : Date.now() - mostRecentReadingMs <= 24 * 60 * 60 * 1000
          ? "warning"
          : "offline";

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Administration"
        title="Platform Health"
        action={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Overall status */}
      {copy ? (
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <copy.icon className={cn("size-8 shrink-0", copy.className)} />
          <div>
            <div className={cn("text-lg font-semibold", copy.className)}>{copy.label}</div>
            <div className="text-sm text-muted-foreground">{copy.description}</div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <RadarIcon className="size-8 shrink-0 text-muted-foreground animate-pulse" />
          <div>
            <div className="text-lg font-semibold text-muted-foreground">
              Checking platform status…
            </div>
            <div className="text-sm text-muted-foreground">Running a health check now.</div>
          </div>
        </div>
      )}

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlatformServiceCard
          icon={Server}
          name="Backend API"
          status={backendStatus}
          description="Core Express API serving every route in the platform."
          lastChecked={lastChecked}
        />
        <PlatformServiceCard
          icon={Database}
          name="Database"
          status={dbStatus}
          description="MongoDB connection used for all platform data."
          detail={health.data?.database?.state && `State: ${health.data.database.state}`}
          lastChecked={lastChecked}
        />
        <PlatformServiceCard
          icon={Clock}
          name="Ingestion Scheduler"
          status={schedulerStatus}
          description={
            schedulerEnabled
              ? "Runs environmental data ingestion every 30 minutes."
              : "No ingestion API key configured — platform runs on seeded data."
          }
          detail={schedulerEnabled && health.data?.scheduler?.running && "Currently running a tick"}
          lastChecked={lastChecked}
        />
        <PlatformServiceCard
          icon={Sparkles}
          name="AI Service (Gemini)"
          status={aiStatus}
          description={
            health.data?.aiEnabled
              ? "Powers GreenGuard Intelligence Center, insights, and executive summaries."
              : "Gemini API key not configured — AI features are unavailable."
          }
          lastChecked={lastChecked}
        />
        <PlatformServiceCard
          icon={RadarIcon}
          name="Environmental Data Pipeline"
          status={pipelineStatus}
          description={
            mostRecentReadingMs === 0
              ? "No environmental readings have been ingested yet."
              : "Air quality and weather readings ingested across monitored cities."
          }
          detail={
            stats.data?.dataReadings != null && `${stats.data.dataReadings} total readings ingested`
          }
          lastChecked={
            mostRecentReadingMs > 0
              ? timeAgoOrNever(new Date(mostRecentReadingMs).toISOString())
              : undefined
          }
        />
      </div>

      {/* Recent events */}
      <Panel title="Recent Platform Events" eyebrow="Live">
        <PlatformEventsList />
      </Panel>
    </div>
  );
}
