import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import client from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformAdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "citizen" | "authority" | "administrator";
  approvalStatus: "approved" | "pending" | "rejected";
  isActive: boolean;
  isVerified: boolean;
  organization?: string;
  city?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAdminCity {
  _id: string;
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string;
  isActive: boolean;
  createdAt: string;
  complaintCount: number;
  alertCount: number;
  authorityCount: number;
}

export interface AuditEntry {
  id: string;
  who: string;
  whoId: string;
  action: string;
  target: string;
  targetId?: string;
  status: "success" | "failure";
  detail?: string;
  at: string;
}

export interface ServiceStatus {
  name: string;
  status: string;
  detail?: string;
}

export interface SystemHealth {
  timestamp: string;
  database: { connected: boolean; state: string };
  aiEnabled: boolean;
  scheduler: { enabled: boolean; running?: boolean; lastRunAt?: string; lastRunResult?: { success: number; failed: number } };
  dataFreshMinutes: number | null;
  system: {
    uptimeSeconds: number;
    totalMemMb: number;
    usedMemMb: number;
    memUsedPct: number;
    loadAvg: number[] | null;
    platform: string;
    nodeVersion: string;
  };
  services: ServiceStatus[];
}

export interface PlatformConfig {
  platform: { name: string; environment: string; version: string; frontendUrl: string; port: string };
  features: { aiEnabled: boolean; schedulerEnabled: boolean; emailEnabled: boolean; uploadsEnabled: boolean };
  security: { sessionTimeoutDays: number; maxFailedLogins: number; accountLockMinutes: number; twoFactorAvailable: boolean };
  complaints: { allowedIssueTypes: string[]; severityLevels: string[] };
}

export interface ExecutiveDashboardData {
  users: { total: number; citizens: number; authorities: number; administrators: number; active: number };
  cities: { total: number; active: number };
  complaints: { total: number; open: number; closed: number; resolutionRate: number; avgResolutionDays: number | null };
  alerts: { active: number; critical: number };
  pendingAuthorities: number;
  platformHealth: { database: boolean; ai: boolean; scheduler: boolean; dataFreshMinutes: number | null; dataFreshOk: boolean };
  insights: Array<{ type: "critical" | "warning" | "info"; message: string }>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const api = {
  executiveDashboard: () => client.get("/platform-admin/executive-dashboard").then(r => r.data.data as ExecutiveDashboardData),
  users: (params?: Record<string, unknown>) => client.get("/platform-admin/users", { params }).then(r => r.data.data as { users: PlatformAdminUser[]; pagination: { page: number; limit: number; total: number; pages: number } }),
  updateUser: (id: string, data: Record<string, unknown>) => client.patch(`/platform-admin/users/${id}`, data).then(r => r.data),
  lockUser: (id: string) => client.post(`/platform-admin/users/${id}/lock`).then(r => r.data),
  unlockUser: (id: string) => client.post(`/platform-admin/users/${id}/unlock`).then(r => r.data),
  cities: () => client.get("/platform-admin/cities").then(r => r.data.data as { cities: PlatformAdminCity[]; total: number }),
  createCity: (data: Record<string, unknown>) => client.post("/platform-admin/cities", data).then(r => r.data),
  updateCity: (id: string, data: Record<string, unknown>) => client.patch(`/platform-admin/cities/${id}`, data).then(r => r.data),
  toggleCity: (id: string) => client.patch(`/platform-admin/cities/${id}/toggle`).then(r => r.data),
  audit: (params?: Record<string, unknown>) => client.get("/platform-admin/audit", { params }).then(r => r.data.data as { entries: AuditEntry[]; pagination: { page: number; limit: number; total: number; pages: number } }),
  systemHealth: () => client.get("/platform-admin/system-health").then(r => r.data.data as SystemHealth),
  config: () => client.get("/platform-admin/config").then(r => r.data.data as PlatformConfig),
};

// ─── Queries ──────────────────────────────────────────────────────────────────

function errMsg(err: unknown) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export function useExecutiveDashboard() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p6-executive-dashboard"],
    queryFn: api.executiveDashboard,
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function usePlatformAdminUsers(params: {
  page?: number; limit?: number; search?: string; role?: string;
  isActive?: boolean; isVerified?: boolean; sortBy?: string; sortDir?: "asc" | "desc";
} = {}) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p6-users", params],
    queryFn: () => api.users(params as Record<string, unknown>),
    staleTime: 20_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function usePlatformAdminCities() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p6-cities"],
    queryFn: api.cities,
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAuditLog(params: { page?: number; limit?: number; search?: string; action?: string } = {}) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p6-audit", params],
    queryFn: () => api.audit(params as Record<string, unknown>),
    staleTime: 15_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["p6-system-health"],
    queryFn: api.systemHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
    throwOnError: false,
  });
}

export function usePlatformConfig() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["p6-config"],
    queryFn: api.config,
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["p6-users"] }); qc.invalidateQueries({ queryKey: ["p6-executive-dashboard"] }); toast("User updated."); },
    onError: (err) => toast(errMsg(err) ?? "Failed to update user."),
  });
}

export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.lockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["p6-users"] }); toast("Account locked for 24 hours."); },
    onError: (err) => toast(errMsg(err) ?? "Failed to lock account."),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unlockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["p6-users"] }); toast("Account unlocked."); },
    onError: (err) => toast(errMsg(err) ?? "Failed to unlock account."),
  });
}

export function useCreateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCity(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p6-cities"] });
      qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] });
      qc.invalidateQueries({ queryKey: ["p6-executive-dashboard"] });
      toast("City created successfully.");
    },
    onError: (err) => toast(errMsg(err) ?? "Failed to create city."),
  });
}

export function useUpdateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.updateCity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p6-cities"] });
      qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] });
      toast("City updated.");
    },
    onError: (err) => toast(errMsg(err) ?? "Failed to update city."),
  });
}

export function useToggleCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleCity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p6-cities"] });
      qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] });
      toast("City status updated.");
    },
    onError: (err) => toast(errMsg(err) ?? "Failed to toggle city."),
  });
}
