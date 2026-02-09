// app/juarez_app/pages/chat.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  KeyboardAvoidingView
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMessages,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
} from "../../../lib/api/messaging.api";
import { supabase } from "../../../lib/api/supabase";
import { MessageWithSender } from "../../../lib/types/database.types";

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // insets
  const insets = useSafeAreaInsets();

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data);
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
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

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage as MessageWithSender]);
      markAsRead();
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [conversationId, loadMessages, getCurrentUser, markAsRead]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const textToSend = messageText.trim();
    setMessageText("");

    try {
      setSending(true);
      await sendMessage({
        conversation_id: conversationId,
        content: textToSend,
      });
      // Message will be added via subscription
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageText(textToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    const senderName = item.sender_profile?.first_name || "Unknown";

    return (
      <View
        className={`mb-3 px-4 ${isOwnMessage ? "items-end" : "items-start"}`}
      >
        {/* Sender Name (for other user's messages) */}
        {!isOwnMessage && (
          <Text className="text-xs text-slate-500 mb-1">{senderName}</Text>
        )}

        {/* Message Bubble */}
        <View
          className={`max-w-[80%] px-4 py-3 rounded-2xl ${
            isOwnMessage
              ? "bg-blue-600 rounded-br-sm"
              : "bg-slate-200 rounded-bl-sm"
          }`}
        >
          <Text
            className={`text-base ${
              isOwnMessage ? "text-white" : "text-slate-900"
            }`}
          >
            {item.content}
          </Text>
        </View>

        {/* Timestamp */}
        <Text className="text-xs text-slate-400 mt-1">
          {formatMessageTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-slate-50"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-12 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Chat</Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
            <Text className="mt-4 text-slate-600">No messages yet</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Start the conversation!
            </Text>
          </View>
        }
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Input Area */}
      <View
        className="bg-white border-t border-slate-200 px-4 py-3"
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-center">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
            className="flex-1 bg-slate-100 px-4 py-3 rounded-2xl text-base text-slate-900 max-h-24"
            style={{ minHeight: 44 }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            className={`ml-3 w-11 h-11 rounded-full items-center justify-center ${
              messageText.trim() && !sending ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={messageText.trim() ? "#ffffff" : "#94a3b8"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
