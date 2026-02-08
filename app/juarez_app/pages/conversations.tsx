// app/juarez_app/pages/conversations.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchConversations,
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

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    // Subscribe to conversation updates
    if (user?.id) {
      const unsubscribe = subscribeToConversations(user.id, () => {
        loadConversations();
      });
      return unsubscribe;
    }
  }, [loadConversations]);

  useEffect(() => {
    loadConversations();
    getCurrentUser();
  }, [loadConversations, getCurrentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return "Just now";
    }
  };

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => {
    // Determine the other user (not the current user)
    const isUserBuyer = currentUserId === item.buyer_id;
    const otherUser = isUserBuyer ? item.seller_profile : item.buyer_profile;
    const otherUserName = otherUser?.first_name
      ? `${otherUser.first_name} ${otherUser.last_name || ""}`.trim()
      : "Unknown User";

    const lastMessagePreview = item.last_message?.content || "No messages yet";
    const hasUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/juarez_app/pages/chat?conversationId=${item.id}`)
        }
        className="bg-white border-b border-slate-200 px-4 py-4"
      >
        <View className="flex-row">
          {/* Service Image */}
          <View className="mr-3">
            {item.service?.image_url ? (
              <Image
                source={{ uri: item.service.image_url }}
                className="w-16 h-16 rounded-2xl"
              />
            ) : (
              <View className="w-16 h-16 rounded-2xl bg-slate-200 items-center justify-center">
                <AntDesign name="picture" size={24} color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex-1">
            {/* Service Title */}
            <Text className="text-sm font-semibold text-slate-900 mb-1">
              {item.service?.title || "Service"}
            </Text>

            {/* Other User Name */}
            <Text className="text-xs text-slate-500 mb-2">
              with {otherUserName}
            </Text>

            {/* Last Message */}
            <Text
              className={`text-sm ${
                hasUnread ? "font-semibold text-slate-900" : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {lastMessagePreview}
            </Text>
          </View>

          {/* Right Side: Time & Unread Badge */}
          <View className="items-end justify-between ml-2">
            <Text className="text-xs text-slate-400">
              {formatTime(item.last_message_at)}
            </Text>
            {hasUnread && (
              <View className="bg-blue-600 rounded-full w-5 h-5 items-center justify-center mt-2">
                <Text className="text-white text-xs font-bold">
                  {item.unread_count! > 9 ? "9+" : item.unread_count}
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
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-slate-900">Messages</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#212529" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={64} color="#94a3b8" />
          <Text className="mt-4 text-slate-800 font-semibold text-lg">
            No Conversations Yet
          </Text>
          <Text className="mt-2 text-slate-600 text-center">
            Start messaging service providers by tapping the Message button on
            any service
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
        />
      )}
    </View>
  );
}
