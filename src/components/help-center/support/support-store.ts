import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supportTicketApi,
  bugReportApi,
  featureRequestApi,
  feedbackApi,
  type TicketStatus,
  type TicketPriority,
  type SupportTicketDTO,
  type FeatureRequestDTO,
  type TicketStats,
} from "@/lib/api/support.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const supportKeys = {
  stats:    ["support", "stats"]    as const,
  tickets:  (filters?: object) => ["support", "tickets", filters] as const,
  ticket:   (id: string)       => ["support", "ticket", id]       as const,
  features: (filters?: object) => ["support", "features", filters] as const,
};

// ─── Ticket Stats ─────────────────────────────────────────────────────────────

export function useTicketStats() {
  return useQuery({
    queryKey: supportKeys.stats,
    queryFn:  supportTicketApi.getStats,
    staleTime: 30_000,
  });
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface NewTicketInput {
  subject:      string;
  category:     string;
  priority:     TicketPriority;
  description:  string;
  department:   string;
  environment:  string;
  browser?:     string;
  device?:      string;
}

export function useTickets(filters?: { status?: TicketStatus; priority?: TicketPriority; page?: number }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: supportKeys.tickets(filters),
    queryFn:  () => supportTicketApi.getAll(filters),
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: NewTicketInput) => supportTicketApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ status: TicketStatus; priority: TicketPriority }> }) =>
      supportTicketApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportTicketApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support"] });
    },
  });

  const tickets: SupportTicketDTO[] = query.data?.tickets ?? [];
  const total:   number             = query.data?.total   ?? 0;

  const createTicket = useCallback(
    async (input: NewTicketInput) => createMutation.mutateAsync(input),
    [createMutation],
  );

  return {
    tickets,
    total,
    isLoading:     query.isLoading,
    isError:       query.isError,
    error:         query.error,
    refetch:       query.refetch,
    createTicket,
    isCreating:    createMutation.isPending,
    updateTicket:  updateMutation.mutateAsync,
    isUpdating:    updateMutation.isPending,
    deleteTicket:  deleteMutation.mutateAsync,
    isDeleting:    deleteMutation.isPending,
  };
}

// ─── Feature Requests ─────────────────────────────────────────────────────────

export function useFeatureRequests(filters?: { status?: string }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: supportKeys.features(filters),
    queryFn:  () => featureRequestApi.getAll(filters as { status?: "submitted" | "planned" | "in_progress" | "shipped" | "declined" }),
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => featureRequestApi.toggleVote(id),
    // Optimistic update
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: supportKeys.features(filters) });
      const prev = qc.getQueryData<{ features: FeatureRequestDTO[] }>(supportKeys.features(filters));
      qc.setQueryData(supportKeys.features(filters), (old: typeof prev) => {
        if (!old) return old;
        return {
          ...old,
          features: old.features.map(f =>
            f._id === id
              ? { ...f, voted: !f.voted, voteCount: f.voted ? f.voteCount - 1 : f.voteCount + 1 }
              : f,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(supportKeys.features(filters), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: supportKeys.features(filters) });
    },
  });

  const features: FeatureRequestDTO[] = query.data?.features ?? [];

  const hasVoted  = useCallback((id: string) => features.find(f => f._id === id)?.voted ?? false, [features]);
  const getVotes  = useCallback((id: string) => features.find(f => f._id === id)?.voteCount ?? 0,   [features]);
  const toggleVote = useCallback((id: string) => voteMutation.mutate(id), [voteMutation]);

  return {
    features,
    isLoading: query.isLoading,
    isError:   query.isError,
    hasVoted,
    getVotes,
    toggleVote,
  };
}

// ─── Bug Reports ──────────────────────────────────────────────────────────────

export interface BugReportInput {
  title:    string;
  category: string;
  severity: string;
  browser:  string;
  device:   string;
  steps:    string;
  expected: string;
  actual:   string;
  platform?: string;
}

export function useBugReports() {
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: BugReportInput) => bugReportApi.create(input),
    onSuccess:  () => setSubmitted(true),
  });

  const submitBug = useCallback(
    (input: BugReportInput) => mutation.mutate(input),
    [mutation],
  );

  const reset = useCallback(() => {
    setSubmitted(false);
    mutation.reset();
  }, [mutation]);

  return {
    submitted,
    isSubmitting: mutation.isPending,
    isError:      mutation.isError,
    submitBug,
    reset,
  };
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface FeedbackInput {
  rating:         number;
  category:       string;
  comment:        string;
  nps:            number;
  uiSatisfaction: number;
  aiSatisfaction: number;
}

export function useFeedback() {
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: FeedbackInput) =>
      feedbackApi.create({
        rating:          input.rating,
        category:        input.category,
        comment:         input.comment,
        nps:             input.nps,
        uiSatisfaction:  input.uiSatisfaction,
        aiSatisfaction:  input.aiSatisfaction,
      }),
    onSuccess: () => setSubmitted(true),
  });

  const submitFeedback = useCallback(
    (input: FeedbackInput) => mutation.mutate(input),
    [mutation],
  );

  const reset = useCallback(() => {
    setSubmitted(false);
    mutation.reset();
  }, [mutation]);

  return {
    submitted,
    isSubmitting: mutation.isPending,
    isError:      mutation.isError,
    submitFeedback,
    reset,
  };
}
