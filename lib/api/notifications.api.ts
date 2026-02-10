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
 * Called internally by other API functions (e.g. after a review is posted).
 */
export async function sendNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data || null,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Send a discount notification to all subscribers of a provider.
 * Called when a provider marks a service as discounted.
 *
 * @param providerId - The provider sending the discount notif
 * @param serviceId  - The service that has a discount
 * @param serviceTitle - The service title for the notification body
 * @param discountDetails - A short description of the discount (e.g. "50% off this weekend!")
 */
export async function sendDiscountNotificationToSubscribers(
  providerId: string,
  serviceId: string,
  serviceTitle: string,
  discountDetails: string,
): Promise<void> {
  try {
    // Fetch all subscribers of this provider
    const { data: subscribers, error: subError } = await supabase
      .from("service_subscriptions")
      .select("subscriber_id")
      .eq("provider_id", providerId);

    if (subError) throw subError;
    if (!subscribers || subscribers.length === 0) return;

    // Build notification rows for bulk insert
    const notifications = subscribers.map((sub) => ({
      user_id: sub.subscriber_id,
      type: "service_discount" as const,
      title: "🏷️ Discount Alert!",
      body: `${serviceTitle} — ${discountDetails}`,
      data: { service_id: serviceId, provider_id: providerId },
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;
  } catch (error) {
    console.error("Error sending discount notifications:", error);
    throw error;
  }
}

/**
 * Send a broadcast notification to ALL users.
 * Intended for admin use only — e.g. holiday discount frenzy, platform announcements.
 *
 * NOTE: This fetches all profile IDs and batch-inserts. For large user bases,
 * this should be moved to a Supabase Edge Function with pagination.
 *
 * @param title   - Notification title
 * @param body    - Notification body
 * @param type    - Usually 'broadcast'; can also be 'service_discount' for frenzy events
 */
export async function sendBroadcastNotification(
  title: string,
  body: string,
  type: CreateNotificationInput["type"] = "broadcast",
): Promise<void> {
  try {
    // Fetch all profile IDs
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) return;

    const notifications = profiles.map((profile) => ({
      user_id: profile.id,
      type,
      title,
      body,
      data: null,
    }));

    // Batch insert in chunks of 500 to stay within limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
      const chunk = notifications.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from("notifications").insert(chunk);
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
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
    .channel(`notifications:${userId}`)
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
