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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Pill } from "@/components/ui-bits";
import type { DirectoryRole, DirectoryUser } from "./user-directory-queries";

const ROLE_PILL_TONE: Record<DirectoryRole, "info" | "primary" | "muted"> = {
  citizen: "info",
  authority: "primary",
  administrator: "muted",
};

const APPROVAL_PILL_TONE: Record<
  DirectoryUser["approvalStatus"],
  "success" | "warning" | "destructive"
> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

interface UserDetailPanelProps {
  user: DirectoryUser | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only per Phase 2.4 scope — no edit/suspend/role-change actions here.
 * Only fields the User model actually has are shown; organization is
 * included alongside city/phone since it's part of the same "contact info"
 * the Phase 2.3 detail panel already surfaces for authority accounts.
 */
export function UserDetailPanel({ user, onOpenChange }: UserDetailPanelProps) {
  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {user && (
          <>
            <SheetHeader>
              <SheetTitle>{user.name}</SheetTitle>
              <SheetDescription>Platform user</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone={ROLE_PILL_TONE[user.role]}>{user.role}</Pill>
                {user.role === "authority" && (
                  <Pill tone={APPROVAL_PILL_TONE[user.approvalStatus]}>{user.approvalStatus}</Pill>
                )}
                <Pill tone={user.isActive ? "success" : "muted"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Pill>
              </div>

              <div className="space-y-4">
                <Field icon={Mail} label="Email" value={user.email} />
                <Field icon={Phone} label="Phone" value={user.phone || "Not provided"} />
                {(user.role === "authority" || user.organization) && (
                  <Field
                    icon={Building2}
                    label="Organization / Department"
                    value={user.organization || "Not provided"}
                  />
                )}
                <Field icon={MapPin} label="Assigned City" value={user.city || "Not provided"} />
                <Field
                  icon={CalendarDays}
                  label="Registration Date"
                  value={format(new Date(user.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <Field
                  icon={Clock}
                  label="Last Login"
                  value={
                    user.lastLogin
                      ? format(new Date(user.lastLogin), "MMMM d, yyyy 'at' h:mm a")
                      : "Never"
                  }
                />
                <Field
                  icon={user.isVerified ? ShieldCheck : ShieldX}
                  label="Email Verification"
                  value={user.isVerified ? "Verified" : "Unverified"}
                />
                <Field icon={Fingerprint} label="User ID" value={user._id} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
