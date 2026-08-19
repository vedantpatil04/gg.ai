import client from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

// "reopened" added for the Administrator Communication Hub.
export type TicketStatus   = "open" | "in_progress" | "waiting" | "resolved" | "closed" | "reopened";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type FeatureStatus  = "submitted" | "planned" | "in_progress" | "shipped" | "declined" | "resolved" | "reopened";

export type CommentAuthorRole = "citizen" | "authority" | "administrator";

export interface TicketComment {
  _id:        string;
  body:       string;
  authorId:   string;
  authorName: string;
  authorRole?: CommentAuthorRole;
  isSystem?:  boolean;
  createdAt:  string;
}

export interface SupportTicketDTO {
  _id:              string;
  subject:          string;
  description:      string;
  category:         string;
  department:       string;
  environment:      string;
  browser?:         string;
  device?:          string;
  status:           TicketStatus;
  priority:         TicketPriority;
  submittedBy:      string;
  assignedTeam?:    string;
  comments:         TicketComment[];
  adminRead?:       boolean;
  estimatedResponse?: string;
  createdAt:        string;
  updatedAt:        string;
}

export interface TicketStats {
  open:              number;
  in_progress:       number;
  waiting:           number;
  resolved:          number;
  closed:            number;
  total:             number;
  resolutionRate:    string;
  avgResponseTime:   string;
  satisfactionScore: number;
  pendingRequests:   number;
}

export interface FeatureRequestDTO {
  _id:              string;
  title:            string;
  description:      string;
  category:         string;
  status:           FeatureStatus;
  voteCount:        number;
  voted:            boolean;
  submittedBy:      string;
  estimatedRelease?: string;
  tags:             string[];
  comments:         TicketComment[];
  adminRead?:       boolean;
  createdAt:        string;
  updatedAt:        string;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const supportTicketApi = {
  getStats: () =>
    client.get<{ success: true; data: TicketStats }>("/support/tickets/stats").then(r => r.data.data),

  getAll: (params?: { status?: TicketStatus; priority?: TicketPriority; page?: number; limit?: number }) =>
    client.get<{ success: true; data: { tickets: SupportTicketDTO[]; total: number; page: number; pages: number } }>(
      "/support/tickets", { params },
    ).then(r => r.data.data),

  getOne: (id: string) =>
    client.get<{ success: true; data: { ticket: SupportTicketDTO } }>(`/support/tickets/${id}`).then(r => r.data.data.ticket),

  create: (input: {
    subject:     string;
    description: string;
    category:    string;
    priority?:   TicketPriority;
    department?: string;
    environment?: string;
    browser?:    string;
    device?:     string;
  }) =>
    client.post<{ success: true; data: { ticket: SupportTicketDTO; estimatedResponse: string } }>(
      "/support/tickets", input,
    ).then(r => r.data.data),

  update: (id: string, data: Partial<{ subject: string; description: string; status: TicketStatus; priority: TicketPriority }>) =>
    client.patch<{ success: true; data: { ticket: SupportTicketDTO } }>(`/support/tickets/${id}`, data).then(r => r.data.data.ticket),

  delete: (id: string) =>
    client.delete<{ success: true; message: string }>(`/support/tickets/${id}`).then(r => r.data),

  addComment: (id: string, body: string) =>
    client.post<{ success: true; data: { ticket: SupportTicketDTO } }>(`/support/tickets/${id}/comments`, { body }).then(r => r.data.data.ticket),
};

// ─── Bug Reports ──────────────────────────────────────────────────────────────

export type BugStatus   = "open" | "acknowledged" | "fixed" | "wontfix" | "resolved" | "reopened";
export type BugSeverity = "minor" | "major" | "critical" | "blocker";

export interface BugReportDTO {
  _id:         string;
  title:       string;
  category:    string;
  severity:    BugSeverity;
  platform?:   string;
  browser?:    string;
  device?:     string;
  steps:       string;
  expected:    string;
  actual:      string;
  submittedBy: string;
  status:      BugStatus;
  comments:    TicketComment[];
  adminRead?:  boolean;
  createdAt:   string;
  updatedAt:   string;
}

export const bugReportApi = {
  create: (input: {
    title:    string;
    category: string;
    severity: string;
    steps:    string;
    expected: string;
    actual:   string;
    platform?: string;
    browser?:  string;
    device?:   string;
  }) =>
    client.post<{ success: true; data: { report: BugReportDTO } }>("/support/bugs", input).then(r => r.data.data.report),

  getAll: (params?: { status?: BugStatus; severity?: BugSeverity; page?: number; limit?: number }) =>
    client.get<{ success: true; data: { reports: BugReportDTO[]; total: number; page: number; pages: number } }>(
      "/support/bugs", { params },
    ).then(r => r.data.data),

  getOne: (id: string) =>
    client.get<{ success: true; data: { report: BugReportDTO } }>(`/support/bugs/${id}`).then(r => r.data.data.report),
};

// Kept for backward-compat with any existing imports of the old name.
export const bugListApi = bugReportApi;

// ─── Feature Requests ─────────────────────────────────────────────────────────

export const featureRequestApi = {
  getAll: (params?: { status?: FeatureStatus; page?: number; limit?: number }) =>
    client.get<{ success: true; data: { features: FeatureRequestDTO[]; total: number } }>(
      "/support/features", { params },
    ).then(r => r.data.data),

  getOne: (id: string) =>
    client.get<{ success: true; data: { feature: FeatureRequestDTO } }>(`/support/features/${id}`).then(r => r.data.data.feature),

  create: (input: { title: string; description: string; category: string; tags?: string[] }) =>
    client.post<{ success: true; data: { feature: FeatureRequestDTO } }>("/support/features", input).then(r => r.data.data.feature),

  toggleVote: (id: string) =>
    client.post<{ success: true; data: { voted: boolean; voteCount: number } }>(`/support/features/${id}/vote`).then(r => r.data.data),
};

// ─── Feedback ─────────────────────────────────────────────────────────────────

export type FeedbackStatus = "open" | "resolved" | "reopened";

export interface FeedbackDTO {
  _id:            string;
  rating:         number;
  category:       string;
  comment:        string;
  nps:            number;
  uiSatisfaction: number;
  aiSatisfaction: number;
  submittedBy:    string;
  status:         FeedbackStatus;
  comments:       TicketComment[];
  adminRead?:     boolean;
  createdAt:      string;
  updatedAt:      string;
}

export const feedbackApi = {
  create: (input: {
    rating:          number;
    category:        string;
    comment?:        string;
    nps?:            number;
    uiSatisfaction?: number;
    aiSatisfaction?: number;
  }) =>
    client.post<{ success: true; data: { feedback: FeedbackDTO } }>("/support/feedback", input).then(r => r.data.data.feedback),

  getAll: (params?: { status?: FeedbackStatus; page?: number; limit?: number }) =>
    client.get<{ success: true; data: { feedback: FeedbackDTO[]; total: number; page: number; pages: number } }>(
      "/support/feedback", { params },
    ).then(r => r.data.data),

  getOne: (id: string) =>
    client.get<{ success: true; data: { feedback: FeedbackDTO } }>(`/support/feedback/${id}`).then(r => r.data.data.feedback),
};
