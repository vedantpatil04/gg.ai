import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
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
  guessStatIconKind,
  hasValue,
  roleTone,
  useCountUp,
} from "./profile-utils";

// ─── Completion ring ────────────────────────────────────────────────────────

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

function CompletionRing({ value, status }: { value: number; status: CompletionStatus }) {
  const offset = RING_C * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color =
    status === "complete"
      ? "var(--color-success)"
      : status === "nearly_complete"
        ? "var(--color-primary)"
        : status === "good_progress"
          ? "var(--color-warning)"
          : "var(--color-destructive)";

  return (
    <svg
      viewBox="0 0 104 104"
      className="size-24 sm:size-28 -rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="52"
        cy="52"
        r={RING_R}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        className="text-muted/30"
      />
      <circle
        cx="52"
        cy="52"
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s ease",
        }}
      />
    </svg>
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
  complete: "Your profile is fully complete — nice work.",
  nearly_complete: "You're almost there — a couple of details left.",
  good_progress: "Good progress — keep going to reach 100%.",
  needs_attention: "Let's fill in a few details to strengthen your profile.",
};

// ─── Section A: Identity row ────────────────────────────────────────────────

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function IdentityRow({
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
  const memberSince = formatDate(profile.createdAt);
  const lastLogin = formatDateTime(profile.lastLogin);

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-7 lg:gap-10">
      {/* Avatar with floating action, bottom-LEFT */}
      <div className="relative self-start shrink-0">
        <button
          onClick={onChangePhoto}
          aria-label="Change profile photo"
          className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ProfileAvatar
            profile={profile}
            className="size-[104px] sm:size-[120px] rounded-full border-4 border-background shadow-xl transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-2xl"
            fallbackClassName="rounded-full text-3xl"
          />
          <span
            className="
              absolute -bottom-1 -left-1 size-9 rounded-full
              bg-primary text-primary-foreground
              border-2 border-background shadow-lg
              flex items-center justify-center
              transition-all duration-200
              group-hover:scale-110 group-hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]
            "
            aria-hidden="true"
          >
            <Camera className="size-4" />
          </span>
        </button>
        {profile.isVerified && (
          <span
            className="absolute top-1 right-1 size-4 rounded-full bg-[var(--color-success)] border-2 border-background shadow"
            aria-label="Verified account"
            title="Verified"
          />
        )}
      </div>

      {/* Identity block */}
      <div className="flex-1 min-w-0 space-y-3.5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            {profile.name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <Pill tone={roleTone(profile.role)}>{formatRole(profile.role)}</Pill>
            {profile.isVerified && (
              <Pill tone="success">
                <ShieldCheck className="size-3" aria-hidden="true" /> Verified
              </Pill>
            )}
          </div>
        </div>

        {hasValue(profile.organization) && (
          <p className="text-base font-medium text-muted-foreground">{profile.organization}</p>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <MetaItem icon={<Mail className="size-4 shrink-0" aria-hidden="true" />}>
            {profile.email}
          </MetaItem>
          {hasValue(profile.phone) && (
            <MetaItem icon={<Phone className="size-4 shrink-0" aria-hidden="true" />}>
              {profile.phone}
            </MetaItem>
          )}
          {hasValue(profile.city) && (
            <MetaItem icon={<MapPin className="size-4 shrink-0" aria-hidden="true" />}>
              <span className="capitalize">{profile.city}</span>
              {hasValue(profile.country) ? `, ${profile.country}` : ""}
            </MetaItem>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {memberSince && (
            <MetaItem icon={<Calendar className="size-4 shrink-0" aria-hidden="true" />}>
              Member since {memberSince}
            </MetaItem>
          )}
          {lastLogin && (
            <MetaItem icon={<Clock3 className="size-4 shrink-0" aria-hidden="true" />}>
              Last login {lastLogin}
            </MetaItem>
          )}
        </div>
      </div>

      {/* Primary actions */}
      <div className="flex sm:flex-col gap-2.5 shrink-0 lg:pt-1">
        <Button
          onClick={onEditProfile}
          size="default"
          className="gap-2 transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit Profile
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={onLogout}
          className="gap-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </div>
  );
}

// ─── Section B: Completion row (full width) ────────────────────────────────

function CompletionRow({ onEditProfile }: { onEditProfile: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "completion"],
    queryFn: () => profileApi.getCompletion(),
    retry: 1,
  });
  const c = data?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <Skeleton className="size-24 sm:size-28 rounded-full shrink-0 shimmer" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40 shimmer" />
          <Skeleton className="h-4 w-56 shimmer" />
        </div>
      </div>
    );
  }
  if (!c) return null;

  const { color, bg } = STATUS_STYLE[c.status];
  const isComplete = c.missingFields.length === 0;

  return (
    <>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-6"
        aria-label={`Profile ${c.completion}% complete`}
      >
        <div className="relative shrink-0">
          <CompletionRing value={c.completion} status={c.status} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-semibold tabular-nums leading-none">
              {c.completion}%
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full"
              style={{ color, background: bg }}
            >
              {c.statusLabel}
            </span>
            {isComplete && (
              <CheckCircle2
                className="size-4"
                style={{ color: "var(--color-success)" }}
                aria-hidden="true"
              />
            )}
          </div>
          <p className="text-base font-medium">
            {c.completedCount} of {c.totalFields} fields complete
            {!isComplete && ` · ${c.missingFields.length} remaining`}
          </p>
          <p className="text-sm text-muted-foreground">{MOTIVATION[c.status]}</p>
        </div>

        {!isComplete && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={onEditProfile}
              className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawerOpen(true)}
              className="transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              View All
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

// ─── Section C: Quick statistics strip ─────────────────────────────────────

const STAT_ICON: Record<string, ReactNode> = {
  submitted: <BarChart3 className="size-4" />,
  resolved: <CheckCircle2 className="size-4" />,
  pending: <Clock3 className="size-4" />,
  reports: <BarChart3 className="size-4" />,
  managed: <ShieldCheck className="size-4" />,
  cities: <MapPin className="size-4" />,
  total: <BarChart3 className="size-4" />,
  default: <BarChart3 className="size-4" />,
};

function QuickStatItem({
  statKey,
  value,
  label,
  index,
}: {
  statKey: string;
  value: number;
  label: string;
  index: number;
}) {
  const displayed = useCountUp(value, 500 + index * 70);
  const icon = STAT_ICON[guessStatIconKind(statKey)] ?? STAT_ICON.default;

  return (
    <div
      className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both"
      style={{ animationDelay: `${index * 50}ms`, animationDuration: "280ms" }}
    >
      <span
        className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <div
          className="text-xl font-semibold tabular-nums leading-none"
          aria-label={`${value} ${label}`}
        >
          {displayed}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function QuickStatsRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "statistics"],
    queryFn: () => profileApi.getStatistics(),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  const stats = data?.data?.stats ?? [];
  if (stats.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4" role="list" aria-label="Quick statistics">
      {stats.map((stat, i) => (
        <QuickStatItem
          key={stat.key}
          statKey={stat.key}
          value={stat.value}
          label={stat.label}
          index={i}
        />
      ))}
    </div>
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="h-px bg-border/70 my-7 sm:my-8" aria-hidden="true" />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">{children}</p>
  );
}

// ─── Main hero ─────────────────────────────────────────────────────────────

/**
 * Phase 10 Master Redesign — full-width enterprise hero.
 *
 * No decorative cover banner. The hero is a single vertically-stacked
 * workspace with three full-width sections: Identity, Profile Completion,
 * and Quick Statistics — using the full available width rather than the
 * previous two-column split that left the right side underused.
 */
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
    <div
      className="glass rounded-3xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-400"
      style={{ boxShadow: "var(--shadow-elev), 0 0 0 1px var(--color-border)" }}
    >
      <div className="h-1 aurora opacity-80" aria-hidden="true" />

      <div className="px-6 sm:px-10 py-8 sm:py-10">
        <IdentityRow
          profile={profile}
          onEditProfile={onEditProfile}
          onLogout={onLogout}
          onChangePhoto={onChangePhoto}
        />

        <SectionDivider />

        <div>
          <SectionLabel>Profile Completion</SectionLabel>
          <CompletionRow onEditProfile={onEditProfile} />
        </div>

        <SectionDivider />

        <div>
          <SectionLabel>Quick Statistics</SectionLabel>
          <QuickStatsRow />
        </div>
      </div>
    </div>
  );
}
