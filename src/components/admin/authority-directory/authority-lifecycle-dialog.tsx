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
import type { DirectoryAuthority } from "./authority-directory-queries";

export interface PendingLifecycleAction {
  authority: DirectoryAuthority;
  action: "activate" | "deactivate";
}

interface AuthorityLifecycleDialogProps {
  pending: PendingLifecycleAction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function AuthorityLifecycleDialog({
  pending,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: AuthorityLifecycleDialogProps) {
  const isActivate = pending?.action === "activate";

  return (
    <AlertDialog open={!!pending} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActivate ? "Activate this account?" : "Deactivate this account?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending &&
              (isActivate ? (
                <>
                  Restores login access for{" "}
                  <strong className="text-foreground">{pending.authority.name}</strong> (
                  {pending.authority.email}).
                </>
              ) : (
                <>
                  Prevents <strong className="text-foreground">{pending.authority.name}</strong> (
                  {pending.authority.email}) from logging in. Their approval status is unaffected —
                  this can be reversed at any time.
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
            className={cn(!isActivate && buttonVariants({ variant: "destructive" }))}
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isActivate ? "Activate" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
