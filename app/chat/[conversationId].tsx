// app/chat/[conversationId].tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMessages,
  getImageUrl,
  IMAGE_MESSAGE_PREFIX,
  isImageMessage,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
} from "../../lib/api/messaging.api";
import { supabase } from "../../lib/api/supabase";
import { CachedImage } from "../../lib/components/ui/CachedImage";
import { CHAT_LIST_PROPS } from "../../lib/constants/performance";
import { COLORS } from "../../lib/constants/theme";
import { useCurrentUserId } from "../../lib/hooks/useCurrentUserId";
import { MessageWithSender } from "../../lib/types/database.types";
import { formatTime } from "../../lib/utils/date";
import { uploadImage } from "../../lib/utils/imageUtils";

type LocalMessage = MessageWithSender & {
  _status?: "sending" | "sent" | "failed";
  _localId?: string;
};

type ConversationDetails = {
  id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  service?: { title: string };
  buyer?: { first_name: string; last_name: string | null };
  seller?: { first_name: string; last_name: string | null };
};

// Module-level cache keyed by userId + conversationId — survives navigation
// without reusing another signed-in account's "own message" perspective.
const messagesCacheMap = new Map<string, LocalMessage[]>();
const detailsCacheMap = new Map<string, ConversationDetails>();

const SwipeableMessageBubble = React.memo(({ 
  item, 
  isOwn, 
  isFirstInGroup, 
  onReply, 
  onRetry 
}: { 
  item: LocalMessage; 
  isOwn: boolean; 
  isFirstInGroup: boolean; 
  onReply: (msg: LocalMessage) => void; 
  onRetry: (msg: LocalMessage) => void; 
}) => {
  const translateX = useSharedValue(0);
  const isImage = isImageMessage(item.content);
  const imgUrl = isImage ? getImageUrl(item.content) : null;
  const senderName = item.sender_profile?.first_name || "User";

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (!isOwn) {
        translateX.value = Math.max(0, Math.min(e.translationX, 80));
      }
    })
    .onEnd((e) => {
      if (!isOwn && translateX.value > 50) {
        runOnJS(onReply)(item);
      }
      translateX.value = withSpring(0, { damping: 12, stiffness: 90 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: translateX.value / 50,
    transform: [{ scale: Math.min(translateX.value / 50, 1) }]
  }));

  return (
    <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther, isFirstInGroup && styles.msgFirstInGroup]}>
      {!isOwn && (
        <Animated.View style={[styles.replyIconContainer, iconAnimatedStyle]}>
          <Ionicons name="arrow-undo" size={20} color={COLORS.primary} />
        </Animated.View>
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.bubbleWrap, isOwn && styles.bubbleWrapOwn, animatedStyle]}>
          {!isOwn && isFirstInGroup && (
            <Text style={styles.senderNameText}>{senderName}</Text>
          )}
          {isImage && imgUrl ? (
            <View style={[styles.imageBubble, isOwn ? styles.imageBubbleOwn : styles.imageBubbleOther, item._status === "failed" && styles.bubbleFailed]}>
              <CachedImage uri={imgUrl} style={styles.chatImage} />
              {item._status === "sending" && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, item._status === "failed" && styles.bubbleFailed]}>
              <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                {item.content}
              </Text>
            </View>
          )}

          <View style={[styles.statusRow, isOwn && styles.statusRowOwn]}>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
            {!isOwn && (
              <TouchableOpacity onPress={() => onReply(item)} style={{marginLeft: 6}}>
                <Ionicons name="arrow-undo-outline" size={12} color="#94a3b8" />
              </TouchableOpacity>
            )}
            {item._status === "sending" && (
              <ActivityIndicator size="small" color="#94a3b8" style={styles.statusIcon} />
            )}
            {item._status === "failed" && (
              <TouchableOpacity onPress={() => onRetry(item)} style={styles.retryBtn}>
                <Ionicons name="refresh" size={14} color="#ef4444" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{
    conversationId: string;
  }>();

  const currentUserId = useCurrentUserId();
  const cacheKey =
    currentUserId && conversationId
      ? `${currentUserId}:${conversationId}`
      : null;

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const activeCacheKeyRef = useRef<string | null>(cacheKey);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  useEffect(() => {
    activeCacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  const loadConversationDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          service_id,
          buyer_id,
          seller_id,
          service:services(title),
          buyer:profiles!conversations_buyer_id_fkey(first_name, last_name),
          seller:profiles!conversations_seller_id_fkey(first_name, last_name)
        `,
        )
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      if (!cacheKey || activeCacheKeyRef.current !== cacheKey) return;
      const details = data as unknown as ConversationDetails;
      detailsCacheMap.set(cacheKey, details);
      setConversationDetails(details);
    } catch (err) {
      console.error("Error loading conversation details:", err);
    }
  }, [cacheKey, conversationId]);

  const loadMessages = useCallback(async () => {
    try {
      if (!cacheKey) return;
      const data = await fetchMessages(conversationId);
      const fresh = data.map((m) => ({ ...m, _status: "sent" as const }));
      if (activeCacheKeyRef.current !== cacheKey) return;

      // Only update if something actually changed — avoids unnecessary re-renders.
      const cached = messagesCacheMap.get(cacheKey);
      const lastCachedId = cached?.[cached.length - 1]?.id;
      const lastFreshId = fresh[fresh.length - 1]?.id;
      if (fresh.length !== cached?.length || lastFreshId !== lastCachedId) {
        messagesCacheMap.set(cacheKey, fresh);
        setMessages(fresh);
        scrollToBottom(false);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      if (activeCacheKeyRef.current === cacheKey) setLoading(false);
    }
  }, [cacheKey, conversationId, scrollToBottom]);

  const markAsRead = useCallback(async () => {
    try {
      await markMessagesAsRead(conversationId);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!currentUserId || !cacheKey) {
      setMessages([]);
      setConversationDetails(null);
      setLoading(true);
      return undefined;
    }

    const hasCachedMessages = messagesCacheMap.has(cacheKey);
    const cachedMessages = messagesCacheMap.get(cacheKey) ?? [];
    const cachedDetails = detailsCacheMap.get(cacheKey) ?? null;
    setMessages(cachedMessages);
    setConversationDetails(cachedDetails);
    setLoading(!hasCachedMessages);

    // If we have cached messages, scroll to bottom immediately.
    if (cachedMessages.length > 0) scrollToBottom(false);

    // Always kick off a background sync + detail fetch.
    loadConversationDetails();
    loadMessages();
    markAsRead();

    const unsubscribe = subscribeToMessages(
      conversationId,
      (newMessage) => {
        setMessages((prev) => {
          const existsByServerId = prev.some((m) => m.id === newMessage.id);
          if (existsByServerId) return prev;

          const localIdx = prev.findIndex(
            (m) =>
              m._status === "sending" &&
              m.sender_id === newMessage.sender_id &&
              ((!isImageMessage(m.content) &&
                m.content === newMessage.content) ||
                (isImageMessage(m.content) &&
                  Math.abs(
                    new Date(m.created_at).getTime() -
                    new Date(newMessage.created_at).getTime(),
                  ) < 5000)),
          );

          let next: LocalMessage[];
          if (localIdx !== -1) {
            next = [...prev];
            next[localIdx] = { ...newMessage, _status: "sent" };
          } else {
            next = [...prev, { ...newMessage, _status: "sent" }];
          }

          // Keep cache in sync with realtime updates too.
          messagesCacheMap.set(cacheKey, next);
          return next;
        });

        if (newMessage.sender_id !== currentUserId) markAsRead();
        scrollToBottom();
      },
      loadMessages,
    );

    return unsubscribe;
  }, [
    cacheKey,
    conversationId,
    currentUserId,
    loadConversationDetails,
    loadMessages,
    markAsRead,
    scrollToBottom,
  ]);

  const handleReply = useCallback((msg: LocalMessage) => {
    setReplyTo(msg);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !currentUserId || !cacheKey) return;
    setMessageText("");

    let finalContent = text;
    if (replyTo) {
      const isReplyFromMe = replyTo.sender_id === currentUserId;
      const senderName = isReplyFromMe ? "You" : replyTo.sender_profile?.first_name || "User";
      let previewText = isImageMessage(replyTo.content) ? "📷 Photo" : replyTo.content;
      if (previewText.length > 50) previewText = previewText.substring(0, 50) + "...";
      finalContent = `> Replying to ${senderName}:\n> ${previewText}\n\n${text}`;
    }
    setReplyTo(null);

    const localId = `local_${Date.now()}`;
    const optimistic: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: finalContent,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => {
      const next = [...prev, optimistic];
      messagesCacheMap.set(cacheKey, next);
      return next;
    });
    scrollToBottom();

    try {
      const sentMessage = await sendMessage({
        conversation_id: conversationId,
        content: finalContent,
      });
      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === localId
            ? { ...sentMessage, _status: "sent" as const }
            : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" as const } : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    }
  }, [cacheKey, conversationId, currentUserId, messageText, replyTo, scrollToBottom]);

  const handlePickImage = useCallback(async () => {
    if (!currentUserId || !cacheKey) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0] || !result.assets[0].base64)
      return;
    const asset = result.assets[0];

    const localId = `local_img_${Date.now()}`;
    const optimistic: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: `${IMAGE_MESSAGE_PREFIX}${asset.uri}`,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => {
      const next = [...prev, optimistic];
      messagesCacheMap.set(cacheKey, next);
      return next;
    });
    scrollToBottom();
    setUploadingImage(true);

    try {
      const pickedImage = {
        uri: asset.uri,
        base64: asset.base64 as string,
        mimeType: asset.mimeType ?? "image/jpeg",
      };
      const publicUrl = await uploadImage(pickedImage, "chat-images");
      const content = `${IMAGE_MESSAGE_PREFIX}${publicUrl}`;
      const sentMessage = await sendMessage({
        conversation_id: conversationId,
        content,
      });

      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === localId
            ? { ...sentMessage, _status: "sent" as const }
            : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" as const } : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    } finally {
      setUploadingImage(false);
    }
  }, [cacheKey, conversationId, currentUserId, scrollToBottom]);

  const handleRetry = useCallback(async (msg: LocalMessage) => {
    if (!cacheKey) return;
    setMessages((prev) => {
      const next = prev.map((m) =>
        m._localId === msg._localId
          ? { ...m, _status: "sending" as const }
          : m,
      );
      messagesCacheMap.set(cacheKey, next);
      return next;
    });
    try {
      const sentMessage = await sendMessage({
        conversation_id: conversationId,
        content: msg.content,
      });
      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === msg._localId
            ? { ...sentMessage, _status: "sent" as const }
            : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m._localId === msg._localId
            ? { ...m, _status: "failed" as const }
            : m,
        );
        messagesCacheMap.set(cacheKey, next);
        return next;
      });
    }
  }, [cacheKey, conversationId]);

  const renderMessage = useCallback(({
    item,
    index,
  }: {
    item: LocalMessage;
    index: number;
  }) => {
    const prevItem = index > 0 ? messages[index - 1] : null;
    const isFirstInGroup = !prevItem || prevItem.sender_id !== item.sender_id;

    return (
      <SwipeableMessageBubble
        item={item}
        isOwn={item.sender_id === currentUserId}
        isFirstInGroup={isFirstInGroup}
        onReply={handleReply}
        onRetry={handleRetry}
      />
    );
  }, [currentUserId, handleReply, handleRetry, messages]);

  const messageKeyExtractor = useCallback(
    (item: LocalMessage, idx: number) => item.id || `msg-${idx}`,
    [],
  );

  const getHeaderTitle = () => {
    if (!conversationDetails) return "Chat";
    const otherUser =
      conversationDetails.seller_id === currentUserId
        ? conversationDetails.buyer
        : conversationDetails.seller;
    if (otherUser?.first_name) {
      return `${otherUser.first_name} ${otherUser.last_name || ""}`.trim();
    }
    return conversationDetails.service?.title || "Chat";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.slate900} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          {conversationDetails?.service?.title && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {conversationDetails.service.title}
            </Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        {...CHAT_LIST_PROPS}
        ref={flatListRef}
        data={messages}
        keyExtractor={messageKeyExtractor}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => scrollToBottom(false)}
      />

      <KeyboardAvoidingView behavior="padding">
        {replyTo && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName}>
                Replying to {replyTo.sender_id === currentUserId ? "You" : replyTo.sender_profile?.first_name || "User"}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {isImageMessage(replyTo.content) ? "📷 Photo" : replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyPreviewClose}>
              <Ionicons name="close-circle" size={20} color={COLORS.slate400} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.attachBtn}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              !messageText.trim() && styles.sendBtnDisabled,
            ]}
            disabled={!messageText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={messageText.trim() ? "#fff" : "#cbd5e1"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  headerRight: { width: 32 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12 },
  msgRow: { marginBottom: 4 },
  msgRowOwn: { alignItems: "flex-end" },
  msgRowOther: { alignItems: "flex-start" },
  msgFirstInGroup: { marginTop: 12 },
  bubbleWrap: { maxWidth: "75%" },
  bubbleWrapOwn: { alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleOwn: { backgroundColor: "#3b82f6", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleFailed: { opacity: 0.6, borderWidth: 1, borderColor: "#ef4444" },
  bubbleText: { fontSize: 15, lineHeight: 20, color: "#0f172a" },
  bubbleTextOwn: { color: "#fff" },
  imageBubble: { borderRadius: 12, overflow: "hidden", position: "relative" },
  imageBubbleOwn: { borderBottomRightRadius: 4 },
  imageBubbleOther: { borderBottomLeftRadius: 4 },
  chatImage: { width: 200, height: 200 },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusRowOwn: { justifyContent: "flex-end" },
  timeText: { fontSize: 11, color: "#94a3b8" },
  statusIcon: { marginLeft: 4 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
  },
  attachBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#e2e8f0" },
  replyIconContainer: {
    position: 'absolute',
    left: -35,
    top: '50%',
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
    color: COLORS.slate500,
  },
  replyPreviewClose: {
    padding: 4,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
});
