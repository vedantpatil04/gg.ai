import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GovernedComplaint } from "./complaint-governance-queries";

export interface PendingComplaintAction {
  complaint: GovernedComplaint;
  action: "verify" | "reject";
}

interface ComplaintActionDialogProps {
  pending: PendingComplaintAction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function ComplaintActionDialog({
  pending,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: ComplaintActionDialogProps) {
  const isVerify = pending?.action === "verify";

  return (
    <AlertDialog open={!!pending} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isVerify ? "Verify this complaint?" : "Reject this complaint?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending &&
              (isVerify ? (
                <>
                  Confirms <strong className="text-foreground">{pending.complaint.title}</strong> is
                  legitimate and moves it to{" "}
                  <strong className="text-foreground">In Progress</strong>, ready for assignment.
                </>
              ) : (
                <>
                  Marks <strong className="text-foreground">{pending.complaint.title}</strong> as
                  rejected. This can't be undone from this screen.
                </>
              ))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(!isVerify && buttonVariants({ variant: "destructive" }))}
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isVerify ? "Verify" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
