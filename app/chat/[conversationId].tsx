// app/chat/[conversationId].tsx  ←  Proper Expo Router dynamic route
// Previously: app/juarez_app/pages/chat.tsx
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchMessages,
  getImageUrl,
  IMAGE_MESSAGE_PREFIX,
  isImageMessage,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
} from "../../lib/api/messaging.api";
import { COLORS } from "../../lib/constants/theme";
import { useCurrentUserId } from "../../lib/hooks/useCurrentUserId";
import { MessageWithSender } from "../../lib/types/database.types";
import { formatTime } from "../../lib/utils/date";
import { uploadImage } from "../../lib/utils/imageUtils";

type LocalMessage = MessageWithSender & {
  _status?: "sending" | "sent" | "failed";
  _localId?: string;
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const currentUserId = useCurrentUserId();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  };

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

  useEffect(() => {
    loadMessages();
    markAsRead();

    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
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
        return [...prev, { ...newMessage, _status: "sent" }];
      });
      markAsRead();
      scrollToBottom();
    });

    return unsubscribe;
  }, [conversationId, loadMessages, markAsRead]);

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
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;

    const localId = `local_img_${Date.now()}`;
    const optimistic: LocalMessage = {
      id: localId,
      _localId: localId,
      conversation_id: conversationId,
      sender_id: currentUserId!,
      content: `${IMAGE_MESSAGE_PREFIX}${uri}`,
      is_read: false,
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();
    setUploadingImage(true);

    try {
      const publicUrl = await uploadImage(uri, "chat-images");
      const content = `${IMAGE_MESSAGE_PREFIX}${publicUrl}`;
      await sendMessage({ conversation_id: conversationId, content });
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
            {isOwn && (
              <>
                {item._status === "sending" && (
                  <ActivityIndicator
                    size={10}
                    color={COLORS.slate400}
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
                      color={COLORS.danger}
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.root}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.slate900} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Ionicons name="chatbubbles" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.headerTitle}>Chat</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._localId ?? item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="chatbubbles-outline"
                size={52}
                color={COLORS.slate300}
              />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Say hello!</Text>
            </View>
          }
          onContentSizeChange={() => scrollToBottom(false)}
        />

        <View style={[styles.inputBar]}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingImage}
            style={styles.imageBtn}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons
                name="image-outline"
                size={22}
                color={COLORS.slate500}
              />
            )}
          </TouchableOpacity>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message…"
            placeholderTextColor={COLORS.slate400}
            multiline
            maxLength={1000}
            style={styles.textInput}
            onSubmitEditing={handleSend}
          />

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
              color={messageText.trim() ? "#fff" : COLORS.slate400}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.slate50 },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.slate100,
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.slate900 },
  listContent: { paddingVertical: 12, paddingHorizontal: 12, flexGrow: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: COLORS.slate400 },
  emptySubtitle: { fontSize: 13, color: COLORS.slate300 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
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
    color: COLORS.slate400,
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  bubbleOwn: { backgroundColor: "#2563eb", borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  bubbleFailed: { opacity: 0.6 },
  bubbleText: { fontSize: 15, color: COLORS.slate900, lineHeight: 21 },
  bubbleTextOwn: { color: COLORS.white },
  imageBubble: { borderRadius: 16, overflow: "hidden", position: "relative" },
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
  timeText: { fontSize: 10, color: COLORS.slate400 },
  statusIcon: { marginLeft: 2 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  retryText: { fontSize: 10, color: COLORS.danger, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.slate100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.slate900,
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
  sendBtnDisabled: { backgroundColor: COLORS.slate200 },
});
