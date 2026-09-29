import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount, listNotifications, markNotificationRead, markAllNotificationsRead } from '@/utils/quotesApi';
import type { QuoteNotification } from '@/types/quotes';

// Every request wakes the Neon compute (billed per CU-hour, scales to zero after
// ~5 min idle). Polling from forgotten background tabs kept it awake ~22h/day and
// exhausted the free quota (2026-09-28 outage), so only poll while someone is
// actually looking at the app.
const POLL_INTERVAL = 120_000; // 2 minutes

const isActive = () => document.visibilityState === 'visible' && document.hasFocus();

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

  // Poll for unread count only while the tab is visible and focused; refresh
  // immediately when the user comes back.
  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(() => {
      if (isActive()) fetchCount();
    }, POLL_INTERVAL);
    const onReturn = () => {
      if (isActive()) fetchCount();
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
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
