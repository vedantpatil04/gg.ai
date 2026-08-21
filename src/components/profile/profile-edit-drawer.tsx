import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { profileApi, type ProfileUpdatePayload } from "@/lib/api/profile.api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  ProfileFormSection,
  ProfileTextField,
  ProfileSelectField,
  ReadOnlyField,
} from "./profile-form-fields";
import { profileEditSchema, type ProfileEditFormValues } from "./profile-edit-schema";
import { type EnterpriseProfile, GENDER_OPTIONS, getUsername } from "./profile-utils";

const FORM_ID = "profile-edit-form";

function computeDefaults(profile: EnterpriseProfile): ProfileEditFormValues {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    displayName: profile.name ?? "",
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    gender: profile.gender ?? "",
    addressLine: profile.addressLine ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    country: profile.country ?? "",
    pinCode: profile.pinCode ?? "",
  };
}

interface ServerFieldError {
  field: string;
  message: string;
}

export function ProfileEditDrawer({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EnterpriseProfile;
}) {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: computeDefaults(profile),
    mode: "onBlur",
  });

  // Pre-fill fresh every time the drawer opens — covers both first open
  // and re-opening after the underlying profile has changed since last time.
  useEffect(() => {
    if (open) form.reset(computeDefaults(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDirty = form.formState.isDirty;

  // Guard hard navigation (tab close, reload, typed URL) when there are
  // unsaved changes — in-app navigation is blocked by the Sheet overlay.
  useEffect(() => {
    if (!open || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, isDirty]);

  const mutation = useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileApi.updateProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        refreshUser(),
      ]);
      form.reset(form.getValues());

      // Phase 9 — enriched success toast with a check icon
      toast.success("Profile updated", {
        description: "Your personal information has been saved.",
        icon: <CheckCircle2 className="size-4 text-[var(--color-success)]" />,
        duration: 3500,
      });

      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const response = (
        err as { response?: { data?: { errors?: ServerFieldError[]; message?: string } } }
      )?.response;
      const fieldErrors = response?.data?.errors;
      if (fieldErrors && fieldErrors.length > 0) {
        fieldErrors.forEach((fe) => {
          if (fe.field in form.getValues()) {
            form.setError(fe.field as keyof ProfileEditFormValues, {
              type: "server",
              message: fe.message,
            });
          }
        });
        toast.error("Check highlighted fields", {
          description: "Some fields need attention before saving.",
        });
      } else {
        toast.error("Couldn't save changes", {
          description: response?.data?.message ?? "Something went wrong. Please try again.",
        });
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const dirtyFields = form.formState.dirtyFields;
    const payload: ProfileUpdatePayload = {};
    (Object.keys(dirtyFields) as Array<keyof ProfileEditFormValues>).forEach((key) => {
      if (dirtyFields[key]) payload[key] = values[key];
    });
    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }
    mutation.mutate(payload);
  });

  function requestClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onOpenChange(false);
  }

  function discardAndClose() {
    setShowDiscardConfirm(false);
    form.reset(computeDefaults(profile));
    onOpenChange(false);
  }

  const isPending = mutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Update your personal information.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id={FORM_ID} onSubmit={onSubmit} className="space-y-8" noValidate>
                <ProfileFormSection title="Basic Information">
                  <ProfileTextField
                    control={form.control}
                    name="firstName"
                    label="First name"
                    required
                    maxLength={50}
                  />
                  <ProfileTextField
                    control={form.control}
                    name="lastName"
                    label="Last name"
                    maxLength={50}
                  />
                  <ProfileTextField
                    control={form.control}
                    name="displayName"
                    label="Display name"
                    required
                    maxLength={60}
                    className="sm:col-span-2"
                  />
                  <ReadOnlyField label="Username" value={getUsername(profile.email)} />
                </ProfileFormSection>

                <ProfileFormSection title="Contact Information">
                  <ProfileTextField
                    control={form.control}
                    name="phone"
                    label="Phone number"
                    type="tel"
                    placeholder="+91 98765 43210"
                  />
                  <ReadOnlyField label="Email address" value={profile.email} />
                </ProfileFormSection>

                <ProfileFormSection title="Personal Details">
                  <ProfileTextField
                    control={form.control}
                    name="dateOfBirth"
                    label="Date of birth"
                    type="date"
                  />
                  <ProfileSelectField
                    control={form.control}
                    name="gender"
                    label="Gender"
                    placeholder="Select"
                    options={GENDER_OPTIONS}
                  />
                </ProfileFormSection>

                <ProfileFormSection
                  title="Address"
                  description="Hidden anywhere it's not filled in yet."
                >
                  <ProfileTextField
                    control={form.control}
                    name="addressLine"
                    label="Address line"
                    maxLength={200}
                    className="sm:col-span-2"
                  />
                  <ProfileTextField
                    control={form.control}
                    name="city"
                    label="City"
                    maxLength={100}
                  />
                  <ProfileTextField
                    control={form.control}
                    name="state"
                    label="State"
                    maxLength={100}
                  />
                  <ProfileTextField
                    control={form.control}
                    name="country"
                    label="Country"
                    maxLength={100}
                  />
                  <ProfileTextField
                    control={form.control}
                    name="pinCode"
                    label="PIN code"
                    maxLength={10}
                  />
                </ProfileFormSection>
              </form>
            </Form>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={isPending}
              className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={!isDirty || isPending}
              className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved profile changes</AlertDialogTitle>
            <AlertDialogDescription>Do you want to discard them?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
