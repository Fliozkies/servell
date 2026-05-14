// lib/components/service-tabs/OverviewTab.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BadgeCheck } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOrCreateConversation } from "../../api/messaging.api";
import { ServiceWithDetails } from "../../types/database.types";
import { ProfileAvatar } from "../ui/ProfileAvatar";

type OverviewTabProps = {
  service: ServiceWithDetails;
  isOwnService: boolean;
  currentUserId: string | null;
};

export default function OverviewTab({
  service,
  isOwnService,
  currentUserId,
}: OverviewTabProps) {
  const [startingChat, setStartingChat] = useState(false);

  const authorName = service.profile?.first_name
    ? `${service.profile.first_name} ${service.profile.last_name || ""}`.trim()
    : "Unknown";
  const categoryName = service.category?.name;

  const handleStartChat = async () => {
    if (!currentUserId) {
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
      router.push(`/chat/${conversation.id}`);
    } catch {
      Alert.alert("Error", "Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4 pb-10">
        {/* ── Meta row: category + rating ── */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-600 text-xs font-semibold">
              {categoryName}
            </Text>
          </View>
          <View className="flex-row items-center">
            <AntDesign name="star" size={14} color="#FCC419" />
            <Text className="ml-1 text-sm font-bold text-slate-900">
              {service.rating.toFixed(1)}
            </Text>
            {service.review_count > 0 && (
              <Text className="ml-1 text-xs text-slate-400">
                ({service.review_count}{" "}
                {service.review_count === 1 ? "review" : "reviews"})
              </Text>
            )}
          </View>
        </View>

        {/* ── Price card ── */}
        <View className="bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Price
          </Text>
          {service.price !== null ? (
            <Text className="text-2xl font-black text-slate-900">
              ₱{service.price.toLocaleString()}
            </Text>
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#1877F2"
              />
              <Text className="ml-1.5 text-base font-semibold text-[#1877F2]">
                Contact for price
              </Text>
            </View>
          )}
        </View>

        {/* ── Description ── */}
        <View className="bg-white border border-slate-100 rounded-2xl px-4 pt-3 pb-4 mb-4">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Description
          </Text>
          <Text className="text-sm text-slate-700 leading-6">
            {service.description}
          </Text>
        </View>

        {/* ── Location ── */}
        {service.location ? (
          <View className="bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#1877F2" />
            <Text className="ml-2 text-sm text-slate-700 flex-1">
              {service.location}
            </Text>
          </View>
        ) : null}

        {/* ── Tags ── */}
        {service.tags && service.tags.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
              Tags
            </Text>
            <View className="flex-row flex-wrap">
              {service.tags.map((tag, index) => (
                <View
                  key={index}
                  className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full mr-2 mb-2"
                >
                  <Text className="text-slate-600 text-xs font-medium">
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Service Provider Card ── */}
        <View className="bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-4">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Service Provider
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (!isOwnService) router.push(`/profile/${service.user_id}`);
            }}
            activeOpacity={isOwnService ? 1 : 0.7}
            className="flex-row items-center"
          >
            <ProfileAvatar profile={service.profile} size={48} />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-base font-bold text-slate-900 mr-1">
                  {authorName}
                </Text>
                {service.profile?.physis_verified && (
                  <BadgeCheck size={16} color="#1877F2" fill="#dbeafe" />
                )}
              </View>
              {service.profile?.physis_verified && (
                <Text className="text-xs text-slate-500 mt-0.5">
                  Verified Provider
                </Text>
              )}
              {!isOwnService && (
                <Text className="text-xs text-[#1877F2] mt-0.5">
                  View profile →
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Message Button (only for non-owners) ── */}
        {!isOwnService && (
          <TouchableOpacity
            onPress={handleStartChat}
            disabled={startingChat}
            className="bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center mb-6"
            activeOpacity={0.8}
          >
            {startingChat ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Message Seller
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
