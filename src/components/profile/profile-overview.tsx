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
  formatDate,
  formatDateTime,
  formatRole,
  getUsername,
  guessStatIconKind,
  hasValue,
  useCountUp,
} from "./profile-utils";

// ─── Shared stagger wrapper ────────────────────────────────────────────────

function Stagger({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both"
      style={{ animationDelay: `${index * 75}ms`, animationDuration: "360ms" }}
    >
      {children}
    </div>
  );
}

// ─── Premium KPI cards (gradient border) ──────────────────────────────────

const KPI_ICON: Record<string, ReactNode> = {
  submitted: <BarChart3 className="size-5" />,
  resolved: <CheckCircle2 className="size-5" />,
  pending: <Clock3 className="size-5" />,
  reports: <BarChart3 className="size-5" />,
  managed: <ShieldCheck className="size-5" />,
  cities: <MapPin className="size-5" />,
  total: <BarChart3 className="size-5" />,
  default: <BarChart3 className="size-5" />,
};

const KPI_ACCENT: Record<string, string> = {
  submitted: "var(--color-primary)",
  resolved: "var(--color-success)",
  pending: "var(--color-warning)",
  reports: "var(--color-info)",
  managed: "var(--color-primary)",
  cities: "var(--color-info)",
  total: "var(--color-destructive)",
  default: "var(--color-primary)",
};

function KpiCard({
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
  const displayed = useCountUp(value, 550 + index * 90);
  const kind = guessStatIconKind(statKey);
  const icon = KPI_ICON[kind] ?? KPI_ICON.default;
  const accent = KPI_ACCENT[kind] ?? KPI_ACCENT.default;

  return (
    <div
      className="relative rounded-2xl p-[1px] group animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both transition-transform duration-200 hover:-translate-y-1"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 45%, transparent), transparent 65%)`,
        animationDelay: `${index * 65}ms`,
        animationDuration: "340ms",
      }}
    >
      <div className="rounded-2xl bg-background/95 backdrop-blur-sm p-6 h-full relative overflow-hidden group-hover:shadow-xl transition-shadow duration-200">
        {/* Soft glow accent */}
        <div
          className="absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
          style={{ background: accent }}
          aria-hidden="true"
        />
        <div className="relative">
          <div
            className="size-11 rounded-xl grid place-items-center mb-4 transition-transform duration-200 group-hover:scale-110"
            style={{ color: accent, background: `color-mix(in oklab, ${accent} 12%, transparent)` }}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div
            className="text-4xl font-semibold tabular-nums tracking-tight"
            aria-label={`${value} ${label}`}
          >
            {displayed}
          </div>
          <div className="text-sm text-muted-foreground mt-1.5">{label}</div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center gap-4" role="alert">
        <AlertCircle className="size-5 text-destructive shrink-0" aria-hidden="true" />
        <p className="text-sm text-muted-foreground flex-1">Statistics couldn't be loaded.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw
            className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
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
      className="grid grid-cols-2 lg:grid-cols-4 gap-5"
      role="list"
      aria-label="Account statistics"
    >
      {stats.map((stat, i) => (
        <KpiCard
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

// ─── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">{children}</p>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Phase 10 Master Redesign — Overview tab.
 *
 * Profile completion and its recommendations now live in the Hero (with a
 * full "View All" drawer), so this tab focuses purely on informational
 * panels: Statistics (premium KPI cards) and Identity / Contact / Account.
 * Larger typography and generous spacing throughout — no dense table rows.
 */
export function ProfileOverview({ profile }: { profile: EnterpriseProfile }) {
  const memberSince = formatDate(profile.createdAt);
  const lastLogin = formatDateTime(profile.lastLogin);
  const hasContact =
    hasValue(profile.phone) ||
    hasValue(profile.city) ||
    hasValue(profile.state) ||
    hasValue(profile.country);

  return (
    <div className="space-y-8">
      {/* Statistics — premium KPI cards, full width */}
      <Stagger index={0}>
        <SectionLabel>Statistics</SectionLabel>
        <StatisticsSection />
      </Stagger>

      {/* Identity / Contact / Account — equal-weight, generously spaced */}
      <div>
        <SectionLabel>Account details</SectionLabel>
        <div className="grid md:grid-cols-3 gap-5">
          <Stagger index={1}>
            <Panel
              eyebrow="Identity"
              title={<h3 className="text-lg font-semibold tracking-tight">Identity</h3>}
              className="hover:shadow-lg transition-shadow duration-200 h-full p-6"
            >
              <InfoList>
                <InfoRow
                  icon={<User className="size-4" aria-hidden="true" />}
                  label="Full name"
                  value={profile.name}
                />
                <InfoRow
                  icon={<Mail className="size-4" aria-hidden="true" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoRow label="Username" value={getUsername(profile.email)} />
                <InfoRow
                  icon={<Shield className="size-4" aria-hidden="true" />}
                  label="Role"
                  value={formatRole(profile.role)}
                />
              </InfoList>
            </Panel>
          </Stagger>

          <Stagger index={2}>
            <Panel
              eyebrow="Contact"
              title={<h3 className="text-lg font-semibold tracking-tight">Contact</h3>}
              className="hover:shadow-lg transition-shadow duration-200 h-full p-6"
            >
              {hasContact ? (
                <InfoList>
                  <InfoRow
                    icon={<Phone className="size-4" aria-hidden="true" />}
                    label="Phone"
                    value={profile.phone}
                  />
                  <InfoRow
                    icon={<MapPin className="size-4" aria-hidden="true" />}
                    label="City"
                    value={
                      hasValue(profile.city)
                        ? profile.city[0].toUpperCase() + profile.city.slice(1)
                        : undefined
                    }
                  />
                  <InfoRow label="State" value={profile.state} />
                  <InfoRow label="Country" value={profile.country} />
                </InfoList>
              ) : (
                <p className="text-sm text-muted-foreground py-1">No contact info on file yet.</p>
              )}
            </Panel>
          </Stagger>

          <Stagger index={3}>
            <Panel
              eyebrow="Account"
              title={<h3 className="text-lg font-semibold tracking-tight">Account</h3>}
              className="hover:shadow-lg transition-shadow duration-200 h-full p-6"
            >
              <InfoList>
                <InfoRow
                  icon={<Calendar className="size-4" aria-hidden="true" />}
                  label="Member since"
                  value={memberSince}
                />
                <InfoRow
                  icon={<Clock3 className="size-4" aria-hidden="true" />}
                  label="Last login"
                  value={lastLogin}
                />
              </InfoList>
            </Panel>
          </Stagger>
        </div>
      </div>
    </div>
  );
}
