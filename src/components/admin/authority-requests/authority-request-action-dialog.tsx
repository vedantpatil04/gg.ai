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
import type { AuthorityRequest } from "./authority-request-queries";

export interface PendingAction {
  request: AuthorityRequest;
  action: "approve" | "reject";
}

interface AuthorityRequestActionDialogProps {
  pending: PendingAction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function AuthorityRequestActionDialog({
  pending,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: AuthorityRequestActionDialogProps) {
  const isApprove = pending?.action === "approve";

  return (
    <AlertDialog open={!!pending} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isApprove ? "Approve this authority request?" : "Reject this authority request?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending &&
              (isApprove ? (
                <>
                  This grants <strong className="text-foreground">{pending.request.name}</strong> (
                  {pending.request.email}) authority-level access to GreenGuard AI.
                </>
              ) : (
                <>
                  This blocks <strong className="text-foreground">{pending.request.name}</strong> (
                  {pending.request.email}) from authority-level access. They can be reviewed again
                  later if needed.
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
            className={cn(!isApprove && buttonVariants({ variant: "destructive" }))}
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isApprove ? "Approve" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
