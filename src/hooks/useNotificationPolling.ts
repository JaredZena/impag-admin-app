import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount, listNotifications, markNotificationRead, markAllNotificationsRead } from '@/utils/quotesApi';
import type { QuoteNotification } from '@/types/quotes';

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotificationPolling() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<QuoteNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail — don't disrupt the app for notification polling
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications(false);
      setNotifications(data);
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  // Poll for unread count
  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
