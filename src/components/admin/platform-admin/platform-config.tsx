import { Loader2, Settings, Shield, Sparkles, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Pill } from "@/components/ui-bits";
import { usePlatformConfig } from "./platform-admin-queries";
import { cn } from "@/lib/utils";

function ConfigRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {ok !== undefined && (
          ok
            ? <CheckCircle2 className="size-3.5 text-success" />
            : <XCircle className="size-3.5 text-destructive" />
        )}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PlatformConfigView() {
  const { data, isLoading, isError } = usePlatformConfig();

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive text-center py-10">Failed to load configuration.</p>;
  }

  const { platform, features, security, complaints } = data;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground px-1">
        Platform configuration is managed via environment variables. Contact your system administrator to modify settings.
      </div>

      <Section icon={Settings} title="Platform">
        <ConfigRow label="Name" value={platform.name} />
        <ConfigRow label="Environment" value={platform.environment} />
        <ConfigRow label="Version" value={platform.version} />
        <ConfigRow label="Frontend URL" value={platform.frontendUrl} />
        <ConfigRow label="API Port" value={platform.port} />
      </Section>

      <Section icon={Sparkles} title="Features">
        <ConfigRow label="AI Services (Gemini)" value={features.aiEnabled ? "Enabled" : "Not configured"} ok={features.aiEnabled} />
        <ConfigRow label="Environmental Scheduler" value={features.schedulerEnabled ? "Enabled" : "Disabled"} ok={features.schedulerEnabled} />
        <ConfigRow label="Email Notifications" value={features.emailEnabled ? "Enabled" : "Not configured"} ok={features.emailEnabled} />
        <ConfigRow label="File Uploads" value={features.uploadsEnabled ? "Enabled" : "Disabled"} ok={features.uploadsEnabled} />
      </Section>

      <Section icon={Shield} title="Security">
        <ConfigRow label="Session Timeout" value={`${security.sessionTimeoutDays} days`} />
        <ConfigRow label="Max Failed Logins" value={String(security.maxFailedLogins)} />
        <ConfigRow label="Account Lock Duration" value={`${security.accountLockMinutes} minutes`} />
        <ConfigRow label="Two-Factor Auth" value={security.twoFactorAvailable ? "Available" : "Not available"} ok={security.twoFactorAvailable} />
      </Section>

      <Section icon={FileText} title="Complaints">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Issue Types</div>
            <div className="flex flex-wrap gap-1.5">
              {complaints.allowedIssueTypes.map(t => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 capitalize">{t.replace("_", " ")}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Severity Levels</div>
            <div className="flex gap-1.5">
              {complaints.severityLevels.map(s => (
                <Pill key={s} tone={s === "critical" ? "destructive" : s === "high" ? "warning" : s === "medium" ? "info" : "muted"}>
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
