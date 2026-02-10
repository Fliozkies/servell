import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications.api";
import { Notification, NotificationType } from "@/lib/types/database.types";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNotifIcon(type: NotificationType): React.ReactElement {
  const props = { size: 20, strokeWidth: 2 };
  switch (type) {
    case "new_message":
      return <MessageCircle {...props} color="#1877F2" />;
    case "new_review":
      return <Star {...props} color="#f59e0b" />;
    case "review_reply":
      return <MessageCircle {...props} color="#10b981" />;
    case "review_reaction":
      return <Star {...props} color="#ec4899" />;
    case "new_subscriber":
      return <UserPlus {...props} color="#8b5cf6" />;
    case "service_discount":
      return <Tag {...props} color="#ef4444" />;
    case "new_service_from_subscription":
      return <Sparkles {...props} color="#1877F2" />;
    case "price_drop":
      return <TrendingDown {...props} color="#10b981" />;
    case "broadcast":
      return <Megaphone {...props} color="#f97316" />;
    case "account_verified":
      return <ShieldCheck {...props} color="#10b981" />;
    default:
      return <Bell {...props} color="#64748b" />;
  }
}

function getNotifAccentColor(type: NotificationType): string {
  switch (type) {
    case "new_message":
      return "#eff6ff";
    case "new_review":
      return "#fffbeb";
    case "review_reply":
      return "#f0fdf4";
    case "review_reaction":
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
      return "#f8fafc";
  }
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function isToday(dateString: string): boolean {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NotificationScreen({
  onAllRead,
}: {
  onAllRead?: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1877F2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">
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
            <CheckCheck size={14} color="#1877F2" />
            <Text className="ml-1.5 text-xs font-semibold text-[#1877F2]">
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mb-4">
            <Bell size={36} color="#94a3b8" />
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
              onRefresh={handleRefresh}
              tintColor="#1877F2"
            />
          }
        >
          {todayNotifs.length > 0 && (
            <NotifSection
              title="Today"
              notifications={todayNotifs}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          )}
          {earlierNotifs.length > 0 && (
            <NotifSection
              title="Earlier"
              notifications={earlierNotifs}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          )}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

function NotifSection({
  title,
  notifications,
  onMarkRead,
  onDelete,
}: {
  title: string;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
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
            onMarkRead={onMarkRead}
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
  onMarkRead,
  onDelete,
  isLast,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const accent = getNotifAccentColor(notification.type);
  const isUnread = !notification.is_read;

  const handlePress = () => {
    if (isUnread) onMarkRead(notification.id);
    // TODO: deep-link using notification.data (e.g. navigate to service or conversation)
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => onDelete(notification.id)}
      activeOpacity={0.7}
    >
      <View
        className={`flex-row items-start px-4 py-4 ${!isLast ? "border-b border-slate-50" : ""}`}
        style={{ backgroundColor: isUnread ? "#f0f7ff" : "white" }}
      >
        {/* Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3 flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          {getNotifIcon(notification.type)}
        </View>

        {/* Content */}
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

        {/* Unread dot + chevron */}
        <View className="ml-2 items-center justify-center self-center">
          {isUnread ? (
            <View className="w-2 h-2 rounded-full bg-[#1877F2]" />
          ) : (
            <ChevronRight size={14} color="#cbd5e1" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
