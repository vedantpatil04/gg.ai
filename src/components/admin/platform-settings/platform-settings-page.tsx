import { Loader2, Settings, Shield, Sparkles, FileText, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionTitle, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "../platform-admin-api";

function ConfigRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2.5 border-b last:border-0">
      <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {ok !== undefined && (
          ok ? <CheckCircle2 className="size-3.5 text-success shrink-0" /> : <XCircle className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-medium break-all sm:break-normal">{value}</span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, children,
}: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PlatformSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = usePlatformConfig();

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Platform"
        title="Platform Settings"
        action={
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["pa-config"] })} className="h-8 text-xs">
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Platform settings are managed via environment variables on the server.
        To modify a setting, update the relevant environment variable and restart the service.
        Contact your system administrator for configuration changes.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : isError || !data ? (
        <p className="text-sm text-destructive text-center py-10">Failed to load configuration.</p>
      ) : (
        <div className="space-y-4">
          <Section icon={Settings} title="General">
            <ConfigRow label="Platform Name" value={data.platform.name} />
            <ConfigRow label="Environment" value={data.platform.environment} />
            <ConfigRow label="Version" value={data.platform.version} />
            <ConfigRow label="Frontend URL" value={data.platform.frontendUrl} />
            <ConfigRow label="API Port" value={data.platform.port} />
          </Section>

          <Section icon={Sparkles} title="Features">
            <ConfigRow label="AI Services (Gemini)" value={data.features.aiEnabled ? "Enabled" : "Not configured"} ok={data.features.aiEnabled} />
            <ConfigRow label="Environmental Scheduler" value={data.features.schedulerEnabled ? "Enabled" : "Disabled"} ok={data.features.schedulerEnabled} />
            <ConfigRow label="Email Notifications" value={data.features.emailEnabled ? "Enabled" : "Not configured"} ok={data.features.emailEnabled} />
            <ConfigRow label="File Uploads" value={data.features.uploadsEnabled ? "Enabled" : "Disabled"} ok={data.features.uploadsEnabled} />
          </Section>

          <Section icon={Shield} title="Security">
            <ConfigRow label="Session Timeout" value={`${data.security.sessionTimeoutDays} days`} />
            <ConfigRow label="Max Failed Login Attempts" value={String(data.security.maxFailedLogins)} />
            <ConfigRow label="Account Lock Duration" value={`${data.security.accountLockMinutes} minutes`} />
            <ConfigRow label="Two-Factor Authentication" value={data.security.twoFactorAvailable ? "Available" : "Not available"} ok={data.security.twoFactorAvailable} />
          </Section>

          <Section icon={FileText} title="Complaint Configuration">
            <div className="py-2.5 border-b space-y-2">
              <span className="text-sm text-muted-foreground block">Allowed Issue Types</span>
              <div className="flex flex-wrap gap-1.5">
                {data.complaints.allowedIssueTypes.map(t => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 capitalize">{t.replace(/_/g, " ")}</span>
                ))}
              </div>
            </div>
            <div className="py-2.5 space-y-2">
              <span className="text-sm text-muted-foreground block">Severity Levels</span>
              <div className="flex gap-1.5">
                {data.complaints.severityLevels.map(s => (
                  <Pill key={s} tone={s === "critical" ? "destructive" : s === "high" ? "warning" : s === "medium" ? "info" : "muted"}>{s}</Pill>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
