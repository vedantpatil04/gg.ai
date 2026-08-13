import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { complaintApi } from "@/lib/api/services.api";
import client from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplaintStatus =
  | "pending"
  | "in-progress"
  | "awaiting_citizen_review"
  | "resolved"
  | "rework"
  | "rejected"
  | "closed";

export type ComplaintSeverity = "low" | "medium" | "high" | "critical";

export interface ComplaintEvent {
  type: string;
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

export interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  /** Only present on the assigned authority, and only when they've set one. */
  phone?: string;
}

export interface CitizenComplaint {
  _id: string;
  title: string;
  description: string;
  issueType: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  cityId: string;
  location?: { address?: string; lat?: number; lng?: number };
  images: string[];
  submittedBy: PopulatedUser | string;
  assignedTo?: PopulatedUser | null;
  assignedAt?: string;
  assignedByName?: string;
  resolution?: string;
  resolvedAt?: string;
  verifiedBy?: PopulatedUser | null;
  verifiedAt?: string;
  verifiedByName?: string;
  reworkCount?: number;
  events: ComplaintEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CitizenStats {
  total: number;
  pending: number;
  active: number;
  resolved: number;
  closed: number;
  rejected: number;
  thisMonth: number;
  avgResolutionDays: number | null;
}

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  count: number;
}

export interface CategoryBreakdownItem {
  issueType: string;
  count: number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CITIZEN_KEYS = {
  stats: ["citizen-stats"] as const,
  complaints: (params: Record<string, unknown>) => ["citizen-complaints", params] as const,
  complaint: (id: string) => ["citizen-complaint", id] as const,
};

// ─── Stats hook ───────────────────────────────────────────────────────────────

export function useCitizenStats() {
  const { isAuthenticated, user } = useAuth();
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: CITIZEN_KEYS.stats,
    queryFn: () =>
      client.get("/citizen/stats").then(
        (r) =>
          r.data.data as {
            stats: CitizenStats;
            monthlyTrend: MonthlyTrendPoint[];
            categoryBreakdown: CategoryBreakdownItem[];
          },
      ),
    staleTime: 30_000,
    enabled: isAuthenticated && isApiConnected && user?.role === "citizen",
    throwOnError: false,
  });
}

// ─── My complaints (paginated) ────────────────────────────────────────────────

export interface ComplaintListParams {
  page?: number;
  limit?: number;
  status?: string;
  issueType?: string;
  severity?: string;
  search?: string;
}

export function useMyCitizenComplaints(params: ComplaintListParams = {}) {
  const { isAuthenticated } = useAuth();
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: CITIZEN_KEYS.complaints(params as Record<string, unknown>),
    queryFn: () =>
      complaintApi
        .getAll({ ...params, limit: params.limit ?? 20, page: params.page ?? 1 })
        .then(
          (r) =>
            r.data as {
              complaints: CitizenComplaint[];
              pagination: { page: number; limit: number; total: number; pages: number };
            },
        ),
    staleTime: 20_000,
    enabled: isAuthenticated && isApiConnected,
    throwOnError: false,
  });
}

// ─── Single complaint ─────────────────────────────────────────────────────────

export function useCitizenComplaint(id: string | null) {
  const { isAuthenticated } = useAuth();
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: CITIZEN_KEYS.complaint(id ?? ""),
    queryFn: () =>
      complaintApi.getOne(id!).then((r) => r.data.complaint as CitizenComplaint),
    staleTime: 15_000,
    enabled: isAuthenticated && isApiConnected && !!id,
    throwOnError: false,
  });
}

// ─── Submit complaint mutation ────────────────────────────────────────────────

export interface SubmitComplaintPayload {
  title: string;
  description: string;
  issueType: string;
  severity: string;
  cityId: string;
  address?: string;
  /** Phase 12: structured location with GPS coordinates */
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
}

export function useSubmitComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitComplaintPayload) =>
      complaintApi.create({
        title: payload.title,
        description: payload.description,
        issueType: payload.issueType,
        severity: payload.severity,
        cityId: payload.cityId,
        location: payload.location ?? (payload.address ? { address: payload.address } : undefined),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizen-complaints"] });
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.stats });
      qc.invalidateQueries({ queryKey: ["my-complaints"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? "Failed to submit complaint. Please try again.");
    },
  });
}

// ─── Upload images mutation ───────────────────────────────────────────────────

export function useUploadComplaintImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      complaintApi.uploadImages(id, files),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.complaint(vars.id) });
      qc.invalidateQueries({ queryKey: ["citizen-complaints"] });
      toast("Evidence uploaded successfully.");
    },
    onError: () => toast("Failed to upload images. Please try again."),
  });
}

// ─── Citizen Review — accept resolution ───────────────────────────────────────

export function useAcceptResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complaintApi.acceptResolution(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.complaint(id) });
      qc.invalidateQueries({ queryKey: ["citizen-complaints"] });
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.stats });
      toast("Resolution accepted — complaint closed.");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? "Failed to accept resolution. Please try again.");
    },
  });
}

// ─── Citizen Review — request rework ──────────────────────────────────────────

export function useCitizenRequestRework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, comments }: { id: string; reason: string; comments?: string }) =>
      complaintApi.citizenRequestRework(id, { reason, comments }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.complaint(vars.id) });
      qc.invalidateQueries({ queryKey: ["citizen-complaints"] });
      qc.invalidateQueries({ queryKey: CITIZEN_KEYS.stats });
      toast("Rework requested — an administrator will review it.");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? "Failed to request rework. Please try again.");
    },
  });
}
