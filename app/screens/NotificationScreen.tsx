// app/screens/NotificationScreen.tsx
// Previously: app/juarez_app/pages/notification.tsx
import { useRouter } from "expo-router";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Heart,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  ThumbsUp,
  TrendingDown,
  UserPlus,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/api/notifications.api";
import { COLORS } from "../../lib/constants/theme";
import { Notification, NotificationType } from "../../lib/types/database.types";
import { formatRelativeTime, isToday } from "../../lib/utils/date";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNotifIcon(type: NotificationType): React.ReactElement {
  const props = { size: 20, strokeWidth: 2 };
  switch (type) {
    case "new_message":
      return <MessageCircle {...props} color={COLORS.primary} />;
    case "new_review":
      return <Star {...props} color={COLORS.warning} />;
    case "review_reply":
      return <MessageCircle {...props} color={COLORS.success} />;
    case "review_reaction":
      return <Heart {...props} color="#ec4899" />;
    case "comment_like":
      return <ThumbsUp {...props} color="#ec4899" />;
    case "new_subscriber":
      return <UserPlus {...props} color={COLORS.info} />;
    case "service_discount":
      return <Tag {...props} color={COLORS.danger} />;
    case "new_service_from_subscription":
      return <Sparkles {...props} color={COLORS.primary} />;
    case "price_drop":
      return <TrendingDown {...props} color={COLORS.success} />;
    case "broadcast":
      return <Megaphone {...props} color="#f97316" />;
    case "account_verified":
      return <ShieldCheck {...props} color={COLORS.success} />;
    default:
      return <Bell {...props} color={COLORS.slate500} />;
  }
}

function getNotifAccent(type: NotificationType): string {
  switch (type) {
    case "new_message":
      return "#eff6ff";
    case "new_review":
      return "#fffbeb";
    case "review_reply":
      return "#f0fdf4";
    case "review_reaction":
      return "#fdf4ff";
    case "comment_like":
      return "#fdf4ff";
    case "new_subscriber":
      return "#f5f3ff";
    case "service_discount":
      return "#fff1f2";
    case "new_service_from_subscription":
      return "#eff6ff";
    case "price_drop":
      return "#f0fdf4";
    case "broadcast":
      return "#fff7ed";
    case "account_verified":
      return "#f0fdf4";
    default:
      return COLORS.slate50;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function NotificationScreen({
  onAllRead,
}: {
  onAllRead?: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const todayNotifs = notifications.filter((n) => isToday(n.created_at));
  const earlierNotifs = notifications.filter((n) => !isToday(n.created_at));

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      load(true);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onAllRead?.();
    try {
      await markAllNotificationsRead();
    } catch {
      load(true);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Remove Notification", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          try {
            await deleteNotification(id);
          } catch {
            load(true);
          }
        },
      },
    ]);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }

    // Navigate based on notification type and data
    if (!notification.data) return;

    try {
      switch (notification.type) {
        case "new_message":
          // Navigate to chat conversation
          if (notification.data.conversation_id) {
            router.push(`/chat/${notification.data.conversation_id}`);
          }
          break;

        case "new_review":
          // Navigate to service reviews tab, highlight the specific review
          if (notification.data.service_id && notification.data.review_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "reviews",
                reviewId: notification.data.review_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "reviews" },
            } as any);
          }
          break;

        case "review_reply":
          // Navigate to service reviews tab, highlight the review with the reply
          if (notification.data.service_id && notification.data.review_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "reviews",
                reviewId: notification.data.review_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "reviews" },
            } as any);
          }
          break;

        case "review_reaction":
          // Navigate to service reviews tab, highlight the review that got a reaction
          if (notification.data.service_id && notification.data.review_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "reviews",
                reviewId: notification.data.review_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "reviews" },
            } as any);
          }
          break;

        case "new_comment":
          // Navigate to service comments tab, highlight the specific comment
          // Use parent_comment_id if it's a reply, otherwise use comment_id
          if (notification.data.service_id && notification.data.comment_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "comments",
                commentId: notification.data.comment_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "comments" },
            } as any);
          }
          break;

        case "comment_reply":
          // Navigate to service comments tab
          // For replies, highlight the PARENT comment (so replies section will be visible)
          if (
            notification.data.service_id &&
            notification.data.parent_comment_id
          ) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "comments",
                commentId: notification.data.parent_comment_id,
                expandReplies: "true", // Signal to expand replies
              },
            } as any);
          } else if (
            notification.data.service_id &&
            notification.data.comment_id
          ) {
            // Fallback to comment_id if parent_comment_id not available
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "comments",
                commentId: notification.data.comment_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "comments" },
            } as any);
          }
          break;

        case "comment_like":
          // Navigate to service comments tab, highlight the comment that was liked
          if (notification.data.service_id && notification.data.comment_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: {
                tab: "comments",
                commentId: notification.data.comment_id,
              },
            } as any);
          } else if (notification.data.service_id) {
            router.push({
              pathname: `/service/${notification.data.service_id}`,
              params: { tab: "comments" },
            } as any);
          }
          break;

        case "service_discount":
        case "new_service_from_subscription":
        case "price_drop":
          // Navigate to service detail, default to overview tab
          if (notification.data.service_id) {
            router.push(`/service/${notification.data.service_id}`);
          }
          break;

        case "new_subscriber":
          // Could navigate to subscribers list or profile in the future
          // For now, just mark as read
          break;

        case "account_verified":
        case "broadcast":
          // These notifications don't require navigation
          // They've already been marked as read
          break;

        default:
          console.log("Unhandled notification type:", notification.type);
      }
    } catch (error) {
      console.error("Error navigating from notification:", error);
      Alert.alert("Error", "Unable to navigate to this content.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-5 pb-2 bg-white border-b border-slate-100">
        <View>
          <Text className="text-3xl font-bold text-slate-900">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text className="text-xs text-slate-400 mt-0.5">
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            className="flex-row items-center bg-slate-100 rounded-full px-3 py-1.5"
          >
            <CheckCheck size={14} color={COLORS.primary} />
            <Text className="ml-1.5 text-xs font-semibold text-[#1877F2]">
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-4">
            <Bell size={36} color={COLORS.slate400} />
          </View>
          <Text className="text-lg font-bold text-slate-700 text-center">
            No notifications yet
          </Text>
          <Text className="text-sm text-slate-400 text-center mt-2">
            When you get messages, reviews, or discount alerts, they&apos;ll
            appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={COLORS.primary}
            />
          }
        >
          {todayNotifs.length > 0 && (
            <NotifSection
              title="Today"
              notifications={todayNotifs}
              onPress={handleNotificationPress}
              onDelete={handleDelete}
            />
          )}
          {earlierNotifs.length > 0 && (
            <NotifSection
              title="Earlier"
              notifications={earlierNotifs}
              onPress={handleNotificationPress}
              onDelete={handleDelete}
            />
          )}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function NotifSection({
  title,
  notifications,
  onPress,
  onDelete,
}: {
  title: string;
  notifications: Notification[];
  onPress: (notification: Notification) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View className="mt-4 mx-4">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
        {title}
      </Text>
      <View className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
        {notifications.map((notif, idx) => (
          <NotifRow
            key={notif.id}
            notification={notif}
            onPress={onPress}
            onDelete={onDelete}
            isLast={idx === notifications.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function NotifRow({
  notification,
  onPress,
  onDelete,
  isLast,
}: {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const accent = getNotifAccent(notification.type);
  const isUnread = !notification.is_read;

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      onLongPress={() => onDelete(notification.id)}
      activeOpacity={0.7}
    >
      <View
        className={`flex-row items-start px-4 py-4 ${!isLast ? "border-b border-slate-50" : ""}`}
        style={{ backgroundColor: isUnread ? "#f0f7ff" : COLORS.white }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3 flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          {getNotifIcon(notification.type)}
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text
              className="text-sm font-bold text-slate-900 flex-1 pr-2"
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text className="text-xs text-slate-400 flex-shrink-0">
              {formatRelativeTime(notification.created_at)}
            </Text>
          </View>
          <Text
            className="text-sm text-slate-500 mt-0.5 leading-5"
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </View>

        <View className="ml-2 items-center justify-center self-center">
          {isUnread ? (
            <View className="w-2 h-2 rounded-full bg-[#1877F2]" />
          ) : (
            <ChevronRight size={14} color={COLORS.slate300} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
