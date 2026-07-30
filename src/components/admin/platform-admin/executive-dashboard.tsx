import { useMemo } from "react";
import {
  Users, Building2, FileText, AlertTriangle, ShieldAlert,
  CheckCircle2, Clock, TrendingUp, Database, Sparkles,
  Loader2, Info, RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatCard, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useExecutiveDashboard } from "./platform-admin-queries";

function InsightRow({ type, message }: { type: "critical" | "warning" | "info"; message: string }) {
  const meta = {
    critical: { icon: ShieldAlert, cls: "text-destructive", bg: "bg-destructive/8 border-destructive/20" },
    warning: { icon: AlertTriangle, cls: "text-warning", bg: "bg-warning/8 border-warning/20" },
    info: { icon: Info, cls: "text-info", bg: "bg-info/8 border-info/20" },
  }[type];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-sm", meta.bg)}>
      <Icon className={cn("size-4 mt-0.5 shrink-0", meta.cls)} />
      <span className="text-foreground/80">{message}</span>
    </div>
  );
}

function HealthBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium",
      ok ? "border-success/20 bg-success/8 text-success" : "border-destructive/20 bg-destructive/8 text-destructive",
    )}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {label}
    </div>
  );
}

export function PlatformExecutiveDashboard() {
  const { data, isLoading, isError } = useExecutiveDashboard();
  const qc = useQueryClient();

  const refresh = () => qc.invalidateQueries({ queryKey: ["p6-executive-dashboard"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-destructive">Failed to load dashboard data.</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="size-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const { users, cities, complaints, alerts, platformHealth, insights, pendingAuthorities } = data;

  return (
    <div className="space-y-6">
      {/* Platform health bar */}
      <div className="flex flex-wrap gap-2">
        <HealthBadge ok={platformHealth.database} label="Database" />
        <HealthBadge ok={platformHealth.ai} label="AI Services" />
        <HealthBadge ok={platformHealth.scheduler} label="Scheduler" />
        <HealthBadge ok={platformHealth.dataFreshOk} label="Data Pipeline" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="Total Users" value={users.total} accent="primary" icon={<Users className="size-4" />} />
        <StatCard label="Citizens" value={users.citizens} accent="info" icon={<Users className="size-4" />} />
        <StatCard label="Authorities" value={users.authorities} accent="primary" icon={<Users className="size-4" />} />
        <StatCard label="Active Cities" value={cities.active} accent="success" icon={<Building2 className="size-4" />} hint={`${cities.total} total`} />
        <StatCard label="Open Complaints" value={complaints.open} accent="warning" icon={<FileText className="size-4" />} />
        <StatCard label="Active Alerts" value={alerts.active} accent="destructive" icon={<AlertTriangle className="size-4" />} hint={`${alerts.critical} critical`} />
        <StatCard label="Resolution Rate" value={`${complaints.resolutionRate}%`} accent="success" icon={<TrendingUp className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaint metrics */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">Complaint Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total", value: complaints.total, cls: "text-foreground" },
              { label: "Open", value: complaints.open, cls: "text-warning" },
              { label: "Closed", value: complaints.closed, cls: "text-success" },
              { label: "Avg Resolution", value: complaints.avgResolutionDays != null ? `${complaints.avgResolutionDays}d` : "—", cls: "text-foreground" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                <div className={cn("text-2xl font-semibold", cls)}>{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {pendingAuthorities > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/8 border border-warning/20 text-xs">
              <Clock className="size-4 text-warning shrink-0" />
              <span>{pendingAuthorities} authority registration{pendingAuthorities !== 1 ? "s" : ""} pending approval.</span>
            </div>
          )}
        </div>

        {/* System status summary */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">Platform Status</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Database", ok: platformHealth.database, detail: platformHealth.database ? "Connected" : "Disconnected" },
              { label: "AI (Gemini)", ok: platformHealth.ai, detail: platformHealth.ai ? "Configured" : "Not configured" },
              { label: "Scheduler", ok: platformHealth.scheduler, detail: platformHealth.scheduler ? "Enabled" : "Disabled" },
              {
                label: "Data Pipeline",
                ok: platformHealth.dataFreshOk,
                detail: platformHealth.dataFreshMinutes != null
                  ? `Last reading ${platformHealth.dataFreshMinutes}m ago`
                  : "No data ingested",
              },
            ].map(({ label, ok, detail }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-destructive")} />
                  <span className="text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operational Insights
          </h3>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <InsightRow key={i} type={ins.type} message={ins.message} />
            ))}
          </div>
        </div>
      )}

      {insights.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-success/20 bg-success/5">
          <CheckCircle2 className="size-5 text-success shrink-0" />
          <span className="text-sm text-success font-medium">All systems are operating normally — no actionable insights.</span>
        </div>
      )}
    </div>
  );
}
