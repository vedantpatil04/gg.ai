import { Users, ShieldCheck, ClipboardList, Building2, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatCard } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats, useAdminCities } from "./admin-dashboard-queries";

interface UsersByRole {
  _id: string;
  count: number;
}

/**
 * The four required overview metrics (Total Users, Total Authorities, Total
 * Complaints, Cities Monitored) plus one bonus metric that's already free
 * from the same /admin/stats call (Active Alerts). "Active Users",
 * "Resolved Complaints", and "AI Requests Processed" are intentionally not
 * shown here — no existing endpoint counts them without an extra query per
 * metric, and Resolved Complaints already has a proper home in the
 * Complaint Intelligence Summary panel below, so it isn't duplicated here.
 */
export function AdminPlatformStats() {
  const stats = useAdminStats();
  const cities = useAdminCities();

  if (stats.isLoading || cities.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[116px] sm:h-[124px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (stats.isError || cities.isError || !stats.data) {
    return (
      <p className="text-sm text-destructive">Couldn't load platform statistics. Try refreshing.</p>
    );
  }

  const usersByRole = (stats.data.usersByRole ?? []) as UsersByRole[];
  const totalAuthorities = usersByRole.find((r) => r._id === "authority")?.count ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Phase 2.4 — the one card that navigates, to the new User Directory */}
      <Link to="/admin/users" className="block rounded-2xl transition-opacity hover:opacity-90 active:scale-[0.99]">
        <StatCard
          label="Total Users"
          value={stats.data.users ?? 0}
          icon={<Users className="size-4" />}
        />
      </Link>
      <StatCard
        label="Total Authorities"
        value={totalAuthorities}
        icon={<ShieldCheck className="size-4" />}
      />
      <StatCard
        label="Total Complaints"
        value={stats.data.complaints ?? 0}
        icon={<ClipboardList className="size-4" />}
      />
      {/* Phase 2.6 — the second navigable card, to the new City Directory */}
      <Link to="/admin/cities" className="block rounded-2xl transition-opacity hover:opacity-90 active:scale-[0.99]">
        <StatCard
          label="Cities Monitored"
          value={cities.data?.total ?? 0}
          icon={<Building2 className="size-4" />}
        />
      </Link>
      <div className="col-span-2 sm:col-span-1">
        <StatCard
          label="Active Alerts"
          value={stats.data.activeAlerts ?? 0}
          icon={<AlertTriangle className="size-4" />}
          accent="warning"
        />
      </div>
    </div>
  );
}
