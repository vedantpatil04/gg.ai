import { Users, ShieldCheck, ClipboardList, Building2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminStats, useAdminCities } from "./admin-dashboard-queries";

interface UsersByRole {
  _id: string;
  count: number;
}

interface StatTileProps {
  label: string;
  value: number | string;
  hint: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "info" | "warning" | "success" | "purple";
  badge?: string;
  isAlert?: boolean;
}

function StatTile({
  label,
  value,
  hint,
  to,
  icon: Icon,
  accent = "primary",
  badge,
  isAlert = false,
}: StatTileProps) {
  const accentStyles = {
    primary: {
      iconBg: "bg-primary/10 text-primary border-primary/20",
      hoverBorder: "hover:border-primary/40",
      glow: "group-hover:bg-primary/5",
    },
    info: {
      iconBg: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      hoverBorder: "hover:border-sky-500/40",
      glow: "group-hover:bg-sky-500/5",
    },
    purple: {
      iconBg: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      hoverBorder: "hover:border-violet-500/40",
      glow: "group-hover:bg-violet-500/5",
    },
    warning: {
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
      glow: "group-hover:bg-amber-500/5",
    },
    success: {
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/40",
      glow: "group-hover:bg-emerald-500/5",
    },
  }[accent];

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border/70 bg-card/70 hover:bg-card",
        "transition-all duration-150 shadow-2xs hover:shadow-xs outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        accentStyles.hoverBorder,
        isAlert && Number(value) > 0 && "border-amber-500/40 bg-amber-500/[0.03]",
      )}
    >
      {/* Top row: Label + Icon & Hover Indicator */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80 truncate">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <div
            className={cn(
              "size-7 rounded-lg border grid place-items-center transition-transform duration-150 group-hover:scale-105",
              accentStyles.iconBg,
            )}
          >
            <Icon className="size-3.5 shrink-0" />
          </div>
          <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 hidden sm:block" />
        </div>
      </div>

      {/* Value row */}
      <div className="my-2.5 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none font-display">
          {value}
        </div>
        {badge && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {/* Bottom row: Subtitle context */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/75 truncate pt-1 border-t border-border/40">
        <span className="truncate">{hint}</span>
        <span className="text-[10px] text-primary/80 group-hover:text-primary font-medium transition-colors hidden xl:inline">
          View &rarr;
        </span>
      </div>
    </Link>
  );
}

/**
 * Top statistics cards for the Administrator Dashboard.
 * All 5 cards are interactive and route directly to their corresponding directories/modules.
 */
export function AdminPlatformStats() {
  const stats = useAdminStats();
  const cities = useAdminCities();

  if (stats.isLoading || cities.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] sm:h-[128px] rounded-xl sm:rounded-2xl" />
        ))}
      </div>
    );
  }

  if (stats.isError || cities.isError || !stats.data) {
    return (
      <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive flex items-center justify-between">
        <span>Couldn't load platform statistics. Try refreshing the dashboard.</span>
      </div>
    );
  }

  const usersByRole = (stats.data.usersByRole ?? []) as UsersByRole[];
  const totalAuthorities = usersByRole.find((r) => r._id === "authority")?.count ?? 0;
  const activeAlerts = stats.data.activeAlerts ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. Total Users -> User Directory */}
      <StatTile
        label="Total Users"
        value={stats.data.users ?? 0}
        hint="Citizens & accounts"
        to="/admin/users"
        icon={Users}
        accent="primary"
      />

      {/* 2. Total Authorities -> Authority Directory */}
      <StatTile
        label="Authorities"
        value={totalAuthorities}
        hint="Active agency staff"
        to="/admin/authorities"
        icon={ShieldCheck}
        accent="purple"
      />

      {/* 3. Total Complaints -> Complaint Queue */}
      <StatTile
        label="Complaints"
        value={stats.data.complaints ?? 0}
        hint="Logged platform cases"
        to="/admin/complaints"
        icon={ClipboardList}
        accent="info"
      />

      {/* 4. Cities Monitored -> City Directory */}
      <StatTile
        label="Cities"
        value={cities.data?.total ?? 0}
        hint="Active sensor networks"
        to="/admin/cities"
        icon={Building2}
        accent="success"
      />

      {/* 5. Active Alerts -> Environmental Monitoring */}
      <div className="col-span-2 sm:col-span-1">
        <StatTile
          label="Active Alerts"
          value={activeAlerts}
          hint={activeAlerts > 0 ? "Advisories active" : "Network normal"}
          to="/admin/environmental-monitoring"
          icon={AlertTriangle}
          accent="warning"
          badge={activeAlerts > 0 ? "Action needed" : undefined}
          isAlert={activeAlerts > 0}
        />
      </div>
    </div>
  );
}

