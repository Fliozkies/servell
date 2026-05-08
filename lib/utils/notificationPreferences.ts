import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationType } from "../types/database.types";

export type NotificationPreferences = {
  messages: boolean;
  reviews: boolean;
  comments: boolean;
  subscriptions: boolean;
  serviceUpdates: boolean;
};

export const NOTIFICATION_PREFERENCES_STORAGE_KEY =
  "notification_preferences";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  messages: true,
  reviews: true,
  comments: true,
  subscriptions: true,
  serviceUpdates: true,
};

const listeners = new Set<(preferences: NotificationPreferences) => void>();

function normalizeNotificationPreferences(
  value: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  return {
    messages: value?.messages ?? DEFAULT_NOTIFICATION_PREFERENCES.messages,
    reviews: value?.reviews ?? DEFAULT_NOTIFICATION_PREFERENCES.reviews,
    comments: value?.comments ?? DEFAULT_NOTIFICATION_PREFERENCES.comments,
    subscriptions:
      value?.subscriptions ?? DEFAULT_NOTIFICATION_PREFERENCES.subscriptions,
    serviceUpdates:
      value?.serviceUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.serviceUpdates,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const stored = await AsyncStorage.getItem(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
  );
  if (!stored) return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    return normalizeNotificationPreferences(JSON.parse(stored));
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  const normalized = normalizeNotificationPreferences(preferences);
  await AsyncStorage.setItem(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  listeners.forEach((listener) => listener(normalized));
}

export function subscribeToNotificationPreferenceChanges(
  listener: (preferences: NotificationPreferences) => void,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasEnabledNotificationPreferences(
  preferences: NotificationPreferences,
): boolean {
  return Object.values(preferences).some(Boolean);
}

export function isNotificationTypeEnabled(
  type: NotificationType,
  preferences: NotificationPreferences,
): boolean {
  switch (type) {
    case "new_message":
      return preferences.messages;

    case "new_review":
    case "review_reply":
    case "review_reaction":
      return preferences.reviews;

    case "new_comment":
    case "comment_reply":
    case "comment_like":
      return preferences.comments;

    case "new_subscriber":
      return preferences.subscriptions;

    case "service_discount":
    case "new_service_from_subscription":
    case "price_drop":
    case "broadcast":
    case "account_verified":
      return preferences.serviceUpdates;

    default:
      return true;
  }
}
