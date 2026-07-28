import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Mail,
  MapPin,
  CalendarDays,
  Clock,
  ShieldCheck,
  ShieldX,
  Check,
  X,
  Power,
  PowerOff,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import type { AuthorityApprovalStatus } from "@/components/admin/authority-requests/authority-request-queries";
import type { DirectoryAuthority } from "./authority-directory-queries";

const APPROVAL_PILL_TONE: Record<AuthorityApprovalStatus, "success" | "warning" | "destructive"> = {
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

interface AuthorityDetailPanelProps {
  authority: DirectoryAuthority | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (authority: DirectoryAuthority) => void;
  onReject: (authority: DirectoryAuthority) => void;
  onActivate: (authority: DirectoryAuthority) => void;
  onDeactivate: (authority: DirectoryAuthority) => void;
}

/**
 * "Assigned Complaints" and "Active Session" (of the viewed authority, not
 * the admin's own) are intentionally absent — neither is available from
 * any existing endpoint (see this phase's Backend Gaps). Rather than a
 * near-empty "Authentication" section repeating facts already shown above,
 * this is one Account section with everything that's real, plus a short
 * note on what isn't tracked.
 */
export function AuthorityDetailPanel({
  authority,
  onOpenChange,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
}: AuthorityDetailPanelProps) {
  return (
    <Sheet open={!!authority} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {authority && (
          <>
            <SheetHeader>
              <SheetTitle>{authority.name}</SheetTitle>
              <SheetDescription>Authority account</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone={APPROVAL_PILL_TONE[authority.approvalStatus]}>
                  {authority.approvalStatus}
                </Pill>
                <Pill tone={authority.isActive ? "success" : "muted"}>
                  {authority.isActive ? "Active" : "Inactive"}
                </Pill>
              </div>

              <div className="space-y-4">
                <Field icon={Mail} label="Email" value={authority.email} />
                <Field icon={MapPin} label="City" value={authority.city || "Not provided"} />
                <Field
                  icon={CalendarDays}
                  label="Created"
                  value={format(new Date(authority.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <Field
                  icon={Clock}
                  label="Last Login"
                  value={
                    authority.lastLogin
                      ? format(new Date(authority.lastLogin), "MMMM d, yyyy 'at' h:mm a")
                      : "Never"
                  }
                />
                <Field
                  icon={authority.isVerified ? ShieldCheck : ShieldX}
                  label="Email Verification"
                  value={authority.isVerified ? "Verified" : "Unverified"}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Assigned complaints and active-session details for this account aren't tracked yet.
              </p>
            </div>

            {authority.approvalStatus === "pending" && (
              <div className="mt-8 space-y-2">
                <Button className="w-full" onClick={() => onApprove(authority)}>
                  <Check className="size-4 mr-1.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => onReject(authority)}
                >
                  <X className="size-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            )}

            {authority.approvalStatus === "approved" && (
              <div className="mt-8">
                {authority.isActive ? (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => onDeactivate(authority)}
                  >
                    <PowerOff className="size-4 mr-1.5" />
                    Deactivate Account
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => onActivate(authority)}>
                    <Power className="size-4 mr-1.5" />
                    Activate Account
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
