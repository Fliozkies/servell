// app/screens/ConversationsScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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
import { ConversationsScreenSkeleton } from "../../lib/components/SkeletonLoader";
import { CachedImage } from "../../lib/components/ui/CachedImage";
import { VERTICAL_LIST_PROPS } from "../../lib/constants/performance";
import { COLORS } from "../../lib/constants/theme";
import { useScrollDirection } from "../../lib/context/ScrollDirectionContext";
import { useCurrentUserId } from "../../lib/hooks/useCurrentUserId";
import { ConversationWithDetails } from "../../lib/types/database.types";
import { formatRelativeTime } from "../../lib/utils/date";
import { formatDisplayName } from "../../lib/utils/format";

// Module-level cache keyed by userId — survives navigation without leaking one
// account's conversation identity into another account after sign out/sign in.
const conversationsCacheMap = new Map<string, ConversationWithDetails[]>();

function getConversationPreview(msg: ConversationWithDetails["last_message"]) {
  if (!msg) return "No messages yet";
  if (isImageMessage(msg.content)) return "📷 Photo";
  return msg.content;
}

const ConversationRow = React.memo(function ConversationRow({
  item,
  currentUserId,
  onPress,
}: {
  item: ConversationWithDetails;
  currentUserId: string | null;
  onPress: (id: string) => void;
}) {
  const isUserBuyer = currentUserId === item.buyer_id;
  const otherUser = isUserBuyer ? item.seller_profile : item.buyer_profile;
  const otherName = formatDisplayName(otherUser ?? null, "Unknown User");
  const initials = otherName.charAt(0).toUpperCase();
  const hasUnread = (item.unread_count || 0) > 0;
  let preview = getConversationPreview(item.last_message);

  if (item.last_message && currentUserId) {
    const isLastMessageFromMe = item.last_message.sender_id === currentUserId;
    const senderFirstName = isLastMessageFromMe
      ? "You"
      : otherUser?.first_name || "User";
    preview = `${senderFirstName}: ${preview}`;
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item.id)}
      style={[styles.row, hasUnread && styles.rowUnread]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {item.service?.image_url ? (
          <CachedImage
            uri={item.service.image_url}
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
});

export default function ConversationsScreen() {
  const currentUserId = useCurrentUserId();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { createScrollHandler } = useScrollDirection();
  const scrollHandler = useRef(createScrollHandler()).current;
  const activeUserIdRef = useRef<string | null>(currentUserId);
  const fetchInFlightForRef = useRef<string | null>(null);

  useEffect(() => {
    activeUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const loadConversations = useCallback(
    async (userId: string, silent = false) => {
      if (silent && fetchInFlightForRef.current === userId) return;
      fetchInFlightForRef.current = userId;
      try {
        // Never block the UI if we already have cached data.
        if (!silent && !conversationsCacheMap.has(userId)) setLoading(true);
        const data = await fetchConversations();
        if (activeUserIdRef.current !== userId) return;
        conversationsCacheMap.set(userId, data);
        setConversations(data);
      } catch (err) {
        if (activeUserIdRef.current === userId) {
          console.error("Error loading conversations:", err);
        }
      } finally {
        if (activeUserIdRef.current === userId) {
          setLoading(false);
          setRefreshing(false);
        }
        if (fetchInFlightForRef.current === userId) {
          fetchInFlightForRef.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!currentUserId) {
      setConversations([]);
      setLoading(true);
      setRefreshing(false);
      return undefined;
    }

    const cached = conversationsCacheMap.get(currentUserId);
    setConversations(cached ?? []);
    setLoading(!cached);

    unsubscribe = subscribeToConversations(currentUserId, () => {
      loadConversations(currentUserId, true);
    });

    loadConversations(currentUserId, Boolean(cached));

    return () => unsubscribe?.();
  }, [currentUserId, loadConversations]);

  // Background sync whenever the screen regains focus (e.g. returning from chat).
  // Always silent — list stays visible and just patches quietly.
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) loadConversations(currentUserId, true);
    }, [currentUserId, loadConversations]),
  );

  const onRefresh = () => {
    if (!currentUserId) return;
    setRefreshing(true);
    loadConversations(currentUserId);
  };

  const openConversation = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, []);
  const keyExtractor = useCallback(
    (item: ConversationWithDetails) => item.id,
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: ConversationWithDetails }) => (
      <ConversationRow
        item={item}
        currentUserId={currentUserId}
        onPress={openConversation}
      />
    ),
    [currentUserId, openConversation],
  );
  const getItemLayout = useCallback(
    (
      _: ArrayLike<ConversationWithDetails> | null | undefined,
      index: number,
    ) => ({
      length: 77,
      offset: 77 * index,
      index,
    }),
    [],
  );

  if (loading) {
    return <ConversationsScreenSkeleton />;
  }

  return (
    <View className="flex-1 bg-white">
      <View style={styles.root}>
        <View className="flex-row items-center justify-between bg-white px-5 pb-2 border-b border-slate-100">
          <Text className="text-3xl font-bold text-slate-900">Messages</Text>
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
            {...VERTICAL_LIST_PROPS}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            data={conversations}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
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
