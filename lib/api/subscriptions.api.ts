// lib/api/subscriptions.api.ts
import {
    ServiceSubscription,
    ServiceSubscriptionWithProfile,
} from "../types/database.types";
import { sendNotification } from "./notifications.api";
import { supabase } from "./supabase";

/**
 * Subscribe the current user to a provider.
 * Also sends a 'new_subscriber' notification to the provider.
 */
export async function subscribeToProvider(
  providerId: string,
): Promise<ServiceSubscription> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (user.id === providerId) {
      throw new Error("You cannot subscribe to yourself");
    }

    const { data, error } = await supabase
      .from("service_subscriptions")
      .insert({ subscriber_id: user.id, provider_id: providerId })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to subscribe");

    // Fetch subscriber's name for the notification
    const { data: subscriberProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const subscriberName = subscriberProfile
      ? `${subscriberProfile.first_name || ""} ${subscriberProfile.last_name || ""}`.trim() ||
        "Someone"
      : "Someone";

    // Notify the provider
    await sendNotification({
      user_id: providerId,
      type: "new_subscriber",
      title: "🎉 New Subscriber!",
      body: `${subscriberName} subscribed to your services.`,
      data: { subscriber_id: user.id },
    });

    return data;
  } catch (error) {
    console.error("Error subscribing to provider:", error);
    throw error;
  }
}

/**
 * Unsubscribe the current user from a provider.
 */
export async function unsubscribeFromProvider(
  providerId: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("service_subscriptions")
      .delete()
      .eq("subscriber_id", user.id)
      .eq("provider_id", providerId);

    if (error) throw error;
  } catch (error) {
    console.error("Error unsubscribing from provider:", error);
    throw error;
  }
}

/**
 * Check if the current user is subscribed to a specific provider.
 */
export async function isSubscribedToProvider(
  providerId: string,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("service_subscriptions")
      .select("id")
      .eq("subscriber_id", user.id)
      .eq("provider_id", providerId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get the subscriber count for a given provider (public).
 */
export async function getSubscriberCount(providerId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("service_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", providerId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error fetching subscriber count:", error);
    return 0;
  }
}

/**
 * Get all providers the current user is subscribed to,
 * including the provider's profile info.
 */
export async function getSubscriptions(): Promise<
  ServiceSubscriptionWithProfile[]
> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("service_subscriptions")
      .select(
        `
        *,
        provider_profile:profiles!provider_id(*)
      `,
      )
      .eq("subscriber_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    throw error;
  }
}

/**
 * Get all subscribers for the current user (i.e. people who follow them),
 * including the subscriber's profile info.
 */
export async function getMySubscribers(): Promise<
  ServiceSubscriptionWithProfile[]
> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("service_subscriptions")
      .select(
        `
        *,
        subscriber_profile:profiles!subscriber_id(*)
      `,
      )
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    throw error;
  }
}
