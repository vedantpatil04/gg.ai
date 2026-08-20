import { useState } from "react";
import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  CalendarDays,
  Clock,
  ShieldCheck,
  ShieldX,
  Fingerprint,
  ArrowLeft,
  User,
  Crown,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";

function RoleBadge({ role }: { role: DirectoryRole }) {
  const config = {
    citizen: {
      label: "Citizen",
      icon: User,
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    authority: {
      label: "Authority Officer",
      icon: ShieldCheck,
      classes: "bg-primary/10 text-primary border-primary/25",
    },
    administrator: {
      label: "System Administrator",
      icon: Crown,
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
  }[role];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <Icon className="size-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

function ApprovalBadge({ status }: { status: DirectoryUser["approvalStatus"] }) {
  const config = {
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    },
    pending: {
      label: "Pending Verification",
      icon: Clock,
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    rejected: {
      label: "Rejected",
      icon: AlertCircle,
      classes: "bg-destructive/10 text-destructive border-destructive/25",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <Icon className="size-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

function AccountStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 select-none">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
        <span>Active Account</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/50 shrink-0 select-none">
      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      <span>Inactive Account</span>
    </span>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="size-7 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0 mt-0.5">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-bold tracking-[0.12em] text-muted-foreground/75">{label}</div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-foreground hover:text-primary transition-colors break-all underline decoration-border/60"
          >
            {value}
          </a>
        ) : (
          <div className="text-xs font-medium text-foreground break-words mt-0.5">{value}</div>
        )}
      </div>
    </div>
  );
}

interface UserDetailPanelProps {
  user: DirectoryUser | null;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailPanel({ user, onOpenChange }: UserDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6 bg-card border-l border-border/60">
        {user && (
          <div className="space-y-5">
            {/* Top Navigation */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 -ml-2 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to User Directory</span>
              </Button>
            </div>

            {/* Profile Header Banner */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/25 text-primary text-base font-bold grid place-items-center shrink-0 font-display shadow-2xs">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate font-display leading-tight">
                    {user.name}
                  </h2>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</div>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40">
                <RoleBadge role={user.role} />
                <AccountStatusBadge isActive={user.isActive} />
                {user.role === "authority" && <ApprovalBadge status={user.approvalStatus} />}
              </div>
            </div>

            {/* User ID Capsule */}
            <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-border/50 bg-muted/10">
              <div className="flex items-center gap-2 min-w-0">
                <Fingerprint className="size-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-muted-foreground truncate">{user._id}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyId(user._id)}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                {copied ? <Check className="size-3 text-emerald-500 mr-1" /> : <Copy className="size-3 mr-1" />}
                {copied ? "Copied" : "Copy ID"}
              </Button>
            </div>

            {/* Contact & Geography */}
            <div className="space-y-2">
              <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
                Contact &amp; Location
              </div>
              <div className="space-y-1.5">
                <DetailField icon={Mail} label="Email Address" value={user.email} href={`mailto:${user.email}`} />
                <DetailField
                  icon={Phone}
                  label="Phone Contact"
                  value={user.phone || "Not provided"}
                  href={user.phone ? `tel:${user.phone}` : undefined}
                />
                <DetailField icon={MapPin} label="Assigned Jurisdiction / City" value={user.city || "Unassigned"} />
                {(user.role === "authority" || user.organization) && (
                  <DetailField
                    icon={Building2}
                    label="Agency / Department"
                    value={user.organization || "Independent Inspector"}
                  />
                )}
              </div>
            </div>

            {/* Account Governance & Security */}
            <div className="space-y-2">
              <div className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 px-1">
                Governance &amp; Security
              </div>
              <div className="space-y-1.5">
                <DetailField
                  icon={user.isVerified ? ShieldCheck : ShieldX}
                  label="Email Verification"
                  value={user.isVerified ? "Verified (Cryptographic Proof)" : "Unverified Address"}
                />
                <DetailField
                  icon={CalendarDays}
                  label="Registration Date"
                  value={format(new Date(user.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <DetailField
                  icon={Clock}
                  label="Last Authentication"
                  value={
                    user.lastLogin
                      ? format(new Date(user.lastLogin), "MMMM d, yyyy 'at' h:mm a")
                      : "No login recorded"
                  }
                />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

