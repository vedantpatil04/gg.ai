import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  communityApi,
  type PostType, type PostStatus,
  type CommunityPostDTO,
} from "@/lib/api/community.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const communityKeys = {
  posts: (filters?: object) => ["community", "posts", filters] as const,
  post:  (id: string)       => ["community", "post",  id]      as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────

export interface PostFilters {
  type?:     PostType;
  status?:   PostStatus;
  category?: string;
  q?:        string;
  sort?:     "recent" | "views";
  page?:     number;
}

export function useCommunityPosts(filters?: PostFilters) {
  return useQuery({
    queryKey: communityKeys.posts(filters),
    queryFn:  () => communityApi.getAll(filters),
    staleTime: 20_000,
  });
}

// ─── Single post ──────────────────────────────────────────────────────────────

export function useCommunityPost(id: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: communityKeys.post(id ?? ""),
    queryFn:  () => communityApi.getOne(id!),
    enabled:  !!id,
    staleTime: 10_000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: communityKeys.post(id ?? "") });
    qc.invalidateQueries({ queryKey: ["community", "posts"] });
  }, [qc, id]);

  const replyMutation = useMutation({
    mutationFn: (body: string) => communityApi.addReply(id!, body),
    onSuccess:  (post) => qc.setQueryData(communityKeys.post(id!), post),
  });

  const editReplyMutation = useMutation({
    mutationFn: ({ replyId, body }: { replyId: string; body: string }) =>
      communityApi.editReply(id!, replyId, body),
    onSuccess: (post) => qc.setQueryData(communityKeys.post(id!), post),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => communityApi.deleteReply(id!, replyId),
    onSuccess:  (post) => qc.setQueryData(communityKeys.post(id!), post),
  });

  const bestAnswerMutation = useMutation({
    mutationFn: (replyId: string) => communityApi.markBestAnswer(id!, replyId),
    onSuccess:  (post) => { qc.setQueryData(communityKeys.post(id!), post); invalidate(); },
  });

  return {
    post:           query.data as CommunityPostDTO | undefined,
    isLoading:      query.isLoading,
    isError:        query.isError,
    addReply:       (body: string) => replyMutation.mutateAsync(body),
    isReplying:     replyMutation.isPending,
    editReply:      (replyId: string, body: string) => editReplyMutation.mutateAsync({ replyId, body }),
    isEditing:      editReplyMutation.isPending,
    deleteReply:    (replyId: string) => deleteReplyMutation.mutateAsync(replyId),
    isDeleting:     deleteReplyMutation.isPending,
    markBestAnswer: (replyId: string) => bestAnswerMutation.mutateAsync(replyId),
    isMarkingBest:  bestAnswerMutation.isPending,
  };
}

// ─── Create post ──────────────────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [newPost,   setNewPost]   = useState<CommunityPostDTO | null>(null);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof communityApi.create>[0]) => communityApi.create(input),
    onSuccess:  (post) => {
      setSubmitted(true);
      setNewPost(post);
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
    },
  });

  const submit = useCallback(
    (input: Parameters<typeof communityApi.create>[0]) => mutation.mutate(input),
    [mutation],
  );

  const reset = useCallback(() => {
    setSubmitted(false);
    setNewPost(null);
    mutation.reset();
  }, [mutation]);

  return {
    submitted,
    newPost,
    isSubmitting: mutation.isPending,
    isError:      mutation.isError,
    submit,
    reset,
  };
}
