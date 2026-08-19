import client from "./client";
import type { TicketComment } from "./support.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommTypeKey = "tickets" | "bugs" | "features" | "feedback";

export interface CommSubmitter {
  _id?:   string;
  name:   string;
  email:  string;
  role?:  string;
}

export interface CommListItem {
  _id:          string;
  title:        string;
  status:       string;
  adminRead:    boolean;
  submittedBy:  CommSubmitter | null;
  commentCount: number;
  createdAt:    string;
  updatedAt:    string;
  priority?:    string;
  severity?:    string;
  category?:    string;
  voteCount?:   number;
}

// Loosely typed — the detail item shape varies by communication type
// (ticket/bug/feature/feedback), mirroring the four existing models.
export interface CommDetailItem {
  _id:          string;
  status:       string;
  adminRead:    boolean;
  submittedBy:  CommSubmitter | null;
  comments:     TicketComment[];
  createdAt:    string;
  updatedAt:    string;
  subject?:     string;
  title?:       string;
  description?: string;
  category?:    string;
  department?:  string;
  environment?: string;
  browser?:     string;
  device?:      string;
  priority?:    string;
  assignedTeam?: string;
  severity?:    string;
  platform?:    string;
  steps?:       string;
  expected?:    string;
  actual?:      string;
  voteCount?:   number;
  tags?:        string[];
  rating?:      number;
  comment?:     string;
  nps?:         number;
  uiSatisfaction?: number;
  aiSatisfaction?: number;
}

export interface CommTypeStats {
  type:     CommTypeKey;
  total:    number;
  open:     number;
  resolved: number;
  reopened: number;
  unread:   number;
  new:      number;
}

export interface CommOverviewTotals {
  total: number; open: number; resolved: number; reopened: number; unread: number; new: number;
}

export interface CommRecentItem {
  _id: string;
  type: CommTypeKey;
  title: string;
  status: string;
  submittedBy: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommOverview {
  totals: CommOverviewTotals;
  byType: CommTypeStats[];
  recent: CommRecentItem[];
}

export interface EmergencyHistoryEntry {
  _id:            string; // broadcastId
  title:          string;
  summary:        string;
  priority:       "low" | "medium" | "high" | "critical";
  createdAt:      string;
  recipientCount: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const communicationHubApi = {
  getOverview: () =>
    client.get<{ success: true; data: CommOverview }>("/admin/communication/overview").then(r => r.data.data),

  list: (type: CommTypeKey, params?: {
    page?: number; limit?: number; status?: string; unread?: "true" | "false";
    search?: string; sort?: "newest" | "oldest";
  }) =>
    client.get<{ success: true; data: { type: CommTypeKey; items: CommListItem[]; total: number; page: number; pages: number } }>(
      `/admin/communication/${type}`, { params },
    ).then(r => r.data.data),

  getOne: (type: CommTypeKey, id: string) =>
    client.get<{ success: true; data: { type: CommTypeKey; item: CommDetailItem } }>(
      `/admin/communication/${type}/${id}`,
    ).then(r => r.data.data.item),

  reply: (type: CommTypeKey, id: string, body: string) =>
    client.post<{ success: true; data: { item: CommDetailItem } }>(
      `/admin/communication/${type}/${id}/reply`, { body },
    ).then(r => r.data.data.item),

  resolve: (type: CommTypeKey, id: string) =>
    client.post<{ success: true; data: { item: CommDetailItem } }>(
      `/admin/communication/${type}/${id}/resolve`,
    ).then(r => r.data.data.item),

  reopen: (type: CommTypeKey, id: string) =>
    client.post<{ success: true; data: { item: CommDetailItem } }>(
      `/admin/communication/${type}/${id}/reopen`,
    ).then(r => r.data.data.item),

  sendEmergency: (input: { title: string; message: string; severity: "low" | "medium" | "high" | "critical"; audience: "all" | "citizen" | "authority" | "administrator" }) =>
    client.post<{ success: true; data: { broadcastId: string; recipientCount: number; audience: string; severity: string } }>(
      "/admin/communication/emergency/send", input,
    ).then(r => r.data.data),

  getEmergencyHistory: () =>
    client.get<{ success: true; data: { history: EmergencyHistoryEntry[] } }>(
      "/admin/communication/emergency/history",
    ).then(r => r.data.data.history),
};
