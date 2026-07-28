import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { adminApi, alertApi, complaintApi, healthApi } from "@/lib/api/services.api";
import { commandApi } from "@/lib/api/command.api";

export const ADMIN_DASHBOARD_QUERY_KEYS = [
  ["admin-stats"],
  ["admin-cities"],
  ["command-executive-dashboard"],
  ["command-complaint-intelligence"],
  ["admin-authority-requests", "pending"],
  ["admin-active-authorities"],
  ["alerts-active-network"],
  ["admin-recent-complaints"],
  ["platform-health"],
  ["admin-workload"], // Phase 3B
] as const;

export function useRefreshAdminDashboard() {
  const qc = useQueryClient();
  return () => ADMIN_DASHBOARD_QUERY_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key }));
}

export function useAdminStats() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.getStats().then((r) => r.data),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAdminCities() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-cities"],
    queryFn: () => adminApi.getCities().then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAdminExecutiveDashboard() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["command-executive-dashboard"],
    queryFn: () => commandApi.getExecutiveDashboard(),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAdminComplaintIntelligence() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["command-complaint-intelligence"],
    queryFn: () => commandApi.getComplaintIntelligence(),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function usePendingAuthorityRequests() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-authority-requests", "pending"],
    queryFn: () =>
      adminApi.getAuthorityRequests({ status: "pending", limit: 1 }).then((r) => r.data),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useActiveAuthorities() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-active-authorities"],
    queryFn: () =>
      adminApi.getUsers({ role: "authority", isActive: true, limit: 1 }).then((r) => r.data),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useActiveAlertsNetwork() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["alerts-active-network"],
    queryFn: () => alertApi.getActive().then((r) => r.data.alerts),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useRecentComplaints() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-recent-complaints"],
    queryFn: () => complaintApi.getAll({ limit: 5 }).then((r) => r.data.complaints),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["platform-health"],
    queryFn: () => healthApi.check(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    throwOnError: false,
  });
}

/** Phase 3B — authority workload: open case counts per authority + unassigned backlog. */
export function useAuthorityWorkload() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-workload"],
    queryFn: () => adminApi.getWorkload().then((r) => r.data),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}
