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
    let unsubMessages: (() => void) | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // Initial counts - FETCH IMMEDIATELY before setting up subscriptions
      try {
        const [convos, totalNotifs] = await Promise.all([
          fetchConversations(),
          getUnreadNotificationCount(),
        ]);

        const totalMessages = convos.reduce(
          (sum, c) => sum + (c.unread_count || 0),
          0,
        );

        // Set counts immediately so badges appear right away
        setCounts({ messages: totalMessages, notifications: totalNotifs });
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Error loading initial badge counts:", error);
      }

      // Realtime subscriptions for future updates
      unsubConvos = subscribeToConversations(user.id, async () => {
        const updated = await fetchConversations();
        const total = updated.reduce(
          (sum, c) => sum + (c.unread_count || 0),
          0,
        );
        setCounts((prev) => ({ ...prev, messages: total }));
      });

      // Subscribe to messages table to catch new unread messages
      const messagesChannel = supabase
        .channel(`messages:user:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload: any) => {
            // Only count if this message is not from the current user
            if (payload.new.sender_id !== user.id) {
              const updated = await fetchConversations();
              const total = updated.reduce(
                (sum, c) => sum + (c.unread_count || 0),
                0,
              );
              setCounts((prev) => ({ ...prev, messages: total }));
            }
          },
        )
        .subscribe();

      unsubMessages = () => {
        supabase.removeChannel(messagesChannel);
      };

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
      unsubMessages?.();
    };
  }, []);

  return { counts, resetNotifications, refreshMessages };
}
