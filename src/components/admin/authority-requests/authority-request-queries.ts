import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import { adminApi } from "@/lib/api/services.api";

export type AuthorityApprovalStatus = "pending" | "approved" | "rejected";

export interface AuthorityRequest {
  _id: string;
  name: string;
  email: string;
  role: "authority";
  approvalStatus: AuthorityApprovalStatus;
  organization?: string;
  phone?: string;
  city?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthorityRequestsPage {
  requests: AuthorityRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

/**
 * Query key prefix shared with the dashboard's usePendingAuthorityRequests
 * (src/components/admin/admin-dashboard-queries.ts) — "admin-authority-
 * requests" as the first element on both means invalidating that prefix
 * (either from here, after approve/reject, or from the dashboard's own
 * Refresh button) refreshes both the dashboard count and this page's list,
 * per Phase 2.3's "Dashboard Integration" requirement.
 */
export function useAuthorityRequests(status: AuthorityApprovalStatus, page: number) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-authority-requests", status, page],
    queryFn: () =>
      adminApi
        .getAuthorityRequests({ status, page, limit: 20 })
        .then((r) => r.data as AuthorityRequestsPage),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useApproveAuthorityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.approveAuthorityRequest(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-authority-requests"] });
      toast(res?.message ?? "Authority request approved.");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast(message ?? "Couldn't approve this request. Try again.");
    },
  });
}

export function useRejectAuthorityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.rejectAuthorityRequest(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-authority-requests"] });
      toast(res?.message ?? "Authority request rejected.");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast(message ?? "Couldn't reject this request. Try again.");
    },
  });
}
