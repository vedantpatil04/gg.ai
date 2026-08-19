import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { communicationHubApi, type CommTypeKey } from "@/lib/api/communication-hub.api";

export const commHubKeys = {
  overview: ["comm-hub", "overview"] as const,
  list:     (type: CommTypeKey, filters?: object) => ["comm-hub", "list", type, filters] as const,
  detail:   (type: CommTypeKey, id: string)       => ["comm-hub", "detail", type, id]    as const,
  emergencyHistory: ["comm-hub", "emergency-history"] as const,
};

export function useCommOverview() {
  return useQuery({
    queryKey: commHubKeys.overview,
    queryFn:  communicationHubApi.getOverview,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useCommList(type: CommTypeKey, filters?: {
  page?: number; limit?: number; status?: string; unread?: "true" | "false";
  search?: string; sort?: "newest" | "oldest";
}) {
  return useQuery({
    queryKey: commHubKeys.list(type, filters),
    queryFn:  () => communicationHubApi.list(type, filters),
    staleTime: 10_000,
  });
}

export function useCommDetail(type: CommTypeKey, id: string | null) {
  return useQuery({
    queryKey: commHubKeys.detail(type, id ?? ""),
    queryFn:  () => communicationHubApi.getOne(type, id!),
    enabled:  !!id,
    staleTime: 5_000,
  });
}

function useInvalidateHub() {
  const qc = useQueryClient();
  return (type: CommTypeKey, id: string) => {
    qc.invalidateQueries({ queryKey: commHubKeys.overview });
    qc.invalidateQueries({ queryKey: ["comm-hub", "list", type] });
    qc.invalidateQueries({ queryKey: commHubKeys.detail(type, id) });
  };
}

export function useReplyToCommunication(type: CommTypeKey) {
  const invalidate = useInvalidateHub();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => communicationHubApi.reply(type, id, body),
    onSuccess: (_item, { id }) => {
      invalidate(type, id);
      toast.success("Reply sent");
    },
    onError: () => toast.error("Failed to send reply"),
  });
}

export function useResolveCommunication(type: CommTypeKey) {
  const invalidate = useInvalidateHub();
  return useMutation({
    mutationFn: (id: string) => communicationHubApi.resolve(type, id),
    onSuccess: (_item, id) => {
      invalidate(type, id);
      toast.success("Marked resolved");
    },
    onError: () => toast.error("Failed to resolve"),
  });
}

export function useReopenCommunication(type: CommTypeKey) {
  const invalidate = useInvalidateHub();
  return useMutation({
    mutationFn: (id: string) => communicationHubApi.reopen(type, id),
    onSuccess: (_item, id) => {
      invalidate(type, id);
      toast.success("Reopened");
    },
    onError: () => toast.error("Failed to reopen"),
  });
}

export function useSendEmergencyBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: communicationHubApi.sendEmergency,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: commHubKeys.emergencyHistory });
      toast.success(`Alert sent to ${data.recipientCount} recipient${data.recipientCount === 1 ? "" : "s"}`);
    },
    onError: () => toast.error("Failed to send emergency alert"),
  });
}

export function useEmergencyHistory() {
  return useQuery({
    queryKey: commHubKeys.emergencyHistory,
    queryFn:  communicationHubApi.getEmergencyHistory,
    staleTime: 15_000,
  });
}
