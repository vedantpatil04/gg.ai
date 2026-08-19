/**
 * Phase 7 — Notification hooks
 *
 * Uses React Query for caching + background polling.
 * Falls back gracefully when the user is not authenticated.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi, type NotificationFilters, type NotificationCategory } from "@/lib/api/notification.api";
import { useAuth } from "@/lib/auth-context";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
};

// ─── Unread count (polled every 30 seconds) ───────────────────────────────────

export function useNotificationUnreadCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,          // poll every 30 s
    refetchIntervalInBackground: false, // pause when tab is hidden
    staleTime: 10_000,
    retry: false,
  });
}

// ─── Notification list ────────────────────────────────────────────────────────

export function useNotifications(filters: NotificationFilters = {}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationApi.list(filters),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: false,
  });
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: notificationApi.getPreferences,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (category?: NotificationCategory | "support") => notificationApi.markAllRead(category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useArchiveNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.archive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.lists() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.updatePreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
