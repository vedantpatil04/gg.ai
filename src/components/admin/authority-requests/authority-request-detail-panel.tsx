import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  CalendarDays,
  ShieldCheck,
  ShieldX,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import type { AuthorityApprovalStatus, AuthorityRequest } from "./authority-request-queries";

const STATUS_PILL_TONE: Record<AuthorityApprovalStatus, "success" | "warning" | "destructive"> = {
  pending: "warning",
  approved: "success",
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

interface AuthorityRequestDetailPanelProps {
  request: AuthorityRequest | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (request: AuthorityRequest) => void;
  onReject: (request: AuthorityRequest) => void;
}

export function AuthorityRequestDetailPanel({
  request,
  onOpenChange,
  onApprove,
  onReject,
}: AuthorityRequestDetailPanelProps) {
  return (
    <Sheet open={!!request} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        {request && (
          <>
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 -ml-2 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="size-3.5" />
                Back to Authority Requests
              </Button>
            </div>

            <SheetHeader>
              <SheetTitle className="text-lg font-bold">{request.name}</SheetTitle>
              <SheetDescription>Authority access request details</SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <Pill tone={STATUS_PILL_TONE[request.approvalStatus]}>{request.approvalStatus}</Pill>

              <div className="space-y-4">
                <Field icon={Mail} label="Email" value={request.email} />
                <Field icon={Phone} label="Phone" value={request.phone || "Not provided"} />
                <Field
                  icon={Building2}
                  label="Organization / Department"
                  value={request.organization || "Not provided"}
                />
                <Field
                  icon={MapPin}
                  label="Requested City"
                  value={request.city || "Not provided"}
                />
                <Field
                  icon={CalendarDays}
                  label="Registration Date"
                  value={format(new Date(request.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
                <Field
                  icon={request.isActive ? ShieldCheck : ShieldX}
                  label="Account Status"
                  value={`${request.isActive ? "Active" : "Deactivated"} · ${request.isVerified ? "Verified" : "Unverified"}`}
                />
              </div>
            </div>

            {request.approvalStatus === "pending" && (
              <SheetFooter className="mt-8 flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full sm:flex-1" onClick={() => onReject(request)}>
                  <X className="size-4 mr-1.5" />
                  Reject
                </Button>
                <Button className="w-full sm:flex-1" onClick={() => onApprove(request)}>
                  <Check className="size-4 mr-1.5" />
                  Approve
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
