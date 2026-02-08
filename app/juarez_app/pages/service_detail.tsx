// app/juarez_app/pages/service_detail.tsx
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOrCreateConversation } from "../../../lib/api/messaging.api";
import { supabase } from "../../../lib/api/supabase";
import { ServiceWithDetails } from "../../../lib/types/database.types";

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<ServiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const loadService = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setService(data);
    } catch (error) {
      console.error("Error loading service:", error);
      Alert.alert("Error", "Failed to load service details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }, []);

  useEffect(() => {
    loadService();
    getCurrentUser();
  }, [loadService, getCurrentUser]);

  const handleStartChat = async () => {
    if (!service || !currentUserId) {
      Alert.alert("Error", "Please log in to message the seller");
      return;
    }

    if (currentUserId === service.user_id) {
      Alert.alert("Info", "You cannot message yourself");
      return;
    }

    try {
      setStartingChat(true);
      const conversation = await getOrCreateConversation({
        service_id: service.id,
        seller_id: service.user_id,
      });

      // Navigate to chat screen
      router.push(`/juarez_app/pages/chat?conversationId=${conversation.id}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  const handleCall = () => {
    if (service?.phone_number) {
      Linking.openURL(`tel:${service.phone_number}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  if (!service) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="exclamation-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-slate-800 font-semibold">
          Service not found
        </Text>
      </View>
    );
  }

  const authorName = service.profile?.first_name
    ? `${service.profile.first_name} ${service.profile.last_name || ""}`.trim()
    : "Unknown";
  const categoryName = service.category?.name || "Uncategorized";
  const isOwnService = currentUserId === service.user_id;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-12 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900">
          Service Details
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Image */}
        {service.image_url ? (
          <Image
            source={{ uri: service.image_url }}
            className="w-full h-64"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-64 bg-slate-200 items-center justify-center">
            <AntDesign name="picture" size={64} color="#94a3b8" />
          </View>
        )}

        {/* Content */}
        <View className="p-4">
          {/* Category Badge */}
          <View className="flex-row items-center mb-2">
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-600 text-xs font-semibold">
                {categoryName}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-slate-900 mb-2">
            {service.title}
          </Text>

          {/* Rating */}
          <View className="flex-row items-center mb-4">
            <AntDesign name="star" size={16} color="#FCC419" />
            <Text className="ml-1 text-base font-semibold text-slate-900">
              {service.rating.toFixed(1)}
            </Text>
            {service.review_count > 0 && (
              <Text className="ml-1 text-sm text-slate-500">
                ({service.review_count} reviews)
              </Text>
            )}
          </View>

          {/* Price */}
          <View className="bg-slate-100 p-4 rounded-2xl mb-4">
            {service.price !== null ? (
              <Text className="text-3xl font-black text-slate-900">
                ₱{service.price.toLocaleString()}
              </Text>
            ) : (
              <Text className="text-xl font-semibold text-slate-600">
                Contact for price
              </Text>
            )}
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-2">
              Description
            </Text>
            <Text className="text-base text-slate-700 leading-6">
              {service.description}
            </Text>
          </View>

          {/* Location */}
          <View className="flex-row items-center mb-4">
            <Ionicons name="location-outline" size={20} color="#64748b" />
            <Text className="ml-2 text-base text-slate-700">
              {service.location}
            </Text>
          </View>

          {/* Tags */}
          {service.tags && service.tags.length > 0 && (
            <View className="mb-4">
              <Text className="text-lg font-bold text-slate-900 mb-2">
                Tags
              </Text>
              <View className="flex-row flex-wrap">
                {service.tags.map((tag, index) => (
                  <View
                    key={index}
                    className="bg-slate-200 px-3 py-1 rounded-full mr-2 mb-2"
                  >
                    <Text className="text-slate-700 text-sm">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Seller Info */}
          <View className="bg-white p-4 rounded-2xl border border-slate-200 mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-2">
              Service Provider
            </Text>
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center">
                <Text className="text-white text-lg font-bold">
                  {authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  {authorName}
                </Text>
                {service.profile?.physis_verified && (
                  <View className="flex-row items-center mt-1">
                    <MaterialIcons name="verified" size={16} color="#10b981" />
                    <Text className="ml-1 text-sm text-emerald-600">
                      Verified
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!isOwnService && (
        <View className="bg-white border-t border-slate-200 p-4">
          <View className="flex-row space-x-3">
            {/* Call Button */}
            {service.phone_number && (
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 bg-slate-100 py-4 rounded-2xl flex-row items-center justify-center"
              >
                <Ionicons name="call-outline" size={20} color="#212529" />
                <Text className="ml-2 text-base font-semibold text-slate-900">
                  Call
                </Text>
              </TouchableOpacity>
            )}

            {/* Message Button */}
            <TouchableOpacity
              onPress={handleStartChat}
              disabled={startingChat}
              className="flex-1 bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center"
            >
              {startingChat ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  <Text className="ml-2 text-base font-semibold text-white">
                    Message
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
