import client from "./client";

export const NOTIFICATION_CATEGORIES = [
  "system",
  "complaints",
  "reports",
  "authority",
  "environment",
  "forecast",
  "admin",
  "security",
] as const;

export const NOTIFICATION_CHANNELS = [
  "inApp",
  "email",
  "push",
] as const;

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export type NotificationPreferences =
  Record<(typeof NOTIFICATION_CATEGORIES)[number], NotificationChannels>;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type NotificationStatus = "unread" | "read" | "archived";

export interface Notification {
  _id: string;
  userId: string;
  recipientRole: "citizen" | "authority" | "administrator";
  title: string;
  summary: string;
  // "support" covers the Communication Hub (tickets/bugs/features/feedback).
  // Kept as a union extension rather than folding into NotificationCategory
  // since that type also drives the (separate) settings preferences record.
  category: NotificationCategory | "support";
  priority: NotificationPriority;
  status: NotificationStatus;
  link?: string;
  entityId?: string;
  entityType?: "complaint" | "authority" | "platform" | "user" | "ticket" | "bug" | "feature" | "feedback";
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: "unread" | "read" | "archived" | "all";
  category?: NotificationCategory | "support";
  search?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
}

export const notificationApi = {
  list: async (filters?: NotificationFilters): Promise<NotificationListResponse> => {
    const params = new URLSearchParams();
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.sort) params.set("sort", filters.sort);
    const res = await client.get(`/notifications?${params.toString()}`);
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await client.get("/notifications/unread-count");
    return res.data.data.count as number;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const res = await client.patch(`/notifications/${id}/read`);
    return res.data.data.notification as Notification;
  },

  markAllRead: async (category?: NotificationCategory | "support"): Promise<{ modifiedCount: number }> => {
    const res = await client.patch("/notifications/mark-all-read", { category });
    return res.data.data as { modifiedCount: number };
  },

  archive: async (id: string): Promise<Notification> => {
    const res = await client.patch(`/notifications/${id}/archive`);
    return res.data.data.notification as Notification;
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/notifications/${id}`);
  },

  getPreferences: async (): Promise<Record<string, boolean>> => {
    const res = await client.get("/notifications/preferences");
    return res.data.data.preferences as Record<string, boolean>;
  },

  updatePreferences: async (preferences: Record<string, boolean>): Promise<Record<string, boolean>> => {
    const res = await client.patch("/notifications/preferences", { preferences });
    return res.data.data.preferences as Record<string, boolean>;
  },

  getSettingsPreferences: async (): Promise<NotificationPreferences> => {
  const res = await client.get("/settings/notifications");
  return res.data.data.notifications;
},

updateSettingsPreferences: async (
  patch: Partial<
    Record<
      (typeof NOTIFICATION_CATEGORIES)[number],
      Partial<NotificationChannels>
    >
  >
): Promise<NotificationPreferences> => {
  const res = await client.patch("/settings/notifications", patch);
  return res.data.data.notifications;
},
};
