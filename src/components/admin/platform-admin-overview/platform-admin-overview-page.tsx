import {
  Users, Building2, FileText, AlertTriangle, ShieldAlert, CheckCircle2,
  TrendingUp, Database, Sparkles, Clock, Loader2, Info, RefreshCw, Server,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionTitle, StatCard, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { usePlatformOverview, useSystemHealth } from "../platform-admin-api";

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

function HealthDot({ ok }: { ok: boolean }) {
  return <div className={cn("size-2 rounded-full shrink-0", ok ? "bg-success" : "bg-destructive")} />;
}

export function PlatformAdminOverviewPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = usePlatformOverview();
  const { data: health } = useSystemHealth();

  function refresh() {
    qc.invalidateQueries({ queryKey: ["pa-overview"] });
    qc.invalidateQueries({ queryKey: ["pa-system-health"] });
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <SectionTitle
        eyebrow="Platform"
        title="Platform Administration"
        action={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-destructive">Failed to load platform data.</p>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="size-3.5 mr-1.5" />Retry</Button>
        </div>
      ) : (
        <>
          {/* Platform health strip */}
          <div className="flex flex-wrap gap-2">
            {[
              { ok: data.platform.database, label: "Database" },
              { ok: data.platform.ai, label: "AI Services" },
              { ok: data.platform.scheduler, label: "Scheduler" },
              { ok: data.platform.dataFreshOk, label: "Data Pipeline" },
            ].map(({ ok, label }) => (
              <div key={label} className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium",
                ok ? "border-success/20 bg-success/8 text-success" : "border-destructive/20 bg-destructive/8 text-destructive",
              )}>
                {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                {label}
              </div>
            ))}
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <StatCard label="Total Users" value={data.users.total} accent="primary" icon={<Users className="size-4" />} />
            <StatCard label="Citizens" value={data.users.citizens} accent="info" icon={<Users className="size-4" />} />
            <StatCard label="Authorities" value={data.users.authorities} accent="primary" icon={<Users className="size-4" />} />
            <StatCard label="Active Cities" value={data.cities.active} accent="success" icon={<Building2 className="size-4" />} hint={`${data.cities.total} total`} />
            <StatCard label="Open Complaints" value={data.complaints.open} accent="warning" icon={<FileText className="size-4" />} />
            <StatCard label="Active Alerts" value={data.alerts.active} accent="destructive" icon={<AlertTriangle className="size-4" />} hint={`${data.alerts.critical} critical`} />
            <StatCard label="Resolution Rate" value={`${data.complaints.resolutionRate}%`} accent="success" icon={<TrendingUp className="size-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Complaints overview */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h3 className="font-semibold text-sm">Complaint Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total", value: data.complaints.total, cls: "text-foreground" },
                  { label: "Open", value: data.complaints.open, cls: "text-warning" },
                  { label: "Closed", value: data.complaints.closed, cls: "text-success" },
                  { label: "Avg Resolution", value: data.complaints.avgResolutionDays != null ? `${data.complaints.avgResolutionDays}d` : "—", cls: "text-foreground" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                    <div className={cn("text-2xl font-semibold", cls)}>{value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {data.pendingAuthorities > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/8 border border-warning/20 text-xs">
                  <Clock className="size-4 text-warning shrink-0" />
                  {data.pendingAuthorities} authority registration{data.pendingAuthorities !== 1 ? "s" : ""} pending approval.
                </div>
              )}
            </div>

            {/* System services */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                <h3 className="font-semibold text-sm">System Services</h3>
              </div>
              {health ? (
                <div className="space-y-2.5">
                  {health.services.map(s => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <HealthDot ok={s.status === "online"} />
                        <span className="text-sm">{s.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.detail}</span>
                    </div>
                  ))}
                  {health.system && (
                    <div className="pt-2 border-t space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Memory</span>
                        <span className="font-medium">{health.system.memUsedPct}% ({health.system.usedMemMb}MB / {health.system.totalMemMb}MB)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            health.system.memUsedPct > 85 ? "bg-destructive" : health.system.memUsedPct > 70 ? "bg-warning" : "bg-success")}
                          style={{ width: `${health.system.memUsedPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { label: "Database", ok: data.platform.database, detail: data.platform.database ? "Connected" : "Disconnected" },
                    { label: "AI (Gemini)", ok: data.platform.ai, detail: data.platform.ai ? "Configured" : "Not configured" },
                    { label: "Scheduler", ok: data.platform.scheduler, detail: data.platform.scheduler ? "Enabled" : "Disabled" },
                    {
                      label: "Data Pipeline", ok: data.platform.dataFreshOk,
                      detail: data.platform.dataFreshMinutes != null ? `${data.platform.dataFreshMinutes}m ago` : "No data",
                    },
                  ].map(({ label, ok, detail }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HealthDot ok={ok} />
                        <span className="text-sm">{label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operational insights */}
          {data.insights.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operational Insights</h3>
              <div className="space-y-2">
                {data.insights.map((ins, i) => <InsightRow key={i} type={ins.type} message={ins.message} />)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-success/20 bg-success/5">
              <CheckCircle2 className="size-5 text-success shrink-0" />
              <span className="text-sm text-success font-medium">All systems operating normally — no actionable insights.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
