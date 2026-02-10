// app/juarez_app/pages/conversations.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchConversations,
  isImageMessage,
  subscribeToConversations,
} from "../../../lib/api/messaging.api";
import { supabase } from "../../../lib/api/supabase";
import { ConversationWithDetails } from "../../../lib/types/database.types";

export default function ConversationsScreen() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      await loadConversations();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Subscribe once — stays alive for the lifetime of the screen
      // Silently refresh conversations list when any update comes in
      unsubscribe = subscribeToConversations(user.id, () => {
        loadConversations(true); // Silent refresh — no spinner
      });
    };

    init();

    return () => {
      unsubscribe?.();
    };
  }, [loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (hours < 1) return `${mins}m`;
    if (days < 1) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getLastMessagePreview = (
    msg: ConversationWithDetails["last_message"],
  ) => {
    if (!msg) return "No messages yet";
    if (isImageMessage(msg.content)) return "📷 Photo";
    return msg.content;
  };

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => {
    const isUserBuyer = currentUserId === item.buyer_id;
    const otherUser = isUserBuyer ? item.seller_profile : item.buyer_profile;
    const otherUserName = otherUser?.first_name
      ? `${otherUser.first_name} ${otherUser.last_name || ""}`.trim()
      : "Unknown User";
    const initials = otherUserName.charAt(0).toUpperCase();
    const hasUnread = (item.unread_count || 0) > 0;
    const preview = getLastMessagePreview(item.last_message);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/juarez_app/pages/chat?conversationId=${item.id}`)
        }
        style={[styles.row, hasUnread && styles.rowUnread]}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {item.service?.image_url ? (
            <Image
              source={{ uri: item.service.image_url }}
              style={styles.serviceThumb}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text
              style={[styles.nameText, hasUnread && styles.nameTextBold]}
              numberOfLines={1}
            >
              {otherUserName}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.service?.title || "Service"}
          </Text>

          <View style={styles.rowBottom}>
            <Text
              style={[styles.previewText, hasUnread && styles.previewTextBold]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count! > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={styles.loaderText}>Loading messages…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start messaging a service provider by tapping Message on any
            service.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1877F2"]}
              tintColor="#1877F2"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: { marginTop: 12, color: "#64748b", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 76 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowUnread: { backgroundColor: "#f0f7ff" },
  avatarWrap: { position: "relative", marginRight: 12 },
  serviceThumb: { width: 52, height: 52, borderRadius: 14 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nameText: { fontSize: 15, color: "#0f172a", fontWeight: "500", flex: 1 },
  nameTextBold: { fontWeight: "700" },
  timeText: { fontSize: 11, color: "#94a3b8", marginLeft: 8 },
  serviceTitle: { fontSize: 12, color: "#64748b", marginBottom: 3 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewText: { fontSize: 13, color: "#94a3b8", flex: 1 },
  previewTextBold: { color: "#0f172a", fontWeight: "600" },
  badge: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#64748b" },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
});
