import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchConversations,
  subscribeToConversations,
} from "../api/messaging.api";
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from "../api/notifications.api";
import { supabase } from "../api/supabase";

interface UnreadCounts {
  messages: number;
  notifications: number;
}

/**
 * Encapsulates all badge-count logic that was inlined in ServellApp.
 *
 * - Fetches initial unread counts on mount IMMEDIATELY
 * - Subscribes to realtime updates for both messages and notifications
 * - Exposes a resetNotifications callback for the NotificationScreen
 * - Exposes a refreshMessages callback for when the Message tab is focused
 *
 * CHANGES:
 * - Removed the redundant global `messages` INSERT/UPDATE channel. It had no
 *   user-scoped filter, meaning it fired on every message in the entire DB and
 *   triggered duplicate re-fetches. The `subscribeToConversations` listener
 *   already handles badge updates via the `last_message_at` trigger on the
 *   conversations row — that is the correct and sufficient signal.
 * - Added a debounce ref so rapid-fire conversation events collapse into a
 *   single fetchConversations() call instead of queuing many overlapping ones.
 */
export function useUnreadCounts(): {
  counts: UnreadCounts;
  resetNotifications: () => void;
  refreshMessages: () => void;
} {
  const [counts, setCounts] = useState<UnreadCounts>({
    messages: 0,
    notifications: 0,
  });
  const userIdRef = useRef<string | null>(null);
  const initialLoadDone = useRef(false);
  // Debounce ref: prevents overlapping fetchConversations calls when multiple
  // realtime events arrive in quick succession (e.g. message + conversation update).
  const msgFetchInFlight = useRef(false);

  const refreshMessages = useCallback(async () => {
    const convos = await fetchConversations();
    const total = convos.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setCounts((prev) => ({ ...prev, messages: total }));
  }, []);

  const resetNotifications = useCallback(() => {
    setCounts((prev) => ({ ...prev, notifications: 0 }));
  }, []);

  useEffect(() => {
    let unsubNotifs: (() => void) | null = null;
    let unsubConvos: (() => void) | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // Initial counts — fetch immediately before setting up subscriptions
      try {
        const [convos, totalNotifs] = await Promise.all([
          fetchConversations(),
          getUnreadNotificationCount(),
        ]);

        const totalMessages = convos.reduce(
          (sum, c) => sum + (c.unread_count || 0),
          0,
        );

        setCounts({ messages: totalMessages, notifications: totalNotifs });
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Error loading initial badge counts:", error);
      }

      // ── Conversations subscription ──────────────────────────────────────
      // Fires whenever a conversation row changes (e.g. last_message_at is
      // updated by the DB trigger on messages INSERT). This is the correct
      // signal for the message badge — no need to also watch the messages table.
      unsubConvos = subscribeToConversations(user.id, async () => {
        // Debounce: if a fetch is already in-flight, skip — the in-flight call
        // will return fresh data that includes this event's changes.
        if (msgFetchInFlight.current) return;
        msgFetchInFlight.current = true;
        try {
          const updated = await fetchConversations();
          const total = updated.reduce(
            (sum, c) => sum + (c.unread_count || 0),
            0,
          );
          setCounts((prev) => ({ ...prev, messages: total }));
        } finally {
          msgFetchInFlight.current = false;
        }
      });

      // ── Notifications subscription ──────────────────────────────────────
      // Increments badge immediately on INSERT; no re-fetch needed for the count.
      unsubNotifs = subscribeToNotifications(user.id, () => {
        setCounts((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
        }));
      });
    }

    init();

    return () => {
      unsubNotifs?.();
      unsubConvos?.();
    };
  }, []);

  return { counts, resetNotifications, refreshMessages };
}
