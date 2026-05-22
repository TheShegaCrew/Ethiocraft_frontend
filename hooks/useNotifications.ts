"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchNotifications,
  markNotificationAsRead,
  clearReadNotifications,
  ApiNotification,
} from "@/lib/api";

type UseNotificationsOptions = {
  pollIntervalMs?: number; // Default 30000 (30 seconds)
  enabled?: boolean;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const defaultInterval = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL
    ? parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL, 10)
    : 30000;
  
  const { pollIntervalMs = defaultInterval, enabled = true } = options;
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      // Fetch the first page of notifications
      const data = await fetchNotifications({ limit: 50 });
      setNotifications(data.items);
      setUnreadCount(data.items.filter((n) => !n.isRead).length);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadNotifications();

    if (enabled && pollIntervalMs > 0) {
      const interval = setInterval(loadNotifications, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [loadNotifications, enabled, pollIntervalMs]);

  const markAsRead = async (id: string | number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(String(id));
    } catch (err) {
      // Revert on failure
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await Promise.allSettled(unreadIds.map((id) => markNotificationAsRead(String(id))));
    } catch (err) {
      loadNotifications();
    }
  };

  const readCount = notifications.filter((n) => n.isRead).length;

  const clearRead = async () => {
    if (readCount === 0) return;

    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => !n.isRead));

    try {
      await clearReadNotifications();
      setError(null);
    } catch (err: unknown) {
      setNotifications(previous);
      setError(err instanceof Error ? err.message : "Failed to clear read notifications");
      loadNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    readCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearRead,
    refresh: loadNotifications,
  };
}
