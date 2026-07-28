import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api/auth.api";
import { ProfileSkeleton } from "./profile-skeleton";
import { ProfileError } from "./profile-error";
import { ProfileHero } from "./profile-hero";
import { ProfileTabs } from "./profile-tabs";
import { ProfileEditDrawer } from "./profile-edit-drawer";
import { ProfilePhotoDialog } from "./profile-photo-dialog";
import type { EnterpriseProfile } from "./profile-utils";

/**
 * Enterprise Profile Page — root composition component.
 *
 * Phase 1: layout, navigation, real profile data display.
 * Phase 2: dynamic Overview tab (statistics, completion).
 * Phase 3: functional Personal Information tab + Edit Profile drawer.
 * Phase 4: profile picture upload/replace/remove.
 * Phase 5: Organization tab.
 * Phase 6: Activity tab.
 * Phase 7: Profile completion engine.
 * Phase 8: Notification & audit hooks, premium motion.
 * Phase 9: API hardening, security, UI polish.
 * Phase 10 additions:
 *  - `handleLogout` and `handleEditOpen` / `handlePhotoOpen` stabilised
 *    with `useCallback` to prevent unnecessary re-renders of ProfileHero
 *    and ProfileTabs on each parent render.
 *  - No new features; this file's role is pure composition.
 */
export function EnterpriseProfilePage() {
  const { user: sessionUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  // Dedicated fetch so this page has its own loading / error lifecycle —
  // avoids borrowing a flag from AuthProvider that's already settled.
  const {
    data: response,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => authApi.getMe(),
    retry: 1,
  });

  // Stable callbacks — prevent ProfileHero / ProfileTabs from re-rendering
  // whenever this parent re-renders for unrelated reasons.
  const handleLogout = useCallback(async () => {
    await logout();
    navigate({ to: "/login" });
  }, [logout, navigate]);

  const handleEditOpen = useCallback(() => setIsEditOpen(true), []);
  const handlePhotoOpen = useCallback(() => setIsPhotoOpen(true), []);

  if (!sessionUser) return null;

  const profile = (response?.data?.user ?? null) as EnterpriseProfile | null;

  return (
    <main className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto" aria-label="Profile page">
      {isLoading ? (
        <ProfileSkeleton />
      ) : isError || !profile ? (
        <ProfileError onRetry={() => refetch()} isRetrying={isFetching} />
      ) : (
        <>
          <ProfileHero
            profile={profile}
            onLogout={handleLogout}
            onEditProfile={handleEditOpen}
            onChangePhoto={handlePhotoOpen}
          />
          <ProfileTabs profile={profile} onEditProfile={handleEditOpen} />
          {/* Single shared drawer/dialog instance regardless of which
              button opened it (hero header or Personal Information tab). */}
          <ProfileEditDrawer open={isEditOpen} onOpenChange={setIsEditOpen} profile={profile} />
          <ProfilePhotoDialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen} profile={profile} />
        </>
      )}
    </main>
  );
}
