import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { profileApi } from "@/lib/api/profile.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { ProfileAvatar } from "./profile-avatar";
import { ProfilePhotoCropper, type ProfilePhotoCropperHandle } from "./profile-photo-cropper";
import { type EnterpriseProfile, hasValue } from "./profile-utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Use a JPG, PNG, or WEBP image.";
  if (file.size > MAX_FILE_SIZE) return "Image must be 5 MB or smaller.";
  return null;
}

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EnterpriseProfile;
}) {
  const isMobile = useIsMobile();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ProfilePhotoCropperHandle>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (open) setObjectUrl(null);
  }, [open]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  async function refreshEverywhere() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      refreshUser(),
    ]);
  }

  const uploadMutation = useMutation({
    mutationFn: (blob: Blob) => profileApi.uploadPhoto(blob),
    onSuccess: async () => {
      await refreshEverywhere();
      toast.success("Photo updated", {
        description: "Your profile photo has been saved.",
        icon: <CheckCircle2 className="size-4 text-[var(--color-success)]" />,
        duration: 3500,
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error("Upload failed", {
        description: message ?? "Couldn't upload your photo. Please try again.",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => profileApi.removePhoto(),
    onSuccess: async () => {
      await refreshEverywhere();
      toast.success("Photo removed", {
        description: "Your profile photo has been deleted.",
        icon: <CheckCircle2 className="size-4 text-[var(--color-success)]" />,
        duration: 3500,
      });
      setShowRemoveConfirm(false);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error("Couldn't remove photo", {
        description: message ?? "Something went wrong. Please try again.",
      });
      setShowRemoveConfirm(false);
    },
  });

  const isBusy = uploadMutation.isPending || removeMutation.isPending;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    const blob = await cropperRef.current?.getCroppedBlob(512, 0.85);
    if (!blob) {
      toast.error("Couldn't process this image. Try a different one.");
      return;
    }
    uploadMutation.mutate(blob);
  }

  function handleCancel() {
    if (isBusy) return;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
      return;
    }
    onOpenChange(false);
  }

  const isCropping = objectUrl !== null;

  const body = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a profile photo"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-4 py-2">
        {objectUrl ? (
          <ProfilePhotoCropper ref={cropperRef} imageUrl={objectUrl} />
        ) : (
          <div className="transition-transform duration-200 hover:scale-[1.02]" aria-hidden="true">
            <ProfileAvatar
              profile={profile}
              className="size-40 rounded-full shadow-lg"
              fallbackClassName="text-3xl"
            />
          </div>
        )}

        {!isCropping && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              aria-label={
                hasValue(profile.avatar) ? "Replace your profile photo" : "Upload a profile photo"
              }
              className="transition-all duration-150 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              {hasValue(profile.avatar) ? "Replace photo" : "Upload photo"}
            </Button>
            {hasValue(profile.avatar) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isBusy}
                aria-label="Remove your profile photo"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={isBusy}
        className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
      >
        Cancel
      </Button>
      {isCropping && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={isBusy}
          className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
        >
          {uploadMutation.isPending && (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          )}
          {uploadMutation.isPending ? "Saving…" : "Save"}
        </Button>
      )}
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Profile photo</DrawerTitle>
              <DrawerDescription>JPG, PNG, or WEBP. Up to 5 MB.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{body}</div>
            <DrawerFooter className="flex-row gap-2">{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Profile photo</DialogTitle>
              <DialogDescription>JPG, PNG, or WEBP. Up to 5 MB.</DialogDescription>
            </DialogHeader>
            {body}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={showRemoveConfirm}
        onOpenChange={(next) => !isBusy && setShowRemoveConfirm(next)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
            <AlertDialogDescription>
              You can upload a new one anytime, but this can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                removeMutation.mutate();
              }}
              disabled={isBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-150"
            >
              {removeMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Remove photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
