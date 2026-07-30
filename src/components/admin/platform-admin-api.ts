import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import client from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformUser {
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
  department?: string;
  designation?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOverview {
  users: { total: number; citizens: number; authorities: number; admins: number; active: number };
  cities: { total: number; active: number };
  complaints: { total: number; open: number; closed: number; resolutionRate: number; avgResolutionDays: number | null };
  alerts: { active: number; critical: number };
  pendingAuthorities: number;
  platform: { database: boolean; ai: boolean; scheduler: boolean; dataFreshOk: boolean; dataFreshMinutes: number | null };
  insights: Array<{ type: "critical" | "warning" | "info"; message: string }>;
}

export interface SystemHealth {
  timestamp: string;
  database: { connected: boolean; state: string };
  aiEnabled: boolean;
  scheduler: { enabled: boolean; running?: boolean; lastRunAt?: string; lastRunResult?: { success: number; failed: number } };
  dataFreshMinutes: number | null;
  system: { uptimeSeconds: number; totalMemMb: number; usedMemMb: number; memUsedPct: number; loadAvg: number[] | null; platform: string; nodeVersion: string };
  services: Array<{ name: string; status: string; detail?: string }>;
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

export interface PlatformConfig {
  platform: { name: string; environment: string; version: string; frontendUrl: string; port: string };
  features: { aiEnabled: boolean; schedulerEnabled: boolean; emailEnabled: boolean; uploadsEnabled: boolean };
  security: { sessionTimeoutDays: number; maxFailedLogins: number; accountLockMinutes: number; twoFactorAvailable: boolean };
  complaints: { allowedIssueTypes: string[]; severityLevels: string[] };
}

export interface PlatformAnalytics {
  complaintsByStatus: Array<{ status: string; count: number }>;
  complaintsByCategory: Array<{ issueType: string; count: number }>;
  complaintsByMonth: Array<{ year: number; month: number; count: number }>;
  usersByRole: Array<{ role: string; count: number }>;
  cityComplaintCounts: Array<{ cityId: string; count: number }>;
  authorityPerformance: Array<{ name: string; total: number; closed: number; resolutionRate: number }>;
}

// ─── Raw API calls ────────────────────────────────────────────────────────────

const paApi = {
  overview: () => client.get("/platform-admin/overview").then(r => r.data.data as PlatformOverview),
  users: (p?: Record<string, unknown>) => client.get("/platform-admin/users", { params: p }).then(r => r.data.data as { users: PlatformUser[]; pagination: { page: number; limit: number; total: number; pages: number } }),
  updateUser: (id: string, d: Record<string, unknown>) => client.patch(`/platform-admin/users/${id}`, d).then(r => r.data),
  lockUser: (id: string) => client.post(`/platform-admin/users/${id}/lock`).then(r => r.data),
  unlockUser: (id: string) => client.post(`/platform-admin/users/${id}/unlock`).then(r => r.data),
  systemHealth: () => client.get("/platform-admin/system-health").then(r => r.data.data as SystemHealth),
  audit: (p?: Record<string, unknown>) => client.get("/platform-admin/audit", { params: p }).then(r => r.data.data as { entries: AuditEntry[]; pagination: { page: number; limit: number; total: number; pages: number } }),
  config: () => client.get("/platform-admin/config").then(r => r.data.data as PlatformConfig),
  analytics: () => client.get("/platform-admin/analytics").then(r => r.data.data as PlatformAnalytics),
};

function errMsg(e: unknown) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePlatformOverview() {
  const { isApiConnected } = useCity();
  return useQuery({ queryKey: ["pa-overview"], queryFn: paApi.overview, staleTime: 30_000, enabled: isApiConnected, throwOnError: false });
}

export function usePlatformUsers(params: {
  page?: number; limit?: number; search?: string; role?: string;
  isActive?: boolean; isVerified?: boolean; sortBy?: string; sortDir?: "asc" | "desc";
} = {}) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["pa-users", params],
    queryFn: () => paApi.users(params as Record<string, unknown>),
    staleTime: 20_000, enabled: isApiConnected, throwOnError: false,
  });
}

export function useSystemHealth() {
  return useQuery({ queryKey: ["pa-system-health"], queryFn: paApi.systemHealth, staleTime: 30_000, refetchInterval: 60_000, throwOnError: false });
}

export function useAuditLog(params: { page?: number; limit?: number; search?: string; action?: string } = {}) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["pa-audit", params],
    queryFn: () => paApi.audit(params as Record<string, unknown>),
    staleTime: 15_000, enabled: isApiConnected, throwOnError: false,
  });
}

export function usePlatformConfig() {
  const { isApiConnected } = useCity();
  return useQuery({ queryKey: ["pa-config"], queryFn: paApi.config, staleTime: 5 * 60_000, enabled: isApiConnected, throwOnError: false });
}

export function usePlatformAnalytics() {
  const { isApiConnected } = useCity();
  return useQuery({ queryKey: ["pa-analytics"], queryFn: paApi.analytics, staleTime: 60_000, enabled: isApiConnected, throwOnError: false });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => paApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pa-users"] }); qc.invalidateQueries({ queryKey: ["pa-overview"] }); qc.invalidateQueries({ queryKey: ["admin-users-directory"] }); toast("User updated."); },
    onError: (e) => toast(errMsg(e) ?? "Failed to update user."),
  });
}

export function useLockPlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paApi.lockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pa-users"] }); toast("Account locked for 24 hours."); },
    onError: (e) => toast(errMsg(e) ?? "Failed to lock account."),
  });
}

export function useUnlockPlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paApi.unlockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pa-users"] }); toast("Account unlocked."); },
    onError: (e) => toast(errMsg(e) ?? "Failed to unlock account."),
  });
}
