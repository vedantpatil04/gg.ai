import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import { adminApi, complaintApi } from "@/lib/api/services.api";

export type ComplaintStatus =
  "pending" | "in-progress" | "resolved" | "rejected" | "rework" | "closed"; // Phase 3C

export type ComplaintSeverity = "low" | "medium" | "high" | "critical";

interface PopulatedRef {
  _id: string;
  name: string;
  email: string;
}

export interface GovernedComplaint {
  _id: string;
  title: string;
  description: string;
  issueType: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  cityId: string;
  location?: { address?: string; lat: number; lng: number };
  images: string[];
  internalNotes?: string;
  events?: Array<{ type: string; message: string; userName?: string; timestamp: string }>;
  submittedBy: PopulatedRef;
  assignedTo?: PopulatedRef;
  assignedBy?: PopulatedRef;
  assignedAt?: string;
  assignedByName?: string;
  // Phase 3C — verification
  verifiedBy?: PopulatedRef;
  verifiedAt?: string;
  verifiedByName?: string;
  // Phase 3C — rework
  reworkReason?: string;
  reworkComments?: string;
  reworkCount?: number;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplaintQueuePage {
  complaints: GovernedComplaint[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AuthorityWorkload {
  _id: string;
  name: string;
  email: string;
  assignedPending: number;
  assignedActive: number;
  total: number;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-complaint-queue"] });
  qc.invalidateQueries({ queryKey: ["admin-workload"] });
  qc.invalidateQueries({ queryKey: ["command-complaint-intelligence"] });
  qc.invalidateQueries({ queryKey: ["admin-recent-complaints"] });
  qc.invalidateQueries({ queryKey: ["admin-stats"] });
  qc.invalidateQueries({ queryKey: ["my-assigned-complaints"] });
}

function errMsg(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export function useComplaintQueue(
  status: ComplaintStatus,
  severity: ComplaintSeverity | undefined,
  page: number,
) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-complaint-queue", status, severity ?? "all", page],
    queryFn: () =>
      complaintApi
        .getAll({ status, severity, page, limit: 20 })
        .then((r) => r.data as ComplaintQueuePage),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAssignableAuthorities() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-assignable-authorities"],
    queryFn: () =>
      adminApi
        .getUsers({ role: "authority", isActive: true, limit: 100 })
        .then((r) => r.data.users as PopulatedRef[]),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useAuthorityWorkload() {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-workload"],
    queryFn: () =>
      adminApi
        .getWorkload()
        .then((r) => r.data as { workloads: AuthorityWorkload[]; unassigned: number }),
    staleTime: 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

export function useVerifyComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complaintApi.update(id, { status: "in-progress" }),
    onSuccess: () => {
      invalidateAll(qc);
      toast("Complaint verified and moved to In Progress.");
    },
    onError: (err) => toast(errMsg(err) ?? "Couldn't verify. Try again."),
  });
}

export function useRejectComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complaintApi.update(id, { status: "rejected" }),
    onSuccess: () => {
      invalidateAll(qc);
      toast("Complaint rejected.");
    },
    onError: (err) => toast(errMsg(err) ?? "Couldn't reject. Try again."),
  });
}

export function useAssignComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, authorityId }: { id: string; authorityId: string }) =>
      complaintApi.update(id, { assignedTo: authorityId }),
    onSuccess: (_data, { id }) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["complaint", id] });
      toast("Complaint assigned successfully.");
    },
    onError: (err) => toast(errMsg(err) ?? "Couldn't assign. Try again."),
  });
}

/** Phase 3C — approve authority resolution and close the complaint. */
export function useVerifyResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complaintApi.verifyResolution(id),
    onSuccess: (_data, id) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["complaint", id] });
      toast("Resolution approved — complaint closed.");
    },
    onError: (err) => toast(errMsg(err) ?? "Couldn't verify resolution. Try again."),
  });
}

/** Phase 3C — reject authority resolution and return for rework. */
export function useRequestRework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, comments }: { id: string; reason: string; comments?: string }) =>
      complaintApi.requestRework(id, { reason, comments }),
    onSuccess: (_data, { id }) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ["complaint", id] });
      toast("Complaint returned to authority for rework.");
    },
    onError: (err) => toast(errMsg(err) ?? "Couldn't request rework. Try again."),
  });
}
