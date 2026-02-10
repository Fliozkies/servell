// app/juarez_app/pages/service_detail.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOrCreateConversation } from "../../../lib/api/messaging.api";
import { supabase } from "../../../lib/api/supabase";
import CommentsTab from "../../../lib/components/service-tabs/CommentsTab";
import OverviewTab from "../../../lib/components/service-tabs/OverviewTab";
import ReviewsTab from "../../../lib/components/service-tabs/ReviewsTab";
import { ServiceWithDetails } from "../../../lib/types/database.types";

type TabType = "overview" | "reviews" | "comments";

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<ServiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // MODIFIED: Made loadService accessible and added a silent refresh option
  const loadService = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

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
        if (!silent) {
          Alert.alert("Error", "Failed to load service details");
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

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

  // NEW: Refresh service data when switching to overview tab
  useEffect(() => {
    if (activeTab === "overview" && service) {
      // Silently refresh the service data to get updated ratings
      loadService(true);
    }
  }, [activeTab, loadService, service]);

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

  // NEW: Callback to refresh service from child components
  const handleServiceUpdate = useCallback(() => {
    loadService(true);
  }, [loadService]);

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

      {/* Service Image */}
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

      {/* Tabs */}
      <View className="bg-white border-b border-slate-200">
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setActiveTab("overview")}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === "overview"
                ? "border-blue-500"
                : "border-transparent"
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "overview" ? "text-blue-500" : "text-slate-600"
              }`}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("reviews")}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === "reviews" ? "border-blue-500" : "border-transparent"
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "reviews" ? "text-blue-500" : "text-slate-600"
              }`}
            >
              Reviews
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("comments")}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === "comments"
                ? "border-blue-500"
                : "border-transparent"
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "comments" ? "text-blue-500" : "text-slate-600"
              }`}
            >
              Comments
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content - MODIFIED: Pass onServiceUpdate to ReviewsTab */}
      <View className="flex-1">
        {activeTab === "overview" && <OverviewTab service={service} />}
        {activeTab === "reviews" && (
          <ReviewsTab
            service={service}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            onServiceUpdate={handleServiceUpdate} // NEW: Pass callback
          />
        )}
        {activeTab === "comments" && (
          <CommentsTab
            service={service}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
          />
        )}
      </View>

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
