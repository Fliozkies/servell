// app/screens/ConversationsScreen.tsx
// Previously: app/juarez_app/pages/conversations.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
} from "../../lib/api/messaging.api";
import { supabase } from "../../lib/api/supabase";
import { COLORS } from "../../lib/constants/theme";
import { ConversationWithDetails } from "../../lib/types/database.types";
import { formatRelativeTime } from "../../lib/utils/date";
import { formatDisplayName } from "../../lib/utils/format";

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
    } catch (err) {
      console.error("Error loading conversations:", err);
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
      unsubscribe = subscribeToConversations(user.id, () => {
        loadConversations(true);
      });
    };

    init();
    return () => unsubscribe?.();
  }, [loadConversations]);

  // Refresh conversations when screen comes into focus (e.g., returning from chat)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we've already loaded once (skip initial mount)
      if (hasLoadedRef.current) {
        loadConversations(true);
      }
    }, [loadConversations]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const getPreview = (msg: ConversationWithDetails["last_message"]) => {
    if (!msg) return "No messages yet";
    if (isImageMessage(msg.content)) return "📷 Photo";
    return msg.content;
  };

  const renderItem = ({ item }: { item: ConversationWithDetails }) => {
    const isUserBuyer = currentUserId === item.buyer_id;
    const otherUser = isUserBuyer ? item.seller_profile : item.buyer_profile;
    const otherName = formatDisplayName(otherUser ?? null, "Unknown User");
    const initials = otherName.charAt(0).toUpperCase();
    const hasUnread = (item.unread_count || 0) > 0;
    const preview = getPreview(item.last_message);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}`)}
        style={[styles.row, hasUnread && styles.rowUnread]}
        activeOpacity={0.7}
      >
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

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text
              style={[styles.nameText, hasUnread && styles.nameTextBold]}
              numberOfLines={1}
            >
              {otherName}
            </Text>
            <Text style={styles.timeText}>
              {formatRelativeTime(item.last_message_at)}
            </Text>
          </View>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.service?.title ?? "Service"}
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading messages…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View style={styles.root}>
        <View className="flex-row items-center justify-between bg-white px-5 pb-2 border-b border-slate-100">
          <Text className="text-3xl font-bold text-slate-900">Messages</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={COLORS.slate500} />
          </TouchableOpacity>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={COLORS.slate300}
            />
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
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.slate50 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: { marginTop: 12, color: COLORS.slate500, fontSize: 14 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: 1, backgroundColor: COLORS.slate100, marginLeft: 76 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
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
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nameText: {
    fontSize: 15,
    color: COLORS.slate900,
    fontWeight: "500",
    flex: 1,
  },
  nameTextBold: { fontWeight: "700" },
  timeText: { fontSize: 11, color: COLORS.slate400, marginLeft: 8 },
  serviceTitle: { fontSize: 12, color: COLORS.slate500, marginBottom: 3 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewText: { fontSize: 13, color: COLORS.slate400, flex: 1 },
  previewTextBold: { color: COLORS.slate900, fontWeight: "600" },
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
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.slate500 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.slate400,
    textAlign: "center",
    lineHeight: 20,
  },
});
