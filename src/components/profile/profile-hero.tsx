import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui-bits";
import { ProfileAvatar } from "./profile-avatar";
import { RecommendationsDrawer } from "./profile-recommendations-drawer";
import { profileApi, type CompletionStatus } from "@/lib/api/profile.api";
import {
  type EnterpriseProfile,
  formatDate,
  formatDateTime,
  formatRole,
  formatApprovalStatus,
  hasValue,
  roleTone,
} from "./profile-utils";

// ─── Compact Completion Ring ──────────────────────────────────────────────────

const MINI_RING_R = 20;
const MINI_RING_C = 2 * Math.PI * MINI_RING_R;

function MiniCompletionRing({ value, status }: { value: number; status: CompletionStatus }) {
  const offset = MINI_RING_C * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color =
    status === "complete"
      ? "var(--color-success)"
      : status === "nearly_complete"
        ? "var(--color-primary)"
        : status === "good_progress"
          ? "var(--color-warning)"
          : "var(--color-destructive)";

  return (
    <div className="relative size-12 shrink-0 grid place-items-center">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90 shrink-0" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r={MINI_RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/30"
        />
        <circle
          cx="24"
          cy="24"
          r={MINI_RING_R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={MINI_RING_C}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {value}%
      </span>
    </div>
  );
}

const STATUS_STYLE: Record<CompletionStatus, { color: string; bg: string }> = {
  complete: {
    color: "var(--color-success)",
    bg: "color-mix(in oklab, var(--color-success) 12%, transparent)",
  },
  nearly_complete: {
    color: "var(--color-primary)",
    bg: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
  },
  good_progress: {
    color: "var(--color-warning)",
    bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)",
  },
  needs_attention: {
    color: "var(--color-destructive)",
    bg: "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
  },
};

const MOTIVATION: Record<CompletionStatus, string> = {
  complete: "Your profile is fully complete.",
  nearly_complete: "Almost there — a couple of details remaining.",
  good_progress: "Good progress — complete your profile to strengthen your account.",
  needs_attention: "Complete your profile to strengthen your account.",
};

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      <span>{children}</span>
    </span>
  );
}

// ─── Compact Profile Header ───────────────────────────────────────────────────

function ProfileHeaderCard({
  profile,
  onEditProfile,
  onLogout,
  onChangePhoto,
}: {
  profile: EnterpriseProfile;
  onEditProfile: () => void;
  onLogout: () => void;
  onChangePhoto: () => void;
}) {
  const { t } = useTranslation("profile");
  const { t: tAuth } = useTranslation("authentication");
  const memberSince = formatDate(profile.createdAt);
  const lastLogin = formatDateTime(profile.lastLogin);
  const approvalLabel = formatApprovalStatus(profile.approvalStatus);

  return (
    <div
      className="glass rounded-2xl border border-border/80 p-5 sm:p-7 shadow-sm transition-all duration-200 overflow-hidden relative"
      style={{ boxShadow: "var(--shadow-elev), 0 0 0 1px var(--color-border)" }}
    >
      <div className="h-0.5 w-full aurora absolute top-0 left-0 opacity-80" aria-hidden="true" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
        {/* Left: Avatar + Identity */}
        <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
          {/* Avatar with Camera Trigger */}
          <div className="relative shrink-0 mt-0.5">
            <button
              onClick={onChangePhoto}
              type="button"
              aria-label={t("changeAvatar", "Change photo")}
              className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            >
              <ProfileAvatar
                profile={profile}
                className="size-16 sm:size-20 rounded-full border-2 border-background shadow-md transition-all duration-200 group-hover:scale-105"
                fallbackClassName="rounded-full text-xl sm:text-2xl font-semibold"
              />
              <span
                className="absolute -bottom-1 -right-1 size-6 sm:size-7 rounded-full bg-primary text-primary-foreground border-2 border-background shadow flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              >
                <Camera className="size-3 sm:size-3.5" />
              </span>
            </button>
            {profile.isVerified && (
              <span
                className="absolute top-0 right-0 size-3.5 rounded-full bg-success border-2 border-background shadow"
                title={t("verified", "Verified")}
                aria-label={t("verified", "Verified")}
              />
            )}
          </div>

          {/* Identity details */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {profile.name}
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Pill tone={roleTone(profile.role)}>{formatRole(profile.role)}</Pill>
                {profile.isVerified && (
                  <Pill tone="success">
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    {t("verified", "Verified")}
                  </Pill>
                )}
                {profile.role === "authority" && (
                  <Pill tone={profile.approvalStatus === "approved" ? "success" : "warning"}>
                    {approvalLabel}
                  </Pill>
                )}
              </div>
            </div>

            {hasValue(profile.organization) && (
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {profile.organization}
              </p>
            )}

            {/* Contact metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
              <MetaItem icon={<Mail className="size-3.5 text-muted-foreground shrink-0" />}>
                {profile.email}
              </MetaItem>

              {hasValue(profile.phone) && (
                <MetaItem icon={<Phone className="size-3.5 text-muted-foreground shrink-0" />}>
                  {profile.phone}
                </MetaItem>
              )}

              {hasValue(profile.city) && (
                <MetaItem icon={<MapPin className="size-3.5 text-muted-foreground shrink-0" />}>
                  <span className="capitalize">{profile.city}</span>
                  {hasValue(profile.country) ? `, ${profile.country}` : ""}
                </MetaItem>
              )}

              {memberSince && (
                <MetaItem icon={<Calendar className="size-3.5 text-muted-foreground shrink-0" />}>
                  {t("memberSince", "Member since")} {memberSince}
                </MetaItem>
              )}

              {lastLogin && (
                <MetaItem icon={<Clock3 className="size-3.5 text-muted-foreground shrink-0" />}>
                  {t("lastLogin", "Last login")} {lastLogin}
                </MetaItem>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
          <Button
            onClick={onEditProfile}
            size="sm"
            className="gap-1.5 h-9 rounded-xl font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {t("editProfile", "Edit Profile")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="gap-1.5 h-9 rounded-xl font-medium transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            {tAuth("logout", "Log out")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Profile Completion Banner ────────────────────────────────────────

function ProfileCompletionBanner({ onEditProfile, userId }: { onEditProfile: () => void; userId?: string }) {
  const { t } = useTranslation("profile");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "completion", userId],
    queryFn: () => profileApi.getCompletion(),
    enabled: !!userId,
    retry: 1,
  });
  const c = data?.data;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-4">
        <Skeleton className="size-10 rounded-full shrink-0 shimmer" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40 shimmer" />
          <Skeleton className="h-3 w-64 shimmer" />
        </div>
      </div>
    );
  }

  if (!c || c.completion === 100) return null;

  const { color, bg } = STATUS_STYLE[c.status];
  const isComplete = c.missingFields.length === 0;

  return (
    <>
      <div
        className="glass rounded-xl border border-border/70 p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs transition-all"
        aria-label={`Profile completion: ${c.completion}%`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <MiniCompletionRing value={c.completion} status={c.status} />

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{t("completion", "Profile Completion")}</span>
              <span
                className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                style={{ color, background: bg }}
              >
                {c.statusLabel}
              </span>
              {isComplete && (
                <CheckCircle2
                  className="size-3.5 text-success shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate">
              {c.completedCount} of {c.totalFields} fields complete · {c.missingFields.length} remaining
              — <span className="text-foreground/80">{MOTIVATION[c.status]}</span>
            </p>
          </div>
        </div>

        {!isComplete && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              variant="default"
              onClick={onEditProfile}
              className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 cursor-pointer"
            >
              <Sparkles className="size-3" />
              {t("continue", "Continue")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawerOpen(true)}
              className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("viewAll", "View All")}
            </Button>
          </div>
        )}
      </div>

      <RecommendationsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        actions={c.suggestedActions}
        completedCount={c.completedCount}
        totalFields={c.totalFields}
        onEditProfile={onEditProfile}
      />
    </>
  );
}

// ─── Main ProfileHero Export ──────────────────────────────────────────────────

export function ProfileHero({
  profile,
  onLogout,
  onEditProfile,
  onChangePhoto,
}: {
  profile: EnterpriseProfile;
  onLogout: () => void;
  onEditProfile: () => void;
  onChangePhoto: () => void;
}) {
  return (
    <div className="space-y-3.5">
      <ProfileHeaderCard
        profile={profile}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        onChangePhoto={onChangePhoto}
      />

      <ProfileCompletionBanner onEditProfile={onEditProfile} userId={profile._id} />
    </div>
  );
}
