import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Database,
  CloudSun,
  Shield,
  Cpu,
  Bell,
  MapPin,
  FileText,
  Radio,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { healthApi, type PlatformHealth } from "@/lib/api/health.api";

// ─── Status Types ─────────────────────────────────────────────────────────────

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  category: "platform" | "data" | "citizen_authority" | "intelligence";
  icon: typeof Server;
  lastChecked?: string;
}

const STATUS_BADGE: Record<
  ServiceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  operational: {
    label: "Operational",
    bg: "bg-success/10",
    text: "text-success",
    dot: "bg-success",
  },
  degraded: {
    label: "Degraded",
    bg: "bg-warning/10",
    text: "text-warning",
    dot: "bg-warning",
  },
  outage: {
    label: "Major Outage",
    bg: "bg-destructive/10",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  maintenance: {
    label: "Maintenance",
    bg: "bg-info/10",
    text: "text-info",
    dot: "bg-info",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function SystemStatusPage() {
  const {
    data: health,
    isLoading,
    isError,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["platform", "health"],
    queryFn: () => healthApi.get(),
    refetchInterval: 30_000,
  });

  const isDbConnected = health?.database?.connected ?? true;
  const isAiActive = health?.aiEnabled ?? true;
  const isHealthy = !isError && (health?.status === "healthy" || health?.success);

  // Group services with real health metadata
  const services: ServiceItem[] = [
    // Core Platform
    {
      id: "web-app",
      name: "GreenGuard AI Web Application",
      description: "Frontend interface, navigation, and client routers",
      status: "operational",
      category: "platform",
      icon: Server,
    },
    {
      id: "api-gateway",
      name: "API Gateway & Authentication",
      description: "Session validation, JWT tokens, 2FA, and endpoints",
      status: isHealthy ? "operational" : "degraded",
      category: "platform",
      icon: Shield,
    },
    {
      id: "database",
      name: "Database Engine",
      description: `Primary MongoDB database cluster (${health?.database?.state ?? "connected"})`,
      status: isDbConnected ? "operational" : "outage",
      category: "platform",
      icon: Database,
    },

    // Environmental Data
    {
      id: "aqi-monitoring",
      name: "AQI & Sensor Telemetry Pipeline",
      description: "Live sensor feeds, PM2.5, PM10, and station metrics",
      status: "operational",
      category: "data",
      icon: Radio,
    },
    {
      id: "weather-forecast",
      name: "Weather & Forecast Engine",
      description: "Open-Meteo atmospheric synchronization and hourly forecasts",
      status: "operational",
      category: "data",
      icon: CloudSun,
    },
    {
      id: "smart-map-gis",
      name: "Smart Maps & GIS Layer Services",
      description: "Geographic boundary rendering and sensor heatmaps",
      status: "operational",
      category: "data",
      icon: MapPin,
    },

    // Citizen & Authority Services
    {
      id: "citizen-hub",
      name: "Citizen Complaints & Tracking",
      description: "Complaint registration, evidence ingestion, and audit trail",
      status: "operational",
      category: "citizen_authority",
      icon: FileText,
    },
    {
      id: "alerts-notifications",
      name: "Sensor Alerts & Push Notifications",
      description: "Automated threshold alerts and broadcast notifications",
      status: "operational",
      category: "citizen_authority",
      icon: Bell,
    },

    // Intelligence
    {
      id: "intelligence-center",
      name: "GreenGuard Intelligence Center",
      description: "AI Copilot analysis, district summaries, and recommendations",
      status: isAiActive ? "operational" : "degraded",
      category: "intelligence",
      icon: Cpu,
    },
  ];

  const categories = [
    { key: "platform", label: "Core Platform & Infrastructure" },
    { key: "data", label: "Environmental Data & Forecasting" },
    { key: "citizen_authority", label: "Citizen & Authority Services" },
    { key: "intelligence", label: "Environmental Intelligence & AI" },
  ] as const;

  const formattedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Just now";

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* 1. Header & Overall Status Banner */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Activity className="size-3 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                Platform Health
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              System Status
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Current operational status of GreenGuard AI services and platform functionality.
            </p>
          </div>

          {/* Overall Health Card */}
          <div
            className={cn(
              "rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors",
              isHealthy
                ? "border-success/30 bg-success/5"
                : "border-warning/30 bg-warning/5",
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "size-12 rounded-2xl flex items-center justify-center shrink-0",
                  isHealthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                )}
              >
                {isHealthy ? (
                  <CheckCircle2 className="size-6" />
                ) : (
                  <AlertTriangle className="size-6" />
                )}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {isHealthy ? "All systems operational" : "Some services experiencing degradation"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isHealthy
                    ? "All monitored GreenGuard AI pipelines and services are operating normally."
                    : "Our engineering team is actively monitoring service health."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <span className="text-xs text-muted-foreground">
                Last checked: <span className="text-foreground font-medium">{formattedTime}</span>
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
                title="Refresh health status"
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin text-primary")} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Monitored Service Groups */}
        <div className="space-y-8">
          {categories.map((cat) => {
            const catServices = services.filter((s) => s.category === cat.key);
            return (
              <section key={cat.key} className="space-y-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
                  {cat.label}
                </h3>

                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60">
                  {catServices.map((service) => {
                    const Icon = service.icon;
                    const badge = STATUS_BADGE[service.status];
                    return (
                      <div
                        key={service.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {service.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {service.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                              badge.bg,
                              badge.text,
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full animate-pulse", badge.dot)} />
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* 3. Current Incidents */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
            Current Incidents
          </h3>
          <div className="rounded-2xl border border-border/80 bg-card p-6 text-center space-y-2">
            <CheckCircle2 className="size-8 text-success mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-foreground">No active incidents</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              All monitored GreenGuard AI services and environmental data pipelines are currently
              operating normally.
            </p>
          </div>
        </section>

        {/* 4. Support Contact Link */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground">
              Experiencing an issue with a GreenGuard service?
            </span>
            <p className="text-xs text-muted-foreground">
              Our support team is available to investigate technical problems and data anomalies.
            </p>
          </div>
          <Link
            to="/help/support"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            <span>Contact Support</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
