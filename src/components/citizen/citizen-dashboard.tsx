/**
 * citizen-dashboard.tsx
 *
 * Citizen Hub Dashboard — Polished, realistic, citizen-first civic experience.
 *
 * Sections:
 * 1. Welcome & City Context (Compact, human, calm, civic tone)
 * 2. Complaint Overview (Active, Awaiting Action, Resolved & Closed, Total Complaints — Clickable summary cards)
 * 3. Quick Actions (My Complaints, My Profile, Check City Environmental Status)
 * 4. My Complaints (Interactive complaint cards with status, last updated, status explanation & New message indicators)
 * 5. City Environment Snapshot (AQI, temp, humidity, advisory, visual context)
 * 6. Recent Activity Timeline
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  MapPin,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  Wind,
  Thermometer,
  Droplets,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import {
  useCitizenStats,
  useMyCitizenComplaints,
  useMyComplaintUnreadCounts,
  type CitizenComplaint,
} from "./citizen-queries";
import {
  humanizeIssueType,
  getStatusMeta,
  getSeverityMeta,
} from "./citizen-status-utils";
import {
  ActivityFeed,
  complaintsToActivityFeed,
} from "@/components/shared/activity-feed";
import { StatCardSkeleton } from "@/components/shared/skeletons";
import { NoComplaintsEmpty } from "@/components/shared/empty-states";
import { resolveHeroImage } from "@/lib/city-images";
import { getTimeSlot, getWeatherProxy } from "@/lib/hero-scene";

interface CitizenDashboardProps {
  userName: string;
  onNewComplaint: () => void;
  onViewHistory: (statusFilter?: string) => void;
  onOpenComplaint: (id: string) => void;
}

// ─── Status Explanation Helper ────────────────────────────────────────────────

function getStatusExplanation(complaint: CitizenComplaint): string {
  switch (complaint.status) {
    case "pending":
      return complaint.assignedTo
        ? "Assigned to an environmental authority — awaiting investigation."
        : "Received by municipal dispatch — awaiting assignment.";
    case "in-progress":
      return "Authority has started investigating this environmental issue.";
    case "awaiting_citizen_review":
      return "Authority has submitted a resolution. Please review and verify.";
    case "resolved":
      return "Resolution submitted and undergoing administrative verification.";
    case "rework":
      return "Rework requested — administrator is reviewing feedback.";
    case "closed":
      return "Issue resolved and officially closed. Thank you for reporting.";
    case "rejected":
      return "Report reviewed and closed without further action.";
    default:
      return "Case is currently being processed.";
  }
}

// ─── Clickable Summary Card Component ─────────────────────────────────────────

function ComplaintSummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "info" | "warning" | "success" | "primary";
  onClick: () => void;
}) {
  const toneClasses = {
    info: "text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/5",
    warning: "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5",
    success: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    primary: "text-primary border-primary/20 bg-primary/5",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all group flex flex-col justify-between",
        "border-border/80 bg-card/70 hover:bg-card hover:border-primary/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
      )}
      aria-label={`${label}: ${value}. Click to view filtered complaints.`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0 border", toneClasses)}>
          <Icon className="size-3.5" />
        </div>
      </div>

      <div className="my-2.5">
        <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
      </div>

      <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground pt-1 border-t border-border/40">
        <span className="truncate mr-2">{hint}</span>
        <span className="inline-flex items-center gap-0.5 text-primary font-medium shrink-0 group-hover:translate-x-0.5 transition-transform">
          View
          <ChevronRight className="size-3" />
        </span>
      </div>
    </button>
  );
}

// ─── Dashboard Complaint Card ─────────────────────────────────────────────────

function DashboardComplaintCard({
  complaint,
  unreadCount = 0,
  onClick,
}: {
  complaint: CitizenComplaint;
  unreadCount?: number;
  onClick: () => void;
}) {
  const assignedAuth = complaint.assignedTo as { name?: string } | null;
  const statusMeta = getStatusMeta(complaint.status, !!assignedAuth);
  const explanation = getStatusExplanation(complaint);

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 transition-all cursor-pointer group space-y-3",
        "border-border/80 bg-card/80 hover:border-primary/40 hover:bg-card hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
        unreadCount > 0 && "border-primary/40 bg-primary/2",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View complaint: ${complaint.title}`}
    >
      {/* Top row: ID + Category + Status + Unread message badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground">
            #GG-{complaint._id.slice(-6).toUpperCase()}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground font-medium">
            {humanizeIssueType(complaint.issueType)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
              <MessageSquare className="size-2.5" />
              New message
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
              statusMeta.tone === "success" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
              statusMeta.tone === "warning" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
              statusMeta.tone === "info" && "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
              statusMeta.tone === "primary" && "border-primary/30 text-primary bg-primary/5",
              statusMeta.tone === "destructive" && "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
              statusMeta.tone === "muted" && "border-border text-muted-foreground bg-muted/40",
            )}
          >
            <span>{statusMeta.symbol}</span>
            <span>{statusMeta.label}</span>
          </span>
        </div>
      </div>

      {/* Title & Location */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {complaint.title}
        </h4>
        {complaint.location?.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate">{complaint.location.address}</span>
          </div>
        )}
      </div>

      {/* Status explanation & Updated time */}
      <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <p className="text-muted-foreground line-clamp-1 flex-1 text-[11px]">{explanation}</p>
        <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground/80 font-medium">
          {assignedAuth?.name && (
            <>
              <span className="hidden sm:inline">Authority: {assignedAuth.name}</span>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            </>
          )}
          <span>
            Updated {new Date(complaint.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main CitizenDashboard Component ──────────────────────────────────────────

export function CitizenDashboard({
  userName,
  onNewComplaint,
  onViewHistory,
  onOpenComplaint,
}: CitizenDashboardProps) {
  const { city } = useCity();
  const { data: statsData, isLoading: statsLoading } = useCitizenStats();
  const {
    data: complaintsData,
    isLoading: complaintsLoading,
    isError: complaintsError,
    refetch: refetchComplaints,
  } = useMyCitizenComplaints({ limit: 6, page: 1 });

  const { data: unreadCounts = {} } = useMyComplaintUnreadCounts();

  const stats = statsData?.stats;
  const recentComplaints = complaintsData?.complaints ?? [];

  // Active = pending + active (in-progress)
  const activeCount = (stats?.pending ?? 0) + (stats?.active ?? 0);
  // Awaiting action = awaiting citizen review (status: awaiting_citizen_review or resolved)
  const awaitingActionCount = stats?.resolved ?? 0;
  // Resolved/Completed = closed
  const completedCount = stats?.closed ?? 0;
  const totalCount = stats?.total ?? 0;

  // Build activity feed
  const activityEvents = useMemo(
    () => complaintsToActivityFeed(recentComplaints, 8),
    [recentComplaints],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const cityNameDisplay = city.name || "Belagavi";
  const countryNameDisplay = city.country || "India";

  // Environmental visual context
  const currentHour = new Date().getHours();
  const timeSlot = getTimeSlot(currentHour);
  const weatherProxy = getWeatherProxy({
    humidity: city.humidity,
    windSpeed: city.windSpeed,
    temp: city.temp,
  });
  const cityHeroImage = resolveHeroImage(city.id, timeSlot, weatherProxy);

  return (
    <div className="space-y-6">
      {/* ── 1. WELCOME / CITY CONTEXT (Compact, calm, NO duplicate Report button) ── */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 sm:p-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Citizen Hub
            </span>
            <span className="text-muted-foreground/40">·</span>
            <div className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <MapPin className="size-3" />
              <span>
                {cityNameDisplay}, {countryNameDisplay}
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {userName.split(" ")[0]}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Stay updated on the environmental issues you've reported and your city's status.
          </p>
        </div>
      </div>

      {/* ── 2. COMPLAINT OVERVIEW (4 Clickable summary cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <ComplaintSummaryCard
              label="Active Reports"
              value={activeCount}
              tone="info"
              icon={Clock}
              hint="Under review or investigation"
              onClick={() => onViewHistory("in-progress")}
            />
            <ComplaintSummaryCard
              label="Awaiting Your Action"
              value={awaitingActionCount}
              tone="warning"
              icon={AlertCircle}
              hint="Ready for your review"
              onClick={() => onViewHistory("awaiting_citizen_review")}
            />
            <ComplaintSummaryCard
              label="Resolved & Closed"
              value={completedCount}
              tone="success"
              icon={CheckCircle2}
              hint="Officially closed"
              onClick={() => onViewHistory("closed")}
            />
            <ComplaintSummaryCard
              label="Total Complaints"
              value={totalCount}
              tone="primary"
              icon={FileText}
              hint="All-time reports"
              onClick={() => onViewHistory("")}
            />
          </>
        )}
      </div>

      {/* ── 3. QUICK ACTIONS (Clean, accessible, real public-service focus) ── */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-4 shadow-sm space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Quick Actions
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onViewHistory("")}
            className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40 hover:border-primary/40 text-xs font-medium text-foreground transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="size-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">My Complaints</div>
                <div className="text-[10px] text-muted-foreground">View all case records</div>
              </div>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <Link
            to="/profile"
            className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40 hover:border-primary/40 text-xs font-medium text-foreground transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User className="size-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">My Profile</div>
                <div className="text-[10px] text-muted-foreground">Account & contact settings</div>
              </div>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>

          <Link
            to="/environment"
            className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40 hover:border-primary/40 text-xs font-medium text-foreground transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Search className="size-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">City Environment Status</div>
                <div className="text-[10px] text-muted-foreground">Live air & water quality</div>
              </div>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>
      </div>

      {/* ── 4 & 5 & 6: MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT 2 COLS: 4. MY COMPLAINTS & 6. RECENT ACTIVITY ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4. MY COMPLAINTS (Core section) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">My Complaints</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track progress, authority updates, and the outcome of your reports.
                </p>
              </div>
              {recentComplaints.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary gap-1 shrink-0"
                  onClick={() => onViewHistory("")}
                >
                  View all ({totalCount})
                  <ArrowRight className="size-3" />
                </Button>
              )}
            </div>

            {complaintsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
                ))}
              </div>
            ) : recentComplaints.length === 0 ? (
              <NoComplaintsEmpty onSubmit={onNewComplaint} compact />
            ) : (
              <div className="space-y-3">
                {recentComplaints.slice(0, 4).map((c) => (
                  <DashboardComplaintCard
                    key={c._id}
                    complaint={c}
                    unreadCount={unreadCounts[c._id] ?? 0}
                    onClick={() => onOpenComplaint(c._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 6. RECENT ACTIVITY (Service timeline) */}
          <div className="pt-2">
            <Panel
              eyebrow="Timeline"
              title="Recent Activity"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onViewHistory("")}
                >
                  View all
                </Button>
              }
            >
              {recentComplaints.length === 0 && !complaintsLoading && !complaintsError ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No activity recorded yet.
                </p>
              ) : (
                <ActivityFeed
                  events={activityEvents}
                  isLoading={complaintsLoading}
                  isError={complaintsError}
                  onRetry={() => refetchComplaints()}
                  onEventClick={(complaintId?: string) => {
                    if (complaintId) onOpenComplaint(complaintId);
                  }}
                  maxItems={6}
                  compact
                />
              )}
            </Panel>
          </div>
        </div>

        {/* ── RIGHT COL: 5. CITY ENVIRONMENT SNAPSHOT ── */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur overflow-hidden shadow-sm flex flex-col justify-between">
            {/* Supporting environmental visual context (if city image is available) */}
            {cityHeroImage && (
              <div className="relative h-28 w-full overflow-hidden bg-muted">
                <img
                  src={cityHeroImage}
                  alt={`${cityNameDisplay} City Environment`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Building2 className="size-3.5 text-primary" />
                    <span>{cityNameDisplay}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                    Live Telemetry
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 space-y-3.5">
              {!cityHeroImage && (
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    City Environment Snapshot
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">{cityNameDisplay}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {/* AQI Metric */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-medium">
                    <Wind className="size-3" />
                    AQI
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {city.aqi || 68}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">
                    {city.aqi <= 50 ? "Good air quality" : city.aqi <= 100 ? "Moderate air" : "Unhealthy air"}
                  </div>
                </div>

                {/* Temperature & Humidity */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-medium">
                    <Thermometer className="size-3" />
                    Temp & Humidity
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {city.temp || 26}°C
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Droplets className="size-2.5" />
                    {city.humidity || 58}% Humidity
                  </div>
                </div>
              </div>

              {/* Active alert or all-clear */}
              {city.alerts > 0 ? (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2.5 text-xs text-warning">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                  <span>{city.alerts} active environmental advisory in your region.</span>
                </div>
              ) : (
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-center gap-2 text-xs text-success">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>No severe environmental advisories active.</span>
                </div>
              )}

              <Link
                to="/environment"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 text-xs font-semibold text-primary transition-colors text-center"
              >
                <span>View Environmental Status</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
