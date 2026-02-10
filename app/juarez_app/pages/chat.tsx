// app/juarez_app/pages/chat.tsx
import { uploadImage } from "@/lib/functions/create_service";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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
} from "../../../lib/api/messaging.api";
import { supabase } from "../../../lib/api/supabase";
import { MessageWithSender } from "../../../lib/types/database.types";

// Extend MessageWithSender with optimistic UI fields
type LocalMessage = MessageWithSender & {
  _status?: "sending" | "sent" | "failed";
  _localId?: string; // Temp ID before DB confirms
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 80);
  };

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data.map((m) => ({ ...m, _status: "sent" })));
      scrollToBottom(false);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    try {
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [conversationId]);

  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }, []);

  useEffect(() => {
    loadMessages();
    getCurrentUser();
    markAsRead();

    // Real-time subscription — Messenger style, no polling
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        // If it matches a local optimistic message, replace it with confirmed DB message
        const localIdx = prev.findIndex(
          (m) =>
            m._status === "sending" &&
            m.content === newMessage.content &&
            m.sender_id === newMessage.sender_id,
        );
        if (localIdx !== -1) {
          const updated = [...prev];
          updated[localIdx] = { ...newMessage, _status: "sent" };
          return updated;
        }
        // Otherwise it's a message from the other user — append it
        return [...prev, { ...newMessage, _status: "sent" }];
      });
      markAsRead();
      scrollToBottom();
    });

    return unsubscribe;
  }, [conversationId, loadMessages, getCurrentUser, markAsRead]);

  // Optimistic send for text messages
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !currentUserId) return;

    setMessageText("");

    const localId = `local_${Date.now()}`;
    const optimisticMsg: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    // Show optimistically immediately
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      await sendMessage({ conversation_id: conversationId, content: text });
      // The real-time subscription will replace the optimistic message with the confirmed one.
      // If subscription fires before our catch, the localIdx match handles dedup.
    } catch (error) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" } : m,
        ),
      );
      console.log("Error: " + error);
    }
  };

  // Pick and send image
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;

    const localId = `local_img_${Date.now()}`;
    const optimisticMsg: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId!,
      content: `${IMAGE_MESSAGE_PREFIX}${uri}`, // Show local URI optimistically
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    setUploadingImage(true);

    try {
      const publicUrl = await uploadImage(uri, "chat-images");
      const content = `${IMAGE_MESSAGE_PREFIX}${publicUrl}`;
      await sendMessage({ conversation_id: conversationId, content });
      // Replace optimistic with the real URL version (subscription will confirm)
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, content, _status: "sent" } : m,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m._localId === localId ? { ...m, _status: "failed" } : m,
        ),
      );
      console.log("Error: " + error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Retry a failed message
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: LocalMessage;
    index: number;
  }) => {
    const isOwn = item.sender_id === currentUserId;
    const senderName = item.sender_profile?.first_name || "User";
    const isImage = isImageMessage(item.content);
    const imgUrl = isImage ? getImageUrl(item.content) : null;

    // Group consecutive messages from same sender
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
        {/* Avatar — only for first in group, other user */}
        {!isOwn && isFirstInGroup && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {!isOwn && !isFirstInGroup && <View style={styles.avatarSpacer} />}

        <View style={[styles.bubbleWrap, isOwn && styles.bubbleWrapOwn]}>
          {!isOwn && isFirstInGroup && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}

          {/* Image or text bubble */}
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

          {/* Status row */}
          <View style={[styles.statusRow, isOwn && styles.statusRowOwn]}>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
            {isOwn && (
              <>
                {item._status === "sending" && (
                  <ActivityIndicator
                    size={10}
                    color="#94a3b8"
                    style={styles.statusIcon}
                  />
                )}
                {item._status === "sent" && (
                  <Ionicons
                    name="checkmark-done"
                    size={13}
                    color="#3b82f6"
                    style={styles.statusIcon}
                  />
                )}
                {item._status === "failed" && (
                  <TouchableOpacity
                    onPress={() => handleRetry(item)}
                    style={styles.retryBtn}
                  >
                    <AntDesign
                      name="exclamation-circle"
                      size={12}
                      color="#ef4444"
                    />
                    <Text style={styles.retryText}>Tap to retry</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.root}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Ionicons name="chatbubbles" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._localId ?? item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Say hello!</Text>
          </View>
        }
        onContentSizeChange={() => scrollToBottom(false)}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Image picker button */}
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploadingImage}
          style={styles.imageBtn}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Ionicons name="image-outline" size={22} color="#64748b" />
          )}
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message…"
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={1000}
          style={styles.textInput}
          onSubmitEditing={handleSend}
        />

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!messageText.trim()}
          style={[
            styles.sendBtn,
            !messageText.trim() && styles.sendBtnDisabled,
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color={messageText.trim() ? "#fff" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  listContent: { paddingVertical: 12, paddingHorizontal: 12, flexGrow: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#94a3b8" },
  emptySubtitle: { fontSize: 13, color: "#cbd5e1" },

  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  msgRowOwn: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  msgFirstInGroup: { marginTop: 10 },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    alignSelf: "flex-end",
  },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  avatarSpacer: { width: 36 },

  bubbleWrap: { maxWidth: "75%", alignItems: "flex-start" },
  bubbleWrapOwn: { alignItems: "flex-end" },
  senderName: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: 4,
  },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bubbleFailed: {
    opacity: 0.6,
  },
  bubbleText: { fontSize: 15, color: "#0f172a", lineHeight: 21 },
  bubbleTextOwn: { color: "#fff" },

  imageBubble: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imageBubbleOwn: { borderBottomRightRadius: 4 },
  imageBubbleOther: { borderBottomLeftRadius: 4 },
  chatImage: { width: 200, height: 160 },
  imageLoadingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
    paddingHorizontal: 4,
  },
  statusRowOwn: { justifyContent: "flex-end" },
  timeText: { fontSize: 10, color: "#94a3b8" },
  statusIcon: { marginLeft: 2 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  retryText: { fontSize: 10, color: "#ef4444", fontWeight: "600" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: "#e2e8f0",
  },
});
