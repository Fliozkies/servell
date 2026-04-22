// app/chat/[conversationId].tsx
// FIXES: Issues 12, 13, 14
// - Messages from other users appear immediately (Issue 12)
// - Chat header shows service provider name instead of generic "Chat" (Issue 13)
// - Image double-send fixed with better deduplication (Issue 14)

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
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
  service?: {
    title: string;
  };
  buyer?: {
    first_name: string;
    last_name: string | null;
  };
  seller?: {
    first_name: string;
    last_name: string | null;
  };
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const currentUserId = useCurrentUserId();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const scrollToBottom = (animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  };

  // Fetch conversation details including provider name
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
      setConversationDetails(data as unknown as ConversationDetails);
    } catch (err) {
      console.error("Error loading conversation details:", err);
    }
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data.map((m) => ({ ...m, _status: "sent" })));
      scrollToBottom(false);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    try {
      await markMessagesAsRead(conversationId);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [conversationId]);

  // Mark messages as read whenever screen is focused (covers back-navigation too)
  useFocusEffect(
    useCallback(() => {
      markAsRead();
    }, [markAsRead]),
  );

  useEffect(() => {
    loadConversationDetails();
    loadMessages();
    markAsRead();

    // FIX Issue 12 & 14: Improved subscription with better deduplication
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        // Check if message already exists by ID
        const existsByServerId = prev.some((m) => m.id === newMessage.id);
        if (existsByServerId) {
          return prev;
        }

        // FIX Issue 14: Better matching for optimistic updates
        // Find local message that matches this server message
        const localIdx = prev.findIndex(
          (m) =>
            m._status === "sending" &&
            m.sender_id === newMessage.sender_id &&
            // For text messages, match by content
            ((!isImageMessage(m.content) && m.content === newMessage.content) ||
              // For images, match by similar timestamps (within 5 seconds)
              (isImageMessage(m.content) &&
                Math.abs(
                  new Date(m.created_at).getTime() -
                    new Date(newMessage.created_at).getTime(),
                ) < 5000)),
        );

        if (localIdx !== -1) {
          // Replace optimistic message with server message
          const updated = [...prev];
          updated[localIdx] = { ...newMessage, _status: "sent" };
          return updated;
        }

        // FIX Issue 12: New message from other user - add immediately
        return [...prev, { ...newMessage, _status: "sent" }];
      });

      // Only mark as read if message is from other user
      if (newMessage.sender_id !== currentUserId) {
        markAsRead();
      }
      scrollToBottom();
    });

    return unsubscribe;
  }, [
    conversationId,
    loadConversationDetails,
    loadMessages,
    markAsRead,
    currentUserId,
  ]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !currentUserId) return;
    setMessageText("");

    const localId = `local_${Date.now()}`;
    const optimistic: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      await sendMessage({ conversation_id: conversationId, content: text });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" } : m,
        ),
      );
    }
  };

  const handlePickImage = async () => {
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
      sender_id: currentUserId!,
      content: `${IMAGE_MESSAGE_PREFIX}${asset.uri}`,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
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
      await sendMessage({ conversation_id: conversationId, content });

      // Update local message with final URL
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, content, _status: "sent" } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" } : m,
        ),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRetry = async (msg: LocalMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m._localId === msg._localId ? { ...m, _status: "sending" } : m,
      ),
    );
    try {
      await sendMessage({
        conversation_id: conversationId,
        content: msg.content,
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === msg._localId ? { ...m, _status: "failed" } : m,
        ),
      );
    }
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: LocalMessage;
    index: number;
  }) => {
    const isOwn = item.sender_id === currentUserId;
    const isImage = isImageMessage(item.content);
    const imgUrl = isImage ? getImageUrl(item.content) : null;
    const prevItem = index > 0 ? messages[index - 1] : null;
    const isFirstInGroup = !prevItem || prevItem.sender_id !== item.sender_id;

    return (
      <View
        style={[
          styles.msgRow,
          isOwn ? styles.msgRowOwn : styles.msgRowOther,
          isFirstInGroup && styles.msgFirstInGroup,
        ]}
      >
        <View style={[styles.bubbleWrap, isOwn && styles.bubbleWrapOwn]}>
          {isImage && imgUrl ? (
            <View
              style={[
                styles.imageBubble,
                isOwn ? styles.imageBubbleOwn : styles.imageBubbleOther,
                item._status === "failed" && styles.bubbleFailed,
              ]}
            >
              <Image
                source={{ uri: imgUrl }}
                style={styles.chatImage}
                resizeMode="cover"
              />
              {item._status === "sending" && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.bubble,
                isOwn ? styles.bubbleOwn : styles.bubbleOther,
                item._status === "failed" && styles.bubbleFailed,
              ]}
            >
              <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                {item.content}
              </Text>
            </View>
          )}

          <View style={[styles.statusRow, isOwn && styles.statusRowOwn]}>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
            {item._status === "sending" && (
              <ActivityIndicator
                size="small"
                color="#94a3b8"
                style={styles.statusIcon}
              />
            )}
            {item._status === "failed" && (
              <TouchableOpacity
                onPress={() => handleRetry(item)}
                style={styles.retryBtn}
              >
                <Ionicons name="refresh" size={14} color="#ef4444" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // FIX Issue 13: Display provider name in header
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
    <View style={{ flex: 1 }}>
      {/* Header with provider name */}
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

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, idx) => item.id || `msg-${idx}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => scrollToBottom(false)}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior="padding">
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
    </View>
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
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgRow: {
    marginBottom: 4,
  },
  msgRowOwn: {
    alignItems: "flex-end",
  },
  msgRowOther: {
    alignItems: "flex-start",
  },
  msgFirstInGroup: {
    marginTop: 12,
  },
  bubbleWrap: {
    maxWidth: "75%",
  },
  bubbleWrapOwn: {
    alignItems: "flex-end",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  bubbleFailed: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#0f172a",
  },
  bubbleTextOwn: {
    color: "#fff",
  },
  imageBubble: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  imageBubbleOwn: {
    borderBottomRightRadius: 4,
  },
  imageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  chatImage: {
    width: 200,
    height: 200,
  },
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
  statusRowOwn: {
    justifyContent: "flex-end",
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  statusIcon: {
    marginLeft: 4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  retryText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
  },
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
  attachBtn: {
    padding: 8,
  },
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
  sendBtnDisabled: {
    backgroundColor: "#e2e8f0",
  },
});
