// lib/api/notifications.api.ts
import { CreateNotificationInput, Notification } from "../types/database.types";
import { supabase } from "./supabase";

/**
 * Fetch all notifications for the current user, newest first.
 */
export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking notification read:", error);
    throw error;
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    throw error;
  }
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Send a notification to a specific user.
 *
 * Uses the send_notification() SECURITY DEFINER RPC instead of a direct
 * insert, because RLS blocks authenticated users from inserting rows
 * where user_id != auth.uid() (i.e. sending to another user).
 * The function validates the caller is authenticated before inserting.
 */
export async function sendNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("send_notification", {
      p_user_id: input.user_id,
      p_type: input.type,
      p_title: input.title,
      p_body: input.body,
      p_data: input.data || null,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Subscribe to new notifications for the current user in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: Notification) => void,
) {
  const channel = supabase
    .channel(`notifications:${userId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNew(payload.new as Notification);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
