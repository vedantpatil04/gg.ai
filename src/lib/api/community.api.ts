import client from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostType   = "discussion" | "question";
export type PostStatus = "open" | "resolved" | "closed";

export interface CommunityReply {
  _id:          string;
  body:         string;
  authorId:     string;
  authorName:   string;
  isBestAnswer: boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface CommunityPostDTO {
  _id:          string;
  type:         PostType;
  title:        string;
  body:         string;
  category:     string;
  tags:         string[];
  authorId:     string;
  authorName:   string;
  status:       PostStatus;
  replies:      CommunityReply[];
  replyCount:   number;
  views:        number;
  hasBestAnswer: boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface PostListItem extends Omit<CommunityPostDTO, "replies"> {}

// ─── API ──────────────────────────────────────────────────────────────────────

export const communityApi = {
  getAll: (params?: {
    type?: PostType;
    status?: PostStatus;
    category?: string;
    q?: string;
    sort?: "recent" | "views";
    page?: number;
    limit?: number;
  }) =>
    client.get<{ success: true; data: { posts: PostListItem[]; total: number; page: number; pages: number } }>(
      "/community", { params },
    ).then(r => r.data.data),

  getOne: (id: string) =>
    client.get<{ success: true; data: { post: CommunityPostDTO } }>(`/community/${id}`).then(r => r.data.data.post),

  create: (input: { type: PostType; title: string; body: string; category: string; tags?: string[] }) =>
    client.post<{ success: true; data: { post: CommunityPostDTO } }>("/community", input).then(r => r.data.data.post),

  addReply: (postId: string, body: string) =>
    client.post<{ success: true; data: { post: CommunityPostDTO } }>(`/community/${postId}/replies`, { body }).then(r => r.data.data.post),

  editReply: (postId: string, replyId: string, body: string) =>
    client.patch<{ success: true; data: { post: CommunityPostDTO } }>(`/community/${postId}/replies/${replyId}`, { body }).then(r => r.data.data.post),

  deleteReply: (postId: string, replyId: string) =>
    client.delete<{ success: true; data: { post: CommunityPostDTO } }>(`/community/${postId}/replies/${replyId}`).then(r => r.data.data.post),

  markBestAnswer: (postId: string, replyId: string) =>
    client.post<{ success: true; data: { post: CommunityPostDTO } }>(`/community/${postId}/replies/${replyId}/best-answer`).then(r => r.data.data.post),
};
