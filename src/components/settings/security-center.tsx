import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  Monitor,
  Smartphone,
  Tablet,
  History,
  Loader2,
  CheckCircle,
  XCircle,
  LogOut,
  AlertTriangle,
  ShieldOff,
  Activity,
  KeyRound,
  MailCheck,
  PhoneCall,
  LogIn,
  ShieldX,
  Ban,
  Inbox,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Panel, Pill } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api/auth.api";
import {
  securityApi,
  type SecurityStatus,
  type SecuritySession,
  type LoginHistoryFilter,
  type LoginHistoryEntry,
  type SecurityEventEntry,
} from "@/lib/api/security.api";
import {
  sendMsg91Otp,
  verifyMsg91Otp,
  retryMsg91Otp,
  isMsg91Configured,
  loadMsg91Sdk,
} from "@/lib/msg91";

// ─── Shared Input Field ───────────────────────────────────────────────────────
function Field({
  label,
  className,
  ...rest
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        className={cn(
          "mt-1.5 w-full h-10 rounded-xl border border-input bg-background/50 px-3.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50",
          className,
        )}
      />
    </label>
  );
}

// ─── Formatting helpers ────────────────────────────────────────────────────────
function deviceIcon(device?: string) {
  if (device === "Mobile") return Smartphone;
  if (device === "Tablet") return Tablet;
  return Monitor;
}

function formatDateOnly(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return time;
}

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function fullTimestamp(iso?: string | null) {
  if (!iso) return undefined;
  return `${formatDateOnly(iso)} · ${formatTimeLabel(iso)}`;
}

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return email ?? "—";
  const [local, domain] = email.split("@");
  const visible = local.length <= 3 ? local.slice(0, 1) : local.slice(0, 3);
  return `${visible}****@${domain}`;
}

function maskPhone(phone?: string | null) {
  if (!phone) return null;
  if (phone.length <= 2) return phone;
  return "•".repeat(Math.max(phone.length - 2, 0)) + phone.slice(-2);
}

function downloadRecoveryCodes(codes: string[]) {
  const body = [
    "GreenGuard AI — Two-Factor Authentication Recovery Codes",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Each code can be used once if you lose access to your authenticator app.",
    "Store this file somewhere safe — anyone with these codes can bypass your 2FA.",
    "",
    ...codes,
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "greenguard-recovery-codes.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printRecoveryCodes(codes: string[]) {
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>GreenGuard AI — Recovery Codes</title>
        <style>
          body { font-family: 'JetBrains Mono', ui-monospace, monospace; padding: 32px; color: #111; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          p { font-size: 12px; color: #555; margin: 2px 0 16px; }
          .codes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .code { border: 1px solid #ccc; border-radius: 6px; padding: 10px; text-align: center; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <h1>GreenGuard AI — Recovery Codes</h1>
        <p>Generated ${new Date().toLocaleString()} · Each code can be used once.</p>
        <div class="codes">${codes.map((c) => `<div class="code">${c}</div>`).join("")}</div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

const EVENT_META: Record<string, { icon: typeof KeyRound; label: string }> = {
  PASSWORD_CHANGED: { icon: KeyRound, label: "Password changed" },
  EMAIL_CHANGED: { icon: Mail, label: "Email changed" },
  EMAIL_VERIFICATION_SUCCESS: { icon: MailCheck, label: "Email verified" },
  PHONE_UPDATED: { icon: PhoneCall, label: "Phone number updated" },
  PHONE_VERIFICATION_REQUESTED: { icon: Phone, label: "Phone verification requested" },
  PHONE_VERIFIED: { icon: CheckCircle, label: "Phone number verified" },
  PHONE_VERIFICATION_FAILED: { icon: XCircle, label: "Phone verification failed" },
  NEW_LOGIN: { icon: LogIn, label: "New login" },
  NEW_DEVICE_LOGIN: { icon: Smartphone, label: "New device login" },
  LOGIN_FAILED: { icon: ShieldX, label: "Failed login attempt" },
  LOGOUT: { icon: LogOut, label: "Logged out" },
  SESSION_REVOKED: { icon: Ban, label: "Session revoked" },
  LOGOUT_ALL_SESSIONS: { icon: LogOut, label: "Logged out of all other sessions" },
  ACCOUNT_DEACTIVATED: { icon: AlertTriangle, label: "Account deactivated" },
};

function EmptyState({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="size-10 rounded-xl glass grid place-items-center">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorState({
  text = "Couldn't load this right now.",
  onRetry,
}: {
  text?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center" role="alert">
      <div className="size-10 rounded-xl bg-destructive/10 grid place-items-center">
        <AlertTriangle className="size-4 text-destructive" />
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">{text}</p>
      <button
        onClick={onRetry}
        className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1.5 py-0.5 cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SECURITY CENTER
// ═══════════════════════════════════════════════════════════════════════════

export function SecurityCenter() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["security-status"],
    queryFn: () => securityApi.getStatus().then((r) => r.data),
    staleTime: 15_000,
    throwOnError: false,
  });

  const is2FAEnabled = status?.twoFactorAuthentication === "ENABLED";
  const isEmailVerified = status?.email?.verified ?? false;
  const isProtected = isEmailVerified && is2FAEnabled;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in-0 duration-300">
      {/* ── 1. Security Header ────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-border/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="size-10 rounded-xl bg-primary/15 border border-primary/25 grid place-items-center shrink-0 text-primary mt-0.5">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("security.title", "Security Center")}
              </h1>
              {!statusLoading && !statusError && (
                <Pill tone={isProtected ? "success" : "warning"}>
                  {isProtected ? (
                    <>
                      <ShieldCheck className="size-3" />
                      {t("security.accountProtected", "Account Protected")}
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="size-3" />
                      {t("security.attentionRequired", "Attention Required")}
                    </>
                  )}
                </Pill>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("security.description", "Protect your GreenGuard account, manage active sessions, and review security access.")}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Security Health Overview (6 Cards) ─────────────────────────── */}
      <SecurityOverview
        status={status}
        loading={statusLoading}
        isError={statusError}
        refetch={refetchStatus}
        email={user?.email}
        phone={user?.phone}
      />

      {/* ── 3. Account Security Controls (Email, Phone, Password, 2FA) ────── */}
      <SecurityWidgetsGrid
        status={status}
        loading={statusLoading}
        email={user?.email}
        phone={user?.phone}
      />

      {/* ── 4. Active Sessions ────────────────────────────────────────────── */}
      <SessionsSection />

      {/* ── 5. Login History ──────────────────────────────────────────────── */}
      <LoginHistorySection />

      {/* ── 6. Recent Security Activity ──────────────────────────────────── */}
      <RecentActivitySection />

      {/* ── 7. Danger Zone ────────────────────────────────────────────────── */}
      <DangerZoneSection />
    </div>
  );
}

// ─── Compact Overview Stat Card ───────────────────────────────────────────────
function CompactStatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="size-7 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="text-sm font-semibold leading-snug truncate">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

// ─── Security Overview (6-Card Grid) ──────────────────────────────────────────
function SecurityOverview({
  status,
  loading,
  isError,
  refetch,
  email,
  phone,
}: {
  status?: SecurityStatus;
  loading: boolean;
  isError: boolean;
  refetch: () => void;
  email?: string;
  phone?: string;
}) {
  const { t } = useTranslation("settings");
  const { data: lastLogin } = useQuery({
    queryKey: ["security-last-login"],
    queryFn: () => securityApi.getLoginHistory(1, 1, "successful").then((r) => r.data.history[0]),
    staleTime: 30_000,
    throwOnError: false,
  });

  const is2FAEnabled = status?.twoFactorAuthentication === "ENABLED";

  return (
    <Panel
      eyebrow={t("security.healthStatus", "Health Status")}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          {t("security.overview", "Security Overview")}
        </span>
      }
    >
      {isError ? (
        <ErrorState text="Couldn't load your security overview." onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <CompactStatCard
            icon={Mail}
            label={t("security.email", "Email")}
            value={
              loading ? (
                "…"
              ) : (
                <Pill tone={status?.email.verified ? "success" : "warning"}>
                  {status?.email.verified ? t("security.verified", "Verified") : t("security.unverified", "Unverified")}
                </Pill>
              )
            }
            hint={loading ? undefined : maskEmail(email)}
          />
          <CompactStatCard
            icon={Phone}
            label={t("security.phone", "Phone")}
            value={
              loading ? (
                "…"
              ) : !phone ? (
                <Pill tone="muted">{t("security.notAdded", "Not added")}</Pill>
              ) : (
                <Pill tone={status?.phone.verified ? "success" : "warning"}>
                  {status?.phone.verified ? t("security.verified", "Verified") : t("security.unverified", "Unverified")}
                </Pill>
              )
            }
            hint={loading ? undefined : (maskPhone(phone) ?? "No phone on file")}
          />
          <CompactStatCard
            icon={Lock}
            label={t("security.password", "Password")}
            value={
              loading
                ? "…"
                : status?.passwordLastChangedAt
                  ? formatDateOnly(status.passwordLastChangedAt)
                  : t("security.neverChanged", "Never changed")
            }
            hint={
              loading
                ? undefined
                : status?.passwordLastChangedAt
                  ? relativeTime(status.passwordLastChangedAt)
                  : "No password history yet"
            }
          />
          <CompactStatCard
            icon={History}
            label={t("security.loginHistory", "Last Login")}
            value={
              loading
                ? "…"
                : lastLogin
                  ? `${lastLogin.browser ?? "Unknown"} • ${lastLogin.os ?? "Unknown"}`
                  : "—"
            }
            hint={
              loading
                ? undefined
                : status?.lastSuccessfulLogin
                  ? `${formatTimeLabel(status.lastSuccessfulLogin)} · ${relativeTime(status.lastSuccessfulLogin)}`
                  : "No logins recorded"
            }
          />
          <CompactStatCard
            icon={Monitor}
            label={t("security.activeSessions", "Active Sessions")}
            value={loading ? "…" : `${status?.activeSessionCount ?? 0} active`}
            hint={loading ? undefined : t("security.devicesSignedIn", "Devices currently signed in")}
          />
          <CompactStatCard
            icon={ShieldOff}
            label={t("security.twoFactor", "Two-Factor Auth")}
            value={
              loading ? (
                "…"
              ) : (
                <Pill tone={is2FAEnabled ? "success" : "warning"}>
                  {is2FAEnabled ? t("security.enabled", "Enabled") : t("security.disabled", "Disabled")}
                </Pill>
              )
            }
            hint={loading ? undefined : is2FAEnabled ? t("security.authenticatorApp", "Authenticator app (TOTP)") : t("security.notEnabled", "Not enabled")}
          />
        </div>
      )}
    </Panel>
  );
}

// ─── Account Security Controls (Widgets) ──────────────────────────────────────
type WidgetKey = "email" | "phone" | "password" | "2fa";

function SectionWidget({
  icon: Icon,
  title,
  statusLabel,
  tone,
  description,
  onManage,
}: {
  icon: typeof Mail;
  title: string;
  statusLabel: string;
  tone: "success" | "warning" | "muted" | "primary";
  description: string;
  onManage: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border/80 bg-background/50 p-4 sm:p-5 transition-all hover:border-primary/30 hover:bg-muted/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 grid place-items-center shrink-0">
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <Pill tone={tone}>{statusLabel}</Pill>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-sm">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onManage}
          className="self-end sm:self-center h-8.5 px-3.5 rounded-lg text-xs font-semibold border border-border bg-card/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shrink-0"
        >
          <span>Manage</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

function SecurityWidgetsGrid({
  status,
  loading,
  email,
  phone,
}: {
  status?: SecurityStatus;
  loading: boolean;
  email?: string;
  phone?: string;
}) {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState<WidgetKey | null>(null);
  const is2FAEnabled = status?.twoFactorAuthentication === "ENABLED";

  const widgets: Array<{
    key: WidgetKey;
    icon: typeof Mail;
    title: string;
    statusLabel: string;
    tone: "success" | "warning" | "muted" | "primary";
    description: string;
  }> = [
    {
      key: "email",
      icon: Mail,
      title: t("security.email", "Email Address"),
      statusLabel: loading ? "…" : status?.email.verified ? t("security.verified", "Verified") : t("security.unverified", "Unverified"),
      tone: status?.email.verified ? "success" : "warning",
      description: maskEmail(email) ?? "No email on file",
    },
    {
      key: "phone",
      icon: Phone,
      title: t("security.phone", "Phone Number"),
      statusLabel: loading
        ? "…"
        : !phone
          ? t("security.notAdded", "Not added")
          : status?.phone.verified
            ? t("security.verified", "Verified")
            : t("security.unverified", "Unverified"),
      tone: !phone ? "primary" : status?.phone.verified ? "success" : "warning",
      description: phone ? (maskPhone(phone) ?? phone) : t("security.addPhoneAlerts", "Add a phone number for alerts"),
    },
    {
      key: "password",
      icon: Lock,
      title: t("security.password", "Account Password"),
      statusLabel: loading
        ? "…"
        : status?.passwordLastChangedAt
          ? relativeTime(status.passwordLastChangedAt)
          : t("security.neverChanged", "Never changed"),
      tone: "muted",
      description: t("security.updatePasswordRegularly", "Update your account password regularly"),
    },
    {
      key: "2fa",
      icon: ShieldOff,
      title: t("security.twoFactor", "Two-Factor Authentication"),
      statusLabel: loading ? "…" : is2FAEnabled ? t("security.enabled", "Enabled") : t("security.disabled", "Disabled"),
      tone: is2FAEnabled ? "success" : "warning",
      description: is2FAEnabled
        ? t("security.protectedWithApp", "Protected with an authenticator app (TOTP)")
        : t("security.extraLayerProtection", "Add an extra layer of protection to your account"),
    },
  ];

  return (
    <Panel
      eyebrow={t("security.accessProtection", "Access & Protection")}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4 text-primary" />
          {t("security.controls", "Account Security Controls")}
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {widgets.map((w) => (
          <SectionWidget
            key={w.key}
            icon={w.icon}
            title={w.title}
            statusLabel={w.statusLabel}
            tone={w.tone}
            description={w.description}
            onManage={() => setOpen(w.key)}
          />
        ))}
      </div>

      <Dialog open={open === "email"} onOpenChange={(o) => setOpen(o ? "email" : null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage email</DialogTitle>
          <EmailSection email={email} status={status} loading={loading} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === "phone"} onOpenChange={(o) => setOpen(o ? "phone" : null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage phone number</DialogTitle>
          <PhoneSection status={status} loading={loading} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === "password"} onOpenChange={(o) => setOpen(o ? "password" : null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Change password</DialogTitle>
          <PasswordSection lastChangedAt={status?.passwordLastChangedAt} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === "2fa"} onOpenChange={(o) => setOpen(o ? "2fa" : null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage two-factor authentication</DialogTitle>
          <TwoFactorSection status={status} loading={loading} />
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// ─── Password Section (Modal Content) ─────────────────────────────────────────
function PasswordSection({ lastChangedAt }: { lastChangedAt?: string | null }) {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const qc = useQueryClient();

  const changePassword = async () => {
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast.success("Password changed", {
        description: "You may need to log in again on other devices.",
      });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      qc.invalidateQueries({ queryKey: ["security-status"] });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to change password.";
      setPwError(message);
      toast.error("Couldn't change password", { description: message });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Panel
      eyebrow="Password"
      title={
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          Change Password
        </span>
      }
      action={
        lastChangedAt ? (
          <span className="text-xs text-muted-foreground">
            Last changed {relativeTime(lastChangedAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No password history yet</span>
        )
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={pwForm.currentPassword}
          onChange={(e) => setPwForm((v) => ({ ...v, currentPassword: e.target.value }))}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          value={pwForm.newPassword}
          onChange={(e) => setPwForm((v) => ({ ...v, newPassword: e.target.value }))}
        />
        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={pwForm.confirm}
          onChange={(e) => setPwForm((v) => ({ ...v, confirm: e.target.value }))}
        />
      </div>
      {pwError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {pwError}
        </p>
      )}
      <div className="flex justify-end items-center gap-2 mt-4">
        <button
          onClick={changePassword}
          disabled={pwSaving}
          className="w-full sm:w-auto aurora text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-transform active:scale-[0.98] cursor-pointer"
        >
          {pwSaving && <Loader2 className="size-3.5 animate-spin" />} Update password
        </button>
      </div>
    </Panel>
  );
}

// ─── Email Section (Modal Content) ────────────────────────────────────────────
function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (targetMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  if (targetMs === null) return 0;
  return Math.max(0, Math.ceil((targetMs - now) / 1000));
}

function EmailSection({
  email,
  status,
  loading,
}: {
  email?: string;
  status?: SecurityStatus;
  loading: boolean;
}) {
  const { refreshUser } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const secondsLeft = useCountdown(cooldownUntil);

  const isVerified = status?.email.verified ?? false;

  const extractError = (err: unknown) => {
    const res = (
      err as {
        response?: { status?: number; data?: { message?: string; data?: Record<string, number> } };
      }
    )?.response;
    return {
      status: res?.status,
      message: res?.data?.message ?? "Something went wrong.",
      data: res?.data?.data,
    };
  };

  const reset = () => {
    setEditing(false);
    setNewEmail("");
    setOtpSent(false);
    setOtp("");
    setErrorMsg("");
    setAttemptsRemaining(null);
    setCooldownUntil(null);
  };

  const sendMutation = useMutation({
    mutationFn: (target: string) => securityApi.sendEmailChangeOtp(target),
    onSuccess: () => {
      setOtpSent(true);
      setErrorMsg("");
      setAttemptsRemaining(null);
      toast.success("Verification code sent", {
        description: `Check your inbox at ${newEmail}.`,
      });
    },
    onError: (err: unknown) => {
      const { status, message, data } = extractError(err);
      if (status === 429 && data?.retryAfterSeconds) {
        setCooldownUntil(Date.now() + data.retryAfterSeconds * 1000);
      }
      setErrorMsg(message);
      toast.error("Couldn't send code", { description: message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) => securityApi.verifyEmailChangeOtp(newEmail, code),
    onSuccess: async () => {
      toast.success("Email updated", { description: `Your email is now ${newEmail}.` });
      reset();
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["security-status"] });
    },
    onError: (err: unknown) => {
      const { message, data } = extractError(err);
      setErrorMsg(message);
      if (typeof data?.attemptsRemaining === "number") {
        setAttemptsRemaining(data.attemptsRemaining);
      } else {
        setOtpSent(false);
        setOtp("");
        setAttemptsRemaining(null);
      }
      toast.error("Verification failed", { description: message });
    },
  });

  return (
    <Panel
      eyebrow="Email"
      title={
        <span className="inline-flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          Email Address
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card/30 p-3.5">
          <div>
            <div className="text-xs text-muted-foreground">Current email address</div>
            <div className="text-sm font-semibold mt-0.5">{email ?? "—"}</div>
          </div>
          {!loading && (
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone={isVerified ? "success" : "warning"}>
                {isVerified ? "Verified" : "Unverified"}
              </Pill>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  Change email
                </button>
              )}
            </div>
          )}
        </div>

        {editing && !otpSent && (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter your new email address. We'll send a 6-digit verification code to confirm it.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <Field
                  label="New email address"
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={reset}
                  className="rounded-lg px-3 py-2 text-sm border border-border hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendMutation.mutate(newEmail)}
                  disabled={sendMutation.isPending || !newEmail || secondsLeft > 0}
                  className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {sendMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {secondsLeft > 0 ? `Wait ${secondsLeft}s` : "Send code"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editing && otpSent && (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to <strong className="text-foreground">{newEmail}</strong>
              .
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-[180px]">
                <Field
                  label="Verification code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="tracking-[0.3em] font-mono text-center"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => sendMutation.mutate(newEmail)}
                  disabled={sendMutation.isPending || secondsLeft > 0}
                  className="rounded-lg px-3 py-2 text-sm font-medium border border-border hover:bg-accent cursor-pointer"
                >
                  {secondsLeft > 0 ? `Resend (${secondsLeft}s)` : "Resend code"}
                </button>
                <button
                  onClick={() => verifyMutation.mutate(otp)}
                  disabled={verifyMutation.isPending || otp.length !== 6}
                  className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {verifyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Verify
                </button>
              </div>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-destructive mt-2" role="alert">
            {errorMsg}
            {typeof attemptsRemaining === "number" && attemptsRemaining > 0
              ? ` (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left)`
              : ""}
          </p>
        )}
      </div>
    </Panel>
  );
}

// ─── Phone Section (Modal Content) ────────────────────────────────────────────
function PhoneSection({ status, loading }: { status?: SecurityStatus; loading: boolean }) {
  const { user, updateProfile, refreshUser } = useAuth();
  const qc = useQueryClient();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [smsSent, setSmsSent] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const secondsLeft = useCountdown(cooldownUntil);

  const isVerified = status?.phone.verified ?? false;
  const hasPhone = Boolean(user?.phone);
  const msg91Active = isMsg91Configured();

  useEffect(() => {
    if (msg91Active) {
      void loadMsg91Sdk();
    }
  }, [msg91Active]);

  const extractError = (err: unknown) => {
    const res = (
      err as {
        response?: { status?: number; data?: { message?: string; data?: Record<string, number> } };
      }
    )?.response;
    return {
      status: res?.status,
      message: res?.data?.message ?? (err instanceof Error ? err.message : "Something went wrong."),
      data: res?.data?.data,
    };
  };

  const resetVerify = () => {
    setVerifyMode(false);
    setOtpRequested(false);
    setOtp("");
    setSmsSent(null);
    setErrorMsg("");
    setAttemptsRemaining(null);
    setCooldownUntil(null);
  };

  const savePhone = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone });
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["security-status"] });
      resetVerify();
      toast.success("Phone number updated", {
        description: phone ? "Your number was saved. You'll need to verify it." : "Phone number removed.",
      });
    } catch (err: unknown) {
      const { message } = extractError(err);
      toast.error("Couldn't update phone", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const targetPhone = user?.phone || phone;
      if (!targetPhone) {
        throw new Error("No phone number on file. Please enter and save a phone number first.");
      }

      if (msg91Active) {
        try {
          const res = await sendMsg91Otp(targetPhone);
          return { smsSent: true, msg91: true, data: res };
        } catch (msg91Err: any) {
          // If client-side MSG91 SDK call fails, attempt fallback to backend OTP endpoint
          console.warn("[MSG91] sendOtp error, attempting backend fallback:", msg91Err);
          const res = await securityApi.sendPhoneVerificationOtp();
          return { smsSent: res.data.smsSent, msg91: false, data: res.data };
        }
      } else {
        const res = await securityApi.sendPhoneVerificationOtp();
        return { smsSent: res.data.smsSent, msg91: false, data: res.data };
      }
    },
    onSuccess: (res) => {
      setOtpRequested(true);
      setSmsSent(res.smsSent);
      setErrorMsg("");
      setAttemptsRemaining(null);
      setCooldownUntil(Date.now() + 60_000);
      toast.success("Verification code sent", {
        description: `Code sent to ${user?.phone || phone}`,
      });
    },
    onError: (err: unknown) => {
      const { status, message, data } = extractError(err);
      if (status === 429 && data?.retryAfterSeconds) {
        setCooldownUntil(Date.now() + data.retryAfterSeconds * 1000);
      }
      setErrorMsg(message);
      toast.error("Couldn't request code", { description: message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      if (msg91Active) {
        // 1. Verify via MSG91 SDK to obtain verification access token
        const result = await verifyMsg91Otp(code);
        const accessToken = result.accessToken;

        // 2. Send token to backend to validate via https://control.msg91.com/api/v5/widget/verifyAccessToken
        return securityApi.verifyPhoneVerificationOtp({
          accessToken,
          otp: code,
        });
      } else {
        return securityApi.verifyPhoneVerificationOtp(code);
      }
    },
    onSuccess: async () => {
      toast.success("Phone verified", { description: "Your phone number is now verified." });
      resetVerify();
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["security-status"] });
    },
    onError: (err: unknown) => {
      const { message, data } = extractError(err);
      setErrorMsg(message);
      if (typeof data?.attemptsRemaining === "number") {
        setAttemptsRemaining(data.attemptsRemaining);
      } else {
        setAttemptsRemaining(null);
      }
      toast.error("Verification failed", { description: message });
    },
  });

  const handleResend = async () => {
    if (secondsLeft > 0 || sendOtpMutation.isPending) return;

    if (msg91Active) {
      try {
        await retryMsg91Otp(user?.phone || phone);
        setCooldownUntil(Date.now() + 60_000);
        setErrorMsg("");
        toast.success("Verification code resent", {
          description: `A new code was sent to ${user?.phone || phone}`,
        });
      } catch (err: unknown) {
        // If retryOtp failed, fallback to sendOtp mutation
        sendOtpMutation.mutate();
      }
    } else {
      sendOtpMutation.mutate();
    }
  };

  return (
    <Panel
      eyebrow="Phone"
      title={
        <span className="inline-flex items-center gap-2">
          <Phone className="size-4 text-primary" />
          Phone Number
        </span>
      }
    >
      {!hasPhone && !loading && (
        <p className="text-xs text-muted-foreground mb-3 inline-flex items-center gap-1.5">
          <Inbox className="size-3.5" /> No phone number on file yet.
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Field
            label="Phone number"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
          />
        </div>
        {!loading && hasPhone && (
          <Pill tone={isVerified ? "success" : "warning"}>
            {isVerified ? "Verified" : "Unverified"}
          </Pill>
        )}
        <button
          onClick={savePhone}
          disabled={saving || phone === (user?.phone ?? "")}
          className="w-full sm:w-auto aurora text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shrink-0"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />} Update phone
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Changing your phone number resets its verification status.
      </p>

      {hasPhone && !isVerified && !loading && !verifyMode && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-warning/5 border border-warning/20 p-3">
          <p className="text-xs text-muted-foreground">Your phone number is not verified yet.</p>
          <button
            onClick={() => setVerifyMode(true)}
            className="w-full sm:w-auto text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            Verify phone
          </button>
        </div>
      )}

      {verifyMode && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {msg91Active ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground flex items-center gap-2">
              <PhoneCall className="size-4 text-primary shrink-0" />
              <span>A 6-digit verification code will be sent to your phone number via SMS.</span>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              SMS delivery is not currently configured on this platform. To verify your phone, an
              administrator must provide you with a verification code directly.
            </div>
          )}

          {!otpRequested ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs text-muted-foreground flex-1">
                Request a verification code for{" "}
                <span className="font-medium text-foreground">{user?.phone}</span>.
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={resetVerify}
                  className="rounded-lg px-3 py-2 text-sm border border-border hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending || secondsLeft > 0}
                  className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {sendOtpMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {secondsLeft > 0 ? `Retry in ${secondsLeft}s` : "Request code"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {smsSent === false && !msg91Active && (
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code provided by your administrator.
                </p>
              )}
              {msg91Active && (
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit verification code sent to {user?.phone || phone}.
                </p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 max-w-[180px]">
                  <Field
                    label="Verification code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="tracking-[0.3em] font-mono text-center"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleResend}
                    disabled={sendOtpMutation.isPending || secondsLeft > 0}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium border border-border hover:bg-accent cursor-pointer"
                  >
                    {secondsLeft > 0 ? `Resend (${secondsLeft}s)` : "Resend"}
                  </button>
                  <button
                    onClick={() => verifyMutation.mutate(otp)}
                    disabled={verifyMutation.isPending || otp.length !== 6}
                    className="aurora text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {verifyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Verify
                  </button>
                </div>
              </div>
              <button onClick={resetVerify} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-destructive" role="alert">
              {errorMsg}
              {typeof attemptsRemaining === "number" && attemptsRemaining > 0
                ? ` (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left)`
                : ""}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

// ─── Two-Factor Authentication Section (Modal Content) ────────────────────────
function TwoFactorSection({ status, loading }: { status?: SecurityStatus; loading: boolean }) {
  const qc = useQueryClient();
  const is2FAEnabled = status?.twoFactorAuthentication === "ENABLED";

  const { data: tfaStatus } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => securityApi.getTwoFactorStatus().then((r) => r.data),
    enabled: is2FAEnabled,
    staleTime: 30_000,
    throwOnError: false,
  });

  type SetupStep = "idle" | "password" | "qr" | "codes";
  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupData, setSetupData] = useState<{
    displayKey: string;
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [setupError, setSetupError] = useState("");

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableUseRecovery, setDisableUseRecovery] = useState(false);
  const [disableError, setDisableError] = useState("");

  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenCodes, setRegenCodes] = useState<string[]>([]);
  const [regenError, setRegenError] = useState("");

  const extractMsg = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    "Something went wrong.";

  const resetSetup = () => {
    setSetupStep("idle");
    setSetupPassword("");
    setSetupData(null);
    setSetupCode("");
    setRecoveryCodes([]);
    setSetupError("");
  };

  const initMutation = useMutation({
    mutationFn: (pw: string) => securityApi.initiateTwoFactorSetup(pw),
    onSuccess: (res) => {
      setSetupData({
        displayKey: res.data.displayKey,
        secret: res.data.secret,
        qrCodeDataUrl: res.data.qrCodeDataUrl,
      });
      setSetupStep("qr");
      setSetupError("");
    },
    onError: (err: unknown) => setSetupError(extractMsg(err)),
  });

  const verifySetupMutation = useMutation({
    mutationFn: (code: string) => securityApi.verifyTwoFactorSetup(code),
    onSuccess: (res) => {
      setRecoveryCodes(res.data.recoveryCodes);
      setSetupStep("codes");
      qc.invalidateQueries({ queryKey: ["security-status"] });
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("2FA enabled!");
    },
    onError: (err: unknown) => {
      setSetupError(extractMsg(err));
      toast.error("Verification failed", { description: extractMsg(err) });
    },
  });

  const disableMutation = useMutation({
    mutationFn: () =>
      securityApi.disableTwoFactor(disablePassword, disableCode, disableUseRecovery),
    onSuccess: () => {
      setDisableOpen(false);
      setDisablePassword("");
      setDisableCode("");
      qc.invalidateQueries({ queryKey: ["security-status"] });
      toast.success("2FA disabled");
    },
    onError: (err: unknown) => setDisableError(extractMsg(err)),
  });

  const regenMutation = useMutation({
    mutationFn: () => securityApi.regenerateRecoveryCodes(regenPassword),
    onSuccess: (res) => {
      setRegenCodes(res.data.recoveryCodes);
      setRegenPassword("");
      setRegenError("");
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("Recovery codes regenerated");
    },
    onError: (err: unknown) => setRegenError(extractMsg(err)),
  });

  return (
    <Panel
      eyebrow="Two-factor authentication"
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldOff className="size-4 text-primary" />
          Two-Factor Authentication
        </span>
      }
    >
      {setupStep === "idle" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <div className="text-sm font-semibold">Authenticator app (TOTP)</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {is2FAEnabled
                ? "Your account is protected by two-factor authentication."
                : "Require a verification code from your authenticator app at login."}
            </div>
          </div>
          {!loading && (
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone={is2FAEnabled ? "success" : "muted"}>
                {is2FAEnabled ? "Enabled" : "Disabled"}
              </Pill>
              {!is2FAEnabled ? (
                <button
                  onClick={() => setSetupStep("password")}
                  className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  Enable 2FA
                </button>
              ) : (
                <button
                  onClick={() => setDisableOpen(true)}
                  className="text-xs font-semibold text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/5 transition-colors cursor-pointer"
                >
                  Disable 2FA
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {setupStep === "password" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Confirm your password to continue setting up two-factor authentication.
          </p>
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
          />
          {setupError && (
            <p className="text-xs text-destructive" role="alert">
              {setupError}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetSetup}
              className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-accent transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => initMutation.mutate(setupPassword)}
              disabled={initMutation.isPending || !setupPassword}
              className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {initMutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Continue
            </button>
          </div>
        </div>
      )}

      {setupStep === "qr" && setupData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium">Scan with your authenticator app</p>
            <p className="text-xs text-muted-foreground">
              Open Google Authenticator, Authy, or Microsoft Authenticator and scan this code — or
              enter the setup key manually.
            </p>
            <div className="flex justify-center py-2">
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="Scan this QR code with your authenticator app"
                  width={200}
                  height={200}
                  className="block size-[200px]"
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Manual setup key</p>
              <p className="font-mono text-sm tracking-widest break-all text-primary select-all">
                {setupData.displayKey}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Account name: <strong>GreenGuard AI</strong> · Algorithm: SHA1 · Period: 30s · Digits: 6
            </p>
          </div>
          <Field
            label="Enter the 6-digit code from your app"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={setupCode}
            onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="tracking-[0.3em] font-mono text-center text-lg max-w-[160px]"
          />
          {setupError && (
            <p className="text-xs text-destructive" role="alert">
              {setupError}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetSetup}
              className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-accent cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => verifySetupMutation.mutate(setupCode)}
              disabled={verifySetupMutation.isPending || setupCode.length !== 6}
              className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {verifySetupMutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Verify
              &amp; Enable
            </button>
          </div>
        </div>
      )}

      {setupStep === "codes" && recoveryCodes.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Save your recovery codes
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              These codes will only be shown once. Store them somewhere safe — they let you sign in
              if you lose access to your authenticator app.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((c) => (
              <div
                key={c}
                className="font-mono text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 text-center select-all tracking-widest"
              >
                {c}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => downloadRecoveryCodes(recoveryCodes)}
              className="rounded-lg px-3 py-2 text-xs font-medium border border-border hover:bg-accent cursor-pointer"
            >
              Download .txt
            </button>
            <button
              onClick={() => printRecoveryCodes(recoveryCodes)}
              className="rounded-lg px-3 py-2 text-xs font-medium border border-border hover:bg-accent cursor-pointer"
            >
              Print
            </button>
            <button
              onClick={resetSetup}
              className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
            >
              Done — I've saved these codes
            </button>
          </div>
        </div>
      )}

      {is2FAEnabled && setupStep === "idle" && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Recovery codes</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {tfaStatus?.backupCodesGeneratedAt
                  ? `Last generated ${relativeTime(tfaStatus.backupCodesGeneratedAt)}`
                  : "Used to sign in if you lose your authenticator."}
              </div>
            </div>
            {!regenOpen && !regenCodes.length && (
              <button
                onClick={() => setRegenOpen(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer px-1 shrink-0"
              >
                Regenerate
              </button>
            )}
          </div>
          {regenOpen && !regenCodes.length && (
            <div className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">
                Enter your password to regenerate recovery codes. This will invalidate all existing
                unused codes.
              </p>
              <Field
                label="Current password"
                type="password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
              />
              {regenError && (
                <p className="text-xs text-destructive" role="alert">
                  {regenError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRegenOpen(false);
                    setRegenPassword("");
                    setRegenError("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm border border-border hover:bg-accent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => regenMutation.mutate()}
                  disabled={regenMutation.isPending || !regenPassword}
                  className="aurora text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {regenMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}{" "}
                  Regenerate
                </button>
              </div>
            </div>
          )}
          {regenCodes.length > 0 && (
            <div className="space-y-3 mt-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  New recovery codes — save these now. Old codes are no longer valid.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {regenCodes.map((c) => (
                  <div
                    key={c}
                    className="font-mono text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 text-center select-all tracking-widest"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => downloadRecoveryCodes(regenCodes)}
                  className="rounded-lg px-3 py-2 text-xs font-medium border border-border hover:bg-accent cursor-pointer"
                >
                  Download .txt
                </button>
                <button
                  onClick={() => printRecoveryCodes(regenCodes)}
                  className="rounded-lg px-3 py-2 text-xs font-medium border border-border hover:bg-accent cursor-pointer"
                >
                  Print
                </button>
                <button
                  onClick={() => {
                    setRegenOpen(false);
                    setRegenCodes([]);
                    qc.invalidateQueries({ queryKey: ["2fa-status"] });
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disable 2FA AlertDialog */}
      <AlertDialog
        open={disableOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDisablePassword("");
            setDisableCode("");
            setDisableError("");
            setDisableUseRecovery(false);
          }
          setDisableOpen(open);
        }}
      >
        <AlertDialogContent className="glass border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Enter your password and current authenticator code (or a recovery code) to disable
                  2FA.
                </p>
                <Field
                  label="Current password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => {
                    setDisablePassword(e.target.value);
                    setDisableError("");
                  }}
                />
                <Field
                  label={disableUseRecovery ? "Recovery code" : "Authenticator code"}
                  type="text"
                  inputMode={disableUseRecovery ? undefined : "numeric"}
                  maxLength={disableUseRecovery ? 14 : 6}
                  value={disableCode}
                  onChange={(e) => {
                    setDisableCode(
                      disableUseRecovery
                        ? e.target.value.toUpperCase()
                        : e.target.value.replace(/\D/g, "").slice(0, 6),
                    );
                    setDisableError("");
                  }}
                  className={!disableUseRecovery ? "tracking-[0.25em] font-mono text-center" : ""}
                />
                <button
                  type="button"
                  onClick={() => {
                    setDisableUseRecovery((v) => !v);
                    setDisableCode("");
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {disableUseRecovery
                    ? "Use authenticator code instead"
                    : "Use a recovery code instead"}
                </button>
                {disableError && (
                  <p className="text-xs text-destructive" role="alert">
                    {disableError}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableMutation.isPending}>Cancel</AlertDialogCancel>
            <button
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending || !disablePassword || !disableCode}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer",
              )}
            >
              {disableMutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Disable
              2FA
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

// ─── Active Sessions Section ──────────────────────────────────────────────────
function SessionCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
      <Skeleton className="size-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onRevoke,
  revoking,
}: {
  session: SecuritySession;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const Icon = deviceIcon(session.device);
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
        session.isCurrentSession
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border hover:border-primary/20 bg-background/50",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-xl glass grid place-items-center shrink-0">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold inline-flex flex-wrap items-center gap-2">
            <span className="truncate">
              {session.browser ?? "Unknown browser"} on {session.os ?? "Unknown OS"}
            </span>
            {session.isCurrentSession && <Pill tone="primary">Current device</Pill>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {session.ip && <span>{session.ip}</span>}
            {session.location && <span>{session.location}</span>}
            <span title={fullTimestamp(session.createdAt)}>
              Login {relativeTime(session.createdAt)}
            </span>
            <span title={fullTimestamp(session.lastActive)}>
              Active {relativeTime(session.lastActive)}
            </span>
          </div>
        </div>
      </div>
      {!session.isCurrentSession && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={revoking}
              aria-label={`Revoke session on ${session.browser ?? "unknown browser"}`}
              className="w-full sm:w-auto shrink-0 text-xs font-semibold text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Revoke
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
              <AlertDialogDescription>
                {session.browser ?? "This device"} on {session.os ?? "unknown OS"} will be signed
                out immediately and will need to log in again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={onRevoke}
              >
                Revoke session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function SessionsSection() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["security-sessions"],
    queryFn: () => securityApi.getSessions().then((r) => r.data.sessions),
    staleTime: 10_000,
    throwOnError: false,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => securityApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success("Session revoked");
      qc.invalidateQueries({ queryKey: ["security-sessions"] });
      qc.invalidateQueries({ queryKey: ["security-status"] });
    },
    onError: (err: unknown) => {
      toast.error("Couldn't revoke session", {
        description: (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message,
      });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => securityApi.logoutAllOtherSessions(),
    onSuccess: (res) => {
      toast.success("Logged out of other sessions", {
        description: `${res.data.revokedCount} session(s) revoked.`,
      });
      qc.invalidateQueries({ queryKey: ["security-sessions"] });
      qc.invalidateQueries({ queryKey: ["security-status"] });
    },
    onError: (err: unknown) => {
      toast.error("Couldn't log out other sessions", {
        description: (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message,
      });
    },
  });

  const current = sessions?.find((s) => s.isCurrentSession);
  const others = sessions?.filter((s) => !s.isCurrentSession) ?? [];
  const preview = current ? [current, ...others.slice(0, 2)] : others.slice(0, 3);
  const hiddenCount = (sessions?.length ?? 0) - preview.length;

  const logoutAllButton = (
    <button
      onClick={() => logoutAllMutation.mutate()}
      disabled={logoutAllMutation.isPending || (sessions?.length ?? 0) <= 1}
      className="w-full sm:w-auto glass rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors hover:bg-accent cursor-pointer"
    >
      {logoutAllMutation.isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <LogOut className="size-3.5" />
      )}
      {t("security.logOutOtherSessions", "Log out other sessions")}
    </button>
  );

  return (
    <Panel
      eyebrow={t("security.deviceAccess", "Device Access")}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <Monitor className="size-4 text-primary" />
          {t("security.activeSessions", "Active Sessions")}
          {!isLoading && !isError && (
            <span className="text-xs font-normal text-muted-foreground">
              ({sessions?.length ?? 0})
            </span>
          )}
        </span>
      }
      action={logoutAllButton}
    >
      <div className="space-y-2.5">
        {isError && <ErrorState text="Couldn't load your sessions." onRetry={refetch} />}
        {!isError && isLoading && (
          <>
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </>
        )}
        {!isError && !isLoading && sessions?.length === 0 && (
          <EmptyState icon={Monitor} text="No active sessions." />
        )}
        {!isError &&
          preview.map((s) => (
            <SessionCard
              key={s.sessionId}
              session={s}
              revoking={revokeMutation.isPending}
              onRevoke={() => revokeMutation.mutate(s.sessionId)}
            />
          ))}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setViewAllOpen(true)}
          className="mt-3 text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          {t("security.viewAllSessions", { count: sessions?.length, defaultValue: `View all ${sessions?.length} sessions` })} <ChevronRight className="size-3.5" />
        </button>
      )}

      <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
        <DialogContent className="glass border-border sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Monitor className="size-4 text-primary" />
              {t("security.activeSessions", "All Active Sessions")}
            </DialogTitle>
            <DialogDescription>Every device currently signed in to your account.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto space-y-2 pr-1 -mr-1">
            {sessions?.map((s) => (
              <SessionCard
                key={s.sessionId}
                session={s}
                revoking={revokeMutation.isPending}
                onRevoke={() => revokeMutation.mutate(s.sessionId)}
              />
            ))}
          </div>
          <div className="pt-2 border-t border-border">{logoutAllButton}</div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// ─── Login History Section ────────────────────────────────────────────────────
function LoginHistoryRow({ h }: { h: LoginHistoryEntry }) {
  const Icon = deviceIcon(h.device);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/50 p-3.5 transition-colors hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-xl glass grid place-items-center shrink-0">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            {h.browser ?? "Unknown browser"} on {h.os ?? "Unknown OS"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span title={fullTimestamp(h.createdAt)}>
              {formatDateOnly(h.createdAt)} · {formatTimeLabel(h.createdAt)}
            </span>
            <span>{relativeTime(h.createdAt)}</span>
            {h.location && <span>{h.location}</span>}
            {h.ip && <span>{h.ip}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        {h.loginStatus === "SUCCESS" ? (
          <CheckCircle className="size-4 text-success" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
        <Pill tone={h.loginStatus === "SUCCESS" ? "success" : "destructive"}>
          {h.loginStatus === "SUCCESS" ? "Success" : "Failed"}
        </Pill>
      </div>
    </div>
  );
}

function LoginHistorySection() {
  const { t } = useTranslation("settings");
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [filter, setFilter] = useState<LoginHistoryFilter>("all");
  const [page, setPage] = useState(1);

  const previewQuery = useQuery({
    queryKey: ["security-history-preview"],
    queryFn: () => securityApi.getLoginHistory(1, 3, "all").then((r) => r.data),
    staleTime: 10_000,
    throwOnError: false,
  });

  const fullQuery = useQuery({
    queryKey: ["security-history", page, filter],
    queryFn: () => securityApi.getLoginHistory(page, 10, filter).then((r) => r.data),
    staleTime: 10_000,
    throwOnError: false,
    enabled: viewAllOpen,
  });

  const filters: { id: LoginHistoryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "successful", label: "Successful" },
    { id: "failed", label: "Failed" },
  ];

  const { data, isLoading, isError, refetch } = previewQuery;
  const totalCount = data?.pagination.total ?? 0;

  return (
    <Panel
      eyebrow={t("security.auditLog", "Audit Log")}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <History className="size-4 text-primary" />
          {t("security.loginHistory", "Login History")}
          {!isLoading && !isError && totalCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({totalCount})</span>
          )}
        </span>
      }
    >
      <div className="space-y-2.5">
        {isError && <ErrorState text="Couldn't load your login history." onRetry={refetch} />}
        {!isError && isLoading && (
          <>
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </>
        )}
        {!isError && !isLoading && data?.history.length === 0 && (
          <EmptyState icon={History} text="No login history yet." />
        )}
        {!isError && data?.history.map((h, i) => <LoginHistoryRow key={i} h={h} />)}
      </div>

      {totalCount > (data?.history.length ?? 0) && (
        <button
          onClick={() => setViewAllOpen(true)}
          className="mt-3 text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          {t("security.viewAllLogins", { count: totalCount, defaultValue: `View all ${totalCount} logins` })} <ChevronRight className="size-3.5" />
        </button>
      )}

      <Dialog
        open={viewAllOpen}
        onOpenChange={(o) => {
          setViewAllOpen(o);
          if (!o) setPage(1);
        }}
      >
        <DialogContent className="glass border-border sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <History className="size-4 text-primary" />
              {t("security.loginHistory", "Login History")}
            </DialogTitle>
            <DialogDescription>Every recorded sign-in attempt for your account.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                aria-pressed={filter === f.id}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                  filter === f.id
                    ? "border-primary text-primary bg-primary/10 font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 -mr-1">
            {fullQuery.isError && (
              <ErrorState text="Couldn't load your login history." onRetry={fullQuery.refetch} />
            )}
            {!fullQuery.isError && fullQuery.isLoading && (
              <>
                <SessionCardSkeleton />
                <SessionCardSkeleton />
              </>
            )}
            {!fullQuery.isError && !fullQuery.isLoading && fullQuery.data?.history.length === 0 && (
              <EmptyState icon={History} text="No login history yet." />
            )}
            {!fullQuery.isError &&
              fullQuery.data?.history.map((h, i) => <LoginHistoryRow key={i} h={h} />)}
          </div>

          {fullQuery.data && fullQuery.data.pagination.pages > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-border text-xs text-muted-foreground">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40 hover:text-foreground transition-colors cursor-pointer"
              >
                ← Previous
              </button>
              <span>
                Page {fullQuery.data.pagination.page} of {fullQuery.data.pagination.pages}
              </span>
              <button
                disabled={page >= fullQuery.data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40 hover:text-foreground transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// ─── Recent Security Activity Section ─────────────────────────────────────────
function ActivityRow({ e }: { e: SecurityEventEntry }) {
  const meta = EVENT_META[e.action] ?? {
    icon: Activity,
    label: e.action.replaceAll("_", " ").toLowerCase(),
  };
  const Icon = meta.icon;
  const failed = e.result === "FAILURE";
  return (
    <li className="ml-6 relative pb-4 last:pb-0">
      <span
        className={cn(
          "absolute -left-[31px] top-0 size-6 rounded-full grid place-items-center border-2 border-background shadow-xs",
          failed ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="size-3" />
      </span>
      <div className="text-sm font-semibold capitalize text-foreground">{meta.label}</div>
      <div className="text-xs text-muted-foreground mt-0.5" title={fullTimestamp(e.timestamp)}>
        {relativeTime(e.timestamp)}
        {e.device ? ` · ${e.device}` : ""}
      </div>
    </li>
  );
}

function RecentActivitySection() {
  const { t } = useTranslation("settings");
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [page, setPage] = useState(1);

  const previewQuery = useQuery({
    queryKey: ["security-events-preview"],
    queryFn: () => securityApi.getSecurityEvents(1, 4).then((r) => r.data),
    staleTime: 15_000,
    throwOnError: false,
  });

  const fullQuery = useQuery({
    queryKey: ["security-events", page],
    queryFn: () => securityApi.getSecurityEvents(page, 10).then((r) => r.data),
    staleTime: 15_000,
    throwOnError: false,
    enabled: viewAllOpen,
  });

  const { data, isLoading, isError, refetch } = previewQuery;
  const totalCount = data?.pagination.total ?? 0;

  return (
    <Panel
      eyebrow={t("security.timeline", "Timeline")}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <Activity className="size-4 text-primary" />
          {t("security.recentActivity", "Recent Security Activity")}
          {!isLoading && !isError && totalCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({totalCount})</span>
          )}
        </span>
      }
    >
      {isError && <ErrorState text="Couldn't load recent security activity." onRetry={refetch} />}
      {!isError && isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-3.5 flex-1 max-w-xs" />
            </div>
          ))}
        </div>
      )}
      {!isError && !isLoading && data?.events.length === 0 && (
        <EmptyState icon={Activity} text="No recent security activity." />
      )}
      {!isError && !isLoading && data && data.events.length > 0 && (
        <ol className="relative border-l border-border/80 ml-3.5 space-y-1 my-2">
          {data.events.map((e, i) => (
            <ActivityRow key={i} e={e} />
          ))}
        </ol>
      )}

      {totalCount > (data?.events.length ?? 0) && (
        <button
          onClick={() => setViewAllOpen(true)}
          className="mt-3 text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          {t("security.viewAllEvents", { count: totalCount, defaultValue: `View all ${totalCount} events` })} <ChevronRight className="size-3.5" />
        </button>
      )}

      <Dialog
        open={viewAllOpen}
        onOpenChange={(o) => {
          setViewAllOpen(o);
          if (!o) setPage(1);
        }}
      >
        <DialogContent className="glass border-border sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              {t("security.recentActivity", "Recent Security Activity")}
            </DialogTitle>
            <DialogDescription>Every recorded security event on your account.</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 -mr-1">
            {fullQuery.isError && (
              <ErrorState
                text="Couldn't load recent security activity."
                onRetry={fullQuery.refetch}
              />
            )}
            {!fullQuery.isError && fullQuery.isLoading && (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 flex-1 max-w-xs" />
                  </div>
                ))}
              </div>
            )}
            {!fullQuery.isError && !fullQuery.isLoading && fullQuery.data?.events.length === 0 && (
              <EmptyState icon={Activity} text="No recent security activity." />
            )}
            {!fullQuery.isError &&
              !fullQuery.isLoading &&
              fullQuery.data &&
              fullQuery.data.events.length > 0 && (
                <ol className="relative border-l border-border/80 ml-3.5 space-y-1 my-2">
                  {fullQuery.data.events.map((e, i) => (
                    <ActivityRow key={i} e={e} />
                  ))}
                </ol>
              )}
          </div>

          {fullQuery.data && fullQuery.data.pagination.pages > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-border text-xs text-muted-foreground">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40 hover:text-foreground transition-colors cursor-pointer"
              >
                ← Previous
              </button>
              <span>
                Page {fullQuery.data.pagination.page} of {fullQuery.data.pagination.pages}
              </span>
              <button
                disabled={page >= fullQuery.data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40 hover:text-foreground transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// ─── Danger Zone Section ──────────────────────────────────────────────────────
function DangerZoneSection() {
  const { t } = useTranslation("settings");
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const deactivateMutation = useMutation({
    mutationFn: (pw: string) => securityApi.deactivateAccount(pw),
    onSuccess: async () => {
      toast.success("Account deactivated", {
        description: "You have been signed out of all devices.",
      });
      setOpen(false);
      await logout();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to deactivate account. Please try again.";
      setErrorMsg(message);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setErrorMsg("");
      deactivateMutation.reset();
    }
    setOpen(next);
  };

  const handleConfirm = () => {
    setErrorMsg("");
    deactivateMutation.mutate(password);
  };

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
          {t("security.destructiveAction", "Destructive Action")}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-base font-semibold text-destructive">
            <AlertTriangle className="size-4.5" />
            {t("security.deactivateAccount", "Deactivate Account")}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {t("security.deactivateDesc", "Deactivating your account will immediately revoke all active sessions and block further logins until restored by an administrator.")}
          </p>
        </div>

        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <button className="w-full sm:w-auto shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 cursor-pointer">
              {t("security.deactivateAccount", "Deactivate Account")}
            </button>
          </AlertDialogTrigger>

          <AlertDialogContent className="glass border-border sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="inline-flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" /> Deactivate your account?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>This action will:</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm">
                    <li>
                      Immediately sign you out of <strong>all active sessions</strong>
                    </li>
                    <li>Block you from logging in until an administrator restores access</li>
                    <li>Not permanently delete your data</li>
                  </ul>
                  <p className="text-xs sm:text-sm pt-1">
                    To confirm, enter your current password below.
                  </p>
                  <div className="pt-1">
                    <Field
                      label="Current password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg("");
                      }}
                      placeholder="Enter your password"
                      aria-label="Current password"
                    />
                    {errorMsg && (
                      <p className="mt-1.5 text-xs text-destructive" role="alert">
                        {errorMsg}
                      </p>
                    )}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
              <button
                onClick={handleConfirm}
                disabled={deactivateMutation.isPending || !password}
                className={cn(
                  buttonVariants({ variant: "destructive" }),
                  "inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer",
                )}
              >
                {deactivateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {t("security.deactivateAccount", "Deactivate account")}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
