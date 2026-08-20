import { type ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui-bits";
import { InfoRow, InfoList } from "./profile-info-row";
import { profileApi } from "@/lib/api/profile.api";
import {
  type EnterpriseProfile,
  formatApprovalStatus,
  formatDate,
  formatDateTime,
  formatRole,
  getUsername,
  guessStatIconKind,
  hasValue,
  useCountUp,
} from "./profile-utils";

// ─── Compact Statistics Cards ─────────────────────────────────────────────────

const KPI_ICON: Record<string, ReactNode> = {
  submitted: <BarChart3 className="size-4.5" />,
  resolved: <CheckCircle2 className="size-4.5" />,
  pending: <Clock3 className="size-4.5" />,
  reports: <BarChart3 className="size-4.5" />,
  managed: <ShieldCheck className="size-4.5" />,
  cities: <MapPin className="size-4.5" />,
  total: <BarChart3 className="size-4.5" />,
  default: <BarChart3 className="size-4.5" />,
};

const KPI_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  submitted: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  resolved: {
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  pending: {
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  reports: {
    text: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
  },
  managed: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  cities: {
    text: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
  },
  total: {
    text: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  default: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
};

function CompactStatCard({
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
  const displayed = useCountUp(value, 400 + index * 80);
  const kind = guessStatIconKind(statKey);
  const icon = KPI_ICON[kind] ?? KPI_ICON.default;
  const colors = KPI_COLORS[kind] ?? KPI_COLORS.default;

  return (
    <div
      className="glass rounded-xl border border-border/80 p-4 sm:p-4.5 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground mt-1">
            {displayed}
          </div>
        </div>

        <div
          className={`size-10 rounded-xl ${colors.bg} ${colors.text} grid place-items-center shrink-0 border ${colors.border}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatisticsSection() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["profile", "statistics"],
    queryFn: () => profileApi.getStatistics(),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-3" role="alert">
        <AlertCircle className="size-4 text-destructive shrink-0" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-muted-foreground flex-1">
          Activity statistics could not be loaded.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          <RefreshCw
            className={`size-3 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Retry
        </Button>
      </div>
    );
  }

  const stats = data.data?.stats ?? [];
  if (stats.length === 0) return null;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
      role="list"
      aria-label="Account statistics"
    >
      {stats.map((stat, i) => (
        <CompactStatCard
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

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
      {title}
    </h2>
  );
}

// ─── Main ProfileOverview Component ───────────────────────────────────────────

export function ProfileOverview({ profile }: { profile: EnterpriseProfile }) {
  const memberSince = formatDate(profile.createdAt);
  const lastLogin = formatDateTime(profile.lastLogin);
  const accountStatus = formatApprovalStatus(profile.approvalStatus);
  const hasContact =
    hasValue(profile.phone) ||
    hasValue(profile.city) ||
    hasValue(profile.state) ||
    hasValue(profile.country);

  return (
    <div className="space-y-6">
      {/* ── Quick Statistics ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Activity Overview" />
        <StatisticsSection />
      </div>

      {/* ── Account Details (3-Column Grid) ───────────────────────────────── */}
      <div>
        <SectionHeader title="Account Details" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Column 1: Identity */}
          <Panel
            eyebrow="Identity"
            title={<h3 className="text-sm font-semibold tracking-tight">Identity</h3>}
            className="h-full p-4.5 sm:p-5"
          >
            <InfoList>
              <InfoRow
                icon={<User className="size-3.5" aria-hidden="true" />}
                label="Full name"
                value={profile.name}
              />
              <InfoRow label="Username" value={getUsername(profile.email)} />
              <InfoRow
                icon={<Shield className="size-3.5" aria-hidden="true" />}
                label="Role"
                value={formatRole(profile.role)}
              />
              {hasValue(profile.organization) && (
                <InfoRow label="Organization" value={profile.organization} />
              )}
            </InfoList>
          </Panel>

          {/* Column 2: Contact */}
          <Panel
            eyebrow="Contact"
            title={<h3 className="text-sm font-semibold tracking-tight">Contact Information</h3>}
            className="h-full p-4.5 sm:p-5"
          >
            {hasContact ? (
              <InfoList>
                <InfoRow
                  icon={<Mail className="size-3.5" aria-hidden="true" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoRow
                  icon={<Phone className="size-3.5" aria-hidden="true" />}
                  label="Phone"
                  value={profile.phone}
                />
                <InfoRow
                  icon={<MapPin className="size-3.5" aria-hidden="true" />}
                  label="City"
                  value={
                    hasValue(profile.city)
                      ? profile.city[0].toUpperCase() + profile.city.slice(1)
                      : undefined
                  }
                />
                <InfoRow label="Country" value={profile.country} />
              </InfoList>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No contact info on file yet.</p>
            )}
          </Panel>

          {/* Column 3: Account */}
          <Panel
            eyebrow="Account"
            title={<h3 className="text-sm font-semibold tracking-tight">Account Status</h3>}
            className="h-full p-4.5 sm:p-5"
          >
            <InfoList>
              <InfoRow
                icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
                label="Status"
                value={accountStatus}
              />
              <InfoRow
                icon={<CheckCircle2 className="size-3.5" aria-hidden="true" />}
                label="Verification"
                value={profile.isVerified ? "Verified" : "Unverified"}
              />
              <InfoRow
                icon={<Calendar className="size-3.5" aria-hidden="true" />}
                label="Member since"
                value={memberSince}
              />
              <InfoRow
                icon={<Clock3 className="size-3.5" aria-hidden="true" />}
                label="Last login"
                value={lastLogin}
              />
            </InfoList>
          </Panel>
        </div>
      </div>
    </div>
  );
}
