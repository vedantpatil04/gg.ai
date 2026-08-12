import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import { adminApi, authorityMgmtApi } from "@/lib/api/services.api";
import type { AuthorityRequest } from "@/components/admin/authority-requests/authority-request-queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthorityAvailability = "available" | "busy" | "on_leave" | "inactive";
export type CapacityLabel = "free" | "moderate" | "busy" | "overloaded";

export const APPROVAL_PILL: Record<string, "success" | "warning" | "destructive"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

export const CAPACITY_META: Record<CapacityLabel, { label: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  free: { label: "Free", tone: "success" },
  moderate: { label: "Moderate", tone: "warning" },
  busy: { label: "Busy", tone: "warning" },
  overloaded: { label: "Overloaded", tone: "destructive" },
};

export const AVAILABILITY_PILL: Record<string, "success" | "warning" | "info" | "muted"> = {
  available: "success",
  busy: "warning",
  on_leave: "info",
  inactive: "muted",
};

export interface AuthorityWorkload {
  active: number;
  pending: number;
  rework: number;
  resolved: number;
  closed: number;
  total: number;
  capacity: CapacityLabel;
  resolutionRate: number;
  reworkRate?: number;
  verificationWaiting?: number;
}

export interface EnterpriseAuthority extends AuthorityRequest {
  employeeId?: string;
  department?: string;
  designation?: string;
  assignedCities: string[];
  primaryCity?: string;
  specializations: string[];
  availability: AuthorityAvailability;
  workload: AuthorityWorkload;
  avatar?: string;
}

export interface LifecycleEvent {
  event: string;
  description: string;
  performedBy?: string;
  performedByName?: string;
  at: string;
}

export type DirectoryAuthority = EnterpriseAuthority;

export interface AuthorityDirectoryParams {
  isActive?: boolean;
  page: number;
  limit: number;
}

// ─── Legacy alias (backward compat with Phase 3 components) ──────────────────
export function useAuthorityDirectory(params: AuthorityDirectoryParams) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-authority-directory", params.isActive ?? "any", params.page, params.limit],
    queryFn: () =>
      adminApi
        .getUsers({
          role: "authority",
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        })
        .then((r) => r.data as { users: DirectoryAuthority[]; pagination: { page: number; limit: number; total: number; pages: number } }),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

// ─── Phase 4 Queries ──────────────────────────────────────────────────────────

export interface AuthorityListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  approvalStatus?: string;
  isActive?: boolean;
  city?: string;
  availability?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useEnterpriseAuthorityList(params: AuthorityListParams) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p4-authority-list", params],
    queryFn: () =>
      authorityMgmtApi.list(params).then(
        (r) =>
          r.data as {
            authorities: EnterpriseAuthority[];
            pagination: { page: number; limit: number; total: number; pages: number };
          },
      ),
    staleTime: 20_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAuthorityDetail(id: string | null) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p4-authority-detail", id],
    queryFn: () =>
      authorityMgmtApi.getOne(id!).then(
        (r) =>
          r.data as {
            authority: EnterpriseAuthority;
            workload: AuthorityWorkload & { reworkRate: number; verificationWaiting: number };
            cityVolumes: Record<string, number>;
          },
      ),
    staleTime: 15_000,
    enabled: isApiConnected && !!id,
    throwOnError: false,
  });
}

export function useAuthorityDashboard() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p4-authority-dashboard"],
    queryFn: () =>
      authorityMgmtApi.getDashboard().then(
        (r) =>
          r.data as {
            metrics: {
              total: number;
              active: number;
              available: number;
              busy: number;
              overloaded: number;
              onLeave: number;
              inactive: number;
              activeInvestigations: number;
              waitingVerification: number;
              reworkCases: number;
              pendingComplaints: number;
            };
            coverage: {
              totalCities: number;
              coveredCities: number;
              uncoveredCities: number;
              uncoveredCityIds: string[];
              authoritiesPerCity: Record<string, number>;
            };
            leaderboard: Array<{
              _id: string;
              name: string;
              email: string;
              resolutionRate: number;
              total: number;
              active: number;
              capacity: CapacityLabel;
            }>;
            insights: Array<{ type: "warning" | "info" | "critical"; message: string }>;
          },
      ),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAuthorityLifecycleHistory(id: string | null) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p4-authority-lifecycle", id],
    queryFn: () =>
      authorityMgmtApi.getLifecycleHistory(id!).then((r) => r.data as { lifecycleEvents: LifecycleEvent[] }),
    staleTime: 15_000,
    enabled: isApiConnected && !!id,
    throwOnError: false,
  });
}

// ─── Supported cities (jurisdiction source of truth) ──────────────────────────
// Backs the Assigned Cities checklist — the existing 14 GreenGuard cities from
// the City model, never a free-text/typed value. Jurisdiction is an Admin
// governance decision, so the picker must only ever offer real, active cities.
export interface SupportedCity {
  cityId: string;
  name: string;
  country: string;
  isActive: boolean;
}

export function useCityList() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-city-list"],
    queryFn: () =>
      adminApi.getCities().then((r) => (r.data as { cities: SupportedCity[] }).cities.filter((c) => c.isActive)),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["p4-authority-list"] });
  qc.invalidateQueries({ queryKey: ["p4-authority-dashboard"] });
  qc.invalidateQueries({ queryKey: ["admin-authority-directory"] });
  qc.invalidateQueries({ queryKey: ["admin-authority-requests"] });
  qc.invalidateQueries({ queryKey: ["admin-active-authorities"] });
  qc.invalidateQueries({ queryKey: ["admin-stats"] });
}

function mutationErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export function useActivateAuthority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.updateUser(id, { isActive: true }),
    onSuccess: () => { invalidateAll(qc); toast("Authority account activated."); },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Couldn't activate this account. Try again."),
  });
}

export function useDeactivateAuthority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.updateUser(id, { isActive: false }),
    onSuccess: () => { invalidateAll(qc); toast("Authority account deactivated."); },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Couldn't deactivate this account. Try again."),
  });
}

export function usePerformLifecycleAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "activate" | "deactivate" | "suspend" | "reinstate" | "lock" | "unlock";
    }) => authorityMgmtApi.performLifecycleAction(id, action),
    onSuccess: (res: { message?: string } | undefined, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["p4-authority-detail", vars.id] });
      qc.invalidateQueries({ queryKey: ["p4-authority-lifecycle", vars.id] });
      toast((res as { message?: string })?.message ?? "Lifecycle action completed.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Action failed. Try again."),
  });
}

export function useAssignCities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cities, primaryCity }: { id: string; cities: string[]; primaryCity?: string }) =>
      authorityMgmtApi.assignCities(id, cities, primaryCity),
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["p4-authority-detail", vars.id] });
      toast("Cities assigned successfully.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Failed to assign cities."),
  });
}

export function useRemoveCities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cities }: { id: string; cities: string[] }) =>
      authorityMgmtApi.removeCities(id, cities),
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["p4-authority-detail", vars.id] });
      toast("Cities removed successfully.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Failed to remove cities."),
  });
}

export function useSetPrimaryCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, primaryCity }: { id: string; primaryCity: string }) =>
      authorityMgmtApi.setPrimaryCity(id, primaryCity),
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["p4-authority-detail", vars.id] });
      toast("Primary city updated.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Failed to set primary city."),
  });
}

export function useUpdateAuthorityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        department?: string;
        designation?: string;
        employeeId?: string;
        specializations?: string[];
        availability?: string;
        organization?: string;
        phone?: string;
      };
    }) => authorityMgmtApi.updateProfile(id, data),
    onSuccess: (_res, vars) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["p4-authority-detail", vars.id] });
      toast("Profile updated.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Failed to update profile."),
  });
}

export function useBulkOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      action: "activate" | "deactivate" | "assign_cities" | "remove_cities";
      ids: string[];
      cities?: string[];
    }) => authorityMgmtApi.bulk(data),
    onSuccess: (res: { message?: string } | undefined) => {
      invalidateAll(qc);
      toast((res as { message?: string })?.message ?? "Bulk operation completed.");
    },
    onError: (err) => toast(mutationErrorMessage(err) ?? "Bulk operation failed."),
  });
}
