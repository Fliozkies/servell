import { router } from "expo-router";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { NativeModules, Platform } from "react-native";
import {
  markNotificationRead,
  subscribeToNotifications,
} from "../api/notifications.api";
import { supabase } from "../api/supabase";
import {
  Notification as AppNotification,
  NotificationType,
} from "../types/database.types";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  hasEnabledNotificationPreferences,
  isNotificationTypeEnabled,
  NotificationPreferences,
  subscribeToNotificationPreferenceChanges,
} from "../utils/notificationPreferences";

const SERVELL_PUSH_CHANNEL_ID = "servell-alerts";

type NotificationPermissionsStatus =
  import("expo-notifications").NotificationPermissionsStatus;
type NotificationResponse = import("expo-notifications").NotificationResponse;
type NotificationTriggerInput =
  import("expo-notifications").NotificationTriggerInput;
type EventSubscription = {
  remove: () => void;
};
type LocalNotificationsModule = {
  AndroidImportance: typeof import("expo-notifications").AndroidImportance;
  AndroidNotificationPriority: typeof import("expo-notifications").AndroidNotificationPriority;
  addNotificationResponseReceivedListener: (
    listener: (event: NotificationResponse) => void,
  ) => EventSubscription;
  clearLastNotificationResponse: () => void;
  getLastNotificationResponse: () => NotificationResponse | null;
  getPermissionsAsync: typeof import("expo-notifications").getPermissionsAsync;
  requestPermissionsAsync: typeof import("expo-notifications").requestPermissionsAsync;
  scheduleNotificationAsync: typeof import("expo-notifications").scheduleNotificationAsync;
  setNotificationChannelAsync: typeof import("expo-notifications").setNotificationChannelAsync;
  setNotificationHandler: typeof import("expo-notifications").setNotificationHandler;
};

type PushNotificationData = Record<string, unknown> & {
  notificationId?: string;
  notificationType?: NotificationType;
};

let notificationsModule: LocalNotificationsModule | null | undefined;
let notificationsWarningShown = false;

function hasExpoNativeModule(moduleName: string): boolean {
  const expoModules = (globalThis as any).expo?.modules;
  const legacyProxy = (NativeModules as any).NativeUnimoduleProxy;

  return Boolean(
    expoModules?.[moduleName] ||
      legacyProxy?.exportedMethods?.[moduleName] ||
      legacyProxy?.modulesConstants?.[moduleName] ||
      (NativeModules as any)[moduleName],
  );
}

function hasLocalNotificationNativeModules(): boolean {
  const requiredModules = [
    "ExpoNotificationPermissionsModule",
    "ExpoNotificationScheduler",
    "ExpoNotificationsEmitter",
    "ExpoNotificationsHandlerModule",
  ];

  if (Platform.OS === "android") {
    requiredModules.push("ExpoNotificationChannelManager");
  }

  return requiredModules.every(hasExpoNativeModule);
}

function getNotificationsModule(): LocalNotificationsModule | null {
  if (Platform.OS === "web") return null;
  if (notificationsModule !== undefined) return notificationsModule;

  if (!hasLocalNotificationNativeModules()) {
    notificationsModule = null;
    if (!notificationsWarningShown) {
      notificationsWarningShown = true;
      console.warn(
        "Push notifications are unavailable until the native app is rebuilt.",
      );
    }
    return notificationsModule;
  }

  try {
    const channelManagerTypes = require(
      "expo-notifications/build/NotificationChannelManager.types",
    );
    const emitter = require("expo-notifications/build/NotificationsEmitter");
    const handler = require("expo-notifications/build/NotificationsHandler");
    const notificationTypes = require(
      "expo-notifications/build/Notifications.types",
    );
    const permissions = require(
      "expo-notifications/build/NotificationPermissions",
    );
    const scheduler = require(
      "expo-notifications/build/scheduleNotificationAsync",
    );
    const channel = require(
      "expo-notifications/build/setNotificationChannelAsync",
    );

    notificationsModule = {
      AndroidImportance: channelManagerTypes.AndroidImportance,
      AndroidNotificationPriority: notificationTypes.AndroidNotificationPriority,
      addNotificationResponseReceivedListener:
        emitter.addNotificationResponseReceivedListener,
      clearLastNotificationResponse: emitter.clearLastNotificationResponse,
      getLastNotificationResponse: emitter.getLastNotificationResponse,
      getPermissionsAsync: permissions.getPermissionsAsync,
      requestPermissionsAsync: permissions.requestPermissionsAsync,
      scheduleNotificationAsync: scheduler.scheduleNotificationAsync,
      setNotificationChannelAsync: channel.setNotificationChannelAsync,
      setNotificationHandler: handler.setNotificationHandler,
    };

    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: notificationsModule!.AndroidNotificationPriority.HIGH,
      }),
    });
  } catch (error) {
    notificationsModule = null;
    if (!notificationsWarningShown) {
      notificationsWarningShown = true;
      console.warn("Push notifications are unavailable in this build:", error);
    }
  }

  return notificationsModule;
}

function isPermissionGranted(permission: NotificationPermissionsStatus): boolean {
  const result = permission as unknown as {
    granted?: boolean;
    status?: string;
  };

  return result.granted === true || result.status === "granted";
}

async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(SERVELL_PUSH_CHANNEL_ID, {
      name: "Servell alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1877F2",
      showBadge: true,
      sound: "default",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(existing)) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return isPermissionGranted(requested);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function pushServiceRoute(
  serviceId: string,
  tab?: "reviews" | "comments",
  extraParams?: Record<string, string>,
) {
  router.push({
    pathname: `/service/${serviceId}`,
    params: {
      ...(tab ? { tab } : {}),
      ...extraParams,
    },
  } as any);
}

function navigateFromNotificationData(data: PushNotificationData) {
  const type = data.notificationType;
  if (!type) return;

  const conversationId = readString(data.conversation_id);
  const serviceId = readString(data.service_id);
  const reviewId = readString(data.review_id);
  const commentId = readString(data.comment_id);
  const parentCommentId = readString(data.parent_comment_id);

  switch (type) {
    case "new_message":
      if (conversationId) router.push(`/chat/${conversationId}`);
      break;

    case "new_review":
    case "review_reply":
    case "review_reaction":
      if (serviceId) {
        pushServiceRoute(
          serviceId,
          "reviews",
          reviewId ? { reviewId } : undefined,
        );
      }
      break;

    case "new_comment":
    case "comment_like":
      if (serviceId) {
        pushServiceRoute(
          serviceId,
          "comments",
          commentId ? { commentId } : undefined,
        );
      }
      break;

    case "comment_reply":
      if (serviceId) {
        pushServiceRoute(serviceId, "comments", {
          ...(parentCommentId
            ? { commentId: parentCommentId, expandReplies: "true" }
            : {}),
          ...(!parentCommentId && commentId ? { commentId } : {}),
        });
      }
      break;

    case "service_discount":
    case "new_service_from_subscription":
    case "price_drop":
      if (serviceId) router.push(`/service/${serviceId}`);
      break;

    case "new_subscriber":
    case "broadcast":
    case "account_verified":
      break;
  }
}

function getNotificationResponseData(
  response: NotificationResponse,
): PushNotificationData {
  return response.notification.request.content.data as PushNotificationData;
}

export function PushNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const preferencesRef = useRef(preferences);
  const shownNotificationIds = useRef(new Set<string>());

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let mounted = true;

    getNotificationPreferences()
      .then((storedPreferences) => {
        if (!mounted) return;
        setPreferences(storedPreferences);
      })
      .finally(() => {
        if (mounted) setPreferencesLoaded(true);
      });

    const unsubscribePreferences = subscribeToNotificationPreferenceChanges(
      (nextPreferences) => setPreferences(nextPreferences),
    );

    return () => {
      mounted = false;
      unsubscribePreferences();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) shownNotificationIds.current.clear();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded || !hasEnabledNotificationPreferences(preferences)) {
      return;
    }

    ensureNotificationPermissions().catch((error) => {
      console.warn("Could not initialize push notifications:", error);
    });
  }, [preferences, preferencesLoaded]);

  const handleNotificationResponse = useCallback(
    (response: NotificationResponse) => {
      const Notifications = getNotificationsModule();
      const data = getNotificationResponseData(response);
      const notificationId = readString(data.notificationId);

      if (notificationId) {
        void markNotificationRead(notificationId).catch((error) => {
          console.warn("Could not mark push notification as read:", error);
        });
      }

      navigateFromNotificationData(data);
      Notifications?.clearLastNotificationResponse();
    },
    [],
  );

  useEffect(() => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    try {
      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse) handleNotificationResponse(lastResponse);
    } catch (error) {
      console.warn("Could not read last notification response:", error);
    }

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  const showPushNotification = useCallback(
    async (notification: AppNotification) => {
      if (shownNotificationIds.current.has(notification.id)) return;

      const currentPreferences = preferencesRef.current;
      if (!isNotificationTypeEnabled(notification.type, currentPreferences)) {
        return;
      }

      const Notifications = getNotificationsModule();
      if (!Notifications) return;

      const canNotify = await ensureNotificationPermissions();
      if (!canNotify) return;

      shownNotificationIds.current.add(notification.id);

      const trigger: NotificationTriggerInput =
        Platform.OS === "android"
          ? { channelId: SERVELL_PUSH_CHANNEL_ID }
          : null;

      await Notifications.scheduleNotificationAsync({
        identifier: `servell-${notification.id}`,
        content: {
          title: notification.title,
          body: notification.body,
          sound: "default",
          color: "#1877F2",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            ...(notification.data ?? {}),
            notificationId: notification.id,
            notificationType: notification.type,
          },
        },
        trigger,
      });
    },
    [],
  );

  useEffect(() => {
    if (!userId || !preferencesLoaded) return;

    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      void showPushNotification(notification).catch((error) => {
        console.warn("Could not show push notification:", error);
      });
    });

    return unsubscribe;
  }, [preferencesLoaded, showPushNotification, userId]);

  return <>{children}</>;
}
