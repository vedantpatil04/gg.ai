/**
 * adminGovernance.api.ts
 *
 * Automation 6 & 7 — Frontend API Client for Admin Governance, ML Analytics,
 * and Priority Intelligence / Critical Escalation.
 */

import client from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GovernanceFilterParams {
  timeRange?: "7d" | "30d" | "90d" | "all";
  cityId?: string;
}

export interface GovernanceExceptionItem {
  id: string;
  complaintId: string;
  refId: string;
  title: string;
  category: string;
  cityId: string;
  department?: string;
  severity: string;
  status: string;
  exceptionType:
    | "critical_escalation"
    | "routing_failed"
    | "manual_assignment_required"
    | "rework_requested"
    | "verification_required"
    | "coverage_gap"
    | "low_confidence_prediction";
  reason: string;
  assignmentSource?: string;
  assignedAuthority?: { id: string; name: string; email: string };
  reworkCount?: number;
  confidence?: number;
  priorityScore?: number;
  escalationStatus?: string;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
  actionUrl: string;
}

export interface MLAnalyticsData {
  totalPredictions: number;
  successfulPredictions: number;
  failedPredictions: number;
  successRate: number;
  averageConfidence: number;
  confidenceDistribution: {
    high: { count: number; percentage: number; threshold: string };
    moderate: { count: number; percentage: number; threshold: string };
    low: { count: number; percentage: number; threshold: string };
  };
  predictedCategories: Array<{ category: string; count: number; percentage: number; avgConfidence: number }>;
  predictedDepartments: Array<{ department: string; count: number; percentage: number; avgConfidence: number }>;
  predictedSeverities: Array<{ severity: string; count: number; percentage: number; avgConfidence: number }>;
  modelVersions: Array<{ version: string; count: number; percentage: number }>;
  failureReasons: Array<{ reason: string; count: number }>;
  recentPredictions: Array<{
    id: string;
    complaintId: string;
    status: string;
    category?: string;
    department?: string;
    severity?: string;
    confidence?: number;
    modelVersion: string;
    predictionTime: string;
    reasons: string[];
    failureReason?: string;
  }>;
}

export interface RoutingAnalyticsData {
  totalRouted: number;
  autoAssigned: number;
  pendingRouting: number;
  failedRouting: number;
  autoAssignmentRate: number;
  confidenceTierBreakdown: {
    high: { count: number; assignedCount: number; rate: number };
    moderate: { count: number; assignedCount: number; rate: number };
    low: { count: number; assignedCount: number; rate: number };
  };
  humanOverrides: {
    totalComplaints: number;
    automaticAssignments: number;
    manualAssignments: number;
    manualReassignments: number;
    manualInterventionRate: number;
  };
  routingFailuresBreakdown: Array<{ reason: string; count: number }>;
  routingByCity: Array<{ cityId: string; total: number; autoAssigned: number; rate: number }>;
}

export interface ReworkAnalyticsData {
  totalComplaints: number;
  totalReworkCases: number;
  reworkRate: number;
  currentReworkQueue: number;
  awaitingCitizenReview: number;
  citizenAcceptedCount: number;
  adminVerifiedCount: number;
  repeatedReworkCount: number;
  acceptanceVsReworkRatio: {
    accepted: number;
    rework: number;
    acceptanceRate: number;
  };
  reworkByCategory: Array<{ category: string; count: number; rate: number }>;
  reworkByCity: Array<{ cityId: string; count: number; totalCityComplaints: number; rate: number }>;
  avgResolutionCycles: number;
}

export interface PriorityAnalyticsData {
  totalAssessed: number;
  priorityDistribution: {
    critical: { count: number; percentage: number };
    high: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    low: { count: number; percentage: number };
  };
  escalationStatusBreakdown: {
    escalated: number;
    acknowledged: number;
    resolved: number;
    not_escalated: number;
  };
  escalationRate: number;
  averagePriorityScore: number;
  criticalByCity: Array<{ cityId: string; count: number }>;
  criticalByCategory: Array<{ category: string; count: number }>;
  recentEscalations: Array<{
    id: string;
    complaintId: string;
    title: string;
    cityId: string;
    priorityLevel: string;
    priorityScore: number;
    escalationStatus: string;
    reasons: string[];
    escalatedAt?: string;
  }>;
}

export interface GovernanceOverviewData {
  summary: {
    activeExceptions: number;
    criticalEscalations: number;
    routingFailures: number;
    activeReworkCases: number;
    pendingVerifications: number;
    coverageGaps: number;
    autoAssignmentRate: number;
    averageMLConfidence: number;
    averagePriorityScore: number;
  };
  exceptions: GovernanceExceptionItem[];
  mlAnalytics: MLAnalyticsData;
  routingAnalytics: RoutingAnalyticsData;
  reworkAnalytics: ReworkAnalyticsData;
  priorityAnalytics: PriorityAnalyticsData;
  boardCoverage: {
    totalAuthorities: number;
    availableAuthorities: number;
    coverageGaps: string[];
    boardStatus: "optimal" | "warning" | "critical";
  };
}

export interface PriorityIntelligenceData {
  complaintId: string;
  priorityLevel: "low" | "medium" | "high" | "critical";
  priorityScore: number;
  escalationLevel: "none" | "attention" | "urgent" | "critical";
  escalationStatus: "not_escalated" | "escalated" | "acknowledged" | "resolved";
  reasons: string[];
  escalatedAt?: string;
  assessment?: {
    _id: string;
    priorityLevel: string;
    priorityScore: number;
    escalationLevel: string;
    escalationStatus: string;
    reasons: string[];
    signals: Record<string, unknown>;
    assessedAt: string;
  };
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const adminGovernanceApi = {
  getOverview: (params?: GovernanceFilterParams) =>
    client.get("/admin/governance/overview", { params }).then((r) => r.data.data as GovernanceOverviewData),
  getExceptions: (params?: GovernanceFilterParams) =>
    client.get("/admin/governance/exceptions", { params }).then((r) => r.data.data as { total: number; byType: Record<string, number>; exceptions: GovernanceExceptionItem[] }),
  getMLAnalytics: (params?: GovernanceFilterParams) =>
    client.get("/admin/governance/ml-analytics", { params }).then((r) => r.data.data as MLAnalyticsData),
  getRoutingAnalytics: (params?: GovernanceFilterParams) =>
    client.get("/admin/governance/routing-analytics", { params }).then((r) => r.data.data as RoutingAnalyticsData),
  getReworkAnalytics: (params?: GovernanceFilterParams) =>
    client.get("/admin/governance/rework-analytics", { params }).then((r) => r.data.data as ReworkAnalyticsData),
  getComplaintPriority: (complaintId: string) =>
    client.get(`/complaints/${complaintId}/priority`).then((r) => r.data.data as PriorityIntelligenceData),
  acknowledgeEscalation: (complaintId: string) =>
    client.post(`/complaints/${complaintId}/escalation/acknowledge`).then((r) => r.data.data),
  resolveEscalation: (complaintId: string) =>
    client.post(`/complaints/${complaintId}/escalation/resolve`).then((r) => r.data.data),
};

// ─── React Query Hooks ────────────────────────────────────────────────────────

export function useGovernanceOverview(params?: GovernanceFilterParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-governance-overview", params],
    queryFn: () => adminGovernanceApi.getOverview(params),
    staleTime: 20_000,
    enabled: user?.role === "administrator",
  });
}

export function useGovernanceExceptions(params?: GovernanceFilterParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-governance-exceptions", params],
    queryFn: () => adminGovernanceApi.getExceptions(params),
    staleTime: 15_000,
    enabled: user?.role === "administrator",
  });
}

export function useMLAnalytics(params?: GovernanceFilterParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-ml-analytics", params],
    queryFn: () => adminGovernanceApi.getMLAnalytics(params),
    staleTime: 30_000,
    enabled: user?.role === "administrator",
  });
}

export function useRoutingAnalytics(params?: GovernanceFilterParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-routing-analytics", params],
    queryFn: () => adminGovernanceApi.getRoutingAnalytics(params),
    staleTime: 30_000,
    enabled: user?.role === "administrator",
  });
}

export function useReworkAnalytics(params?: GovernanceFilterParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-rework-analytics", params],
    queryFn: () => adminGovernanceApi.getReworkAnalytics(params),
    staleTime: 30_000,
    enabled: user?.role === "administrator",
  });
}

export function useComplaintPriority(complaintId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["complaint-priority", complaintId],
    queryFn: () => adminGovernanceApi.getComplaintPriority(complaintId!),
    staleTime: 30_000,
    enabled: Boolean(complaintId) && Boolean(user),
  });
}

export function useAcknowledgeEscalation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: string) => adminGovernanceApi.acknowledgeEscalation(complaintId),
    onSuccess: (_, complaintId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-governance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-governance-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["complaint-priority", complaintId] });
      toast.success("Critical escalation acknowledged successfully");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || "Failed to acknowledge escalation");
    },
  });
}

export function useResolveEscalation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: string) => adminGovernanceApi.resolveEscalation(complaintId),
    onSuccess: (_, complaintId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-governance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-governance-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["complaint-priority", complaintId] });
      toast.success("Critical escalation condition marked resolved");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || "Failed to resolve escalation");
    },
  });
}
