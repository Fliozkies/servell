// app/service/[id].tsx  ←  Proper Expo Router dynamic route
// Previously: app/juarez_app/pages/service_detail.tsx
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
import { getOrCreateConversation } from "../../lib/api/messaging.api";
import { supabase } from "../../lib/api/supabase";
import CommentsTab from "../../lib/components/service-tabs/CommentsTab";
import OverviewTab from "../../lib/components/service-tabs/OverviewTab";
import ReviewsTab from "../../lib/components/service-tabs/ReviewsTab";
import ServiceDetailSkeleton from "../../lib/components/ui/ServiceDetailSkeleton";
import { TabBar } from "../../lib/components/ui/TabBar";
import { COLORS } from "../../lib/constants/theme";
import { useCurrentUserId } from "../../lib/hooks/useCurrentUserId";
import { ServiceWithDetails } from "../../lib/types/database.types";

type ServiceTab = "overview" | "reviews" | "comments";

const SERVICE_TABS = [
  { key: "overview" as const, label: "Overview" },
  { key: "reviews" as const, label: "Reviews" },
  { key: "comments" as const, label: "Comments" },
];

export default function ServiceDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    tab?: string;
    reviewId?: string;
    commentId?: string;
    expandReplies?: string;
  }>();

  const { id, tab, reviewId, commentId, expandReplies } = params;
  const currentUserId = useCurrentUserId();
  const [service, setService] = useState<ServiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [activeTab, setActiveTab] = useState<ServiceTab>(
    (tab as ServiceTab) || "overview",
  );

  const loadService = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const { data, error } = await supabase
          .from("services")
          .select("*, category:categories(*), profile:profiles(*)")
          .eq("id", id)
          .single();
        if (error) throw error;
        setService(data);
      } catch {
        if (!silent) Alert.alert("Error", "Failed to load service details");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadService();
  }, [loadService]);

  // Set active tab from URL parameter
  useEffect(() => {
    if (
      tab &&
      (tab === "overview" || tab === "reviews" || tab === "comments")
    ) {
      setActiveTab(tab as ServiceTab);
    }
  }, [tab]);

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
      router.push(`/chat/${conversation.id}`);
    } catch {
      Alert.alert("Error", "Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  const handleServiceUpdate = useCallback(
    () => loadService(true),
    [loadService],
  );

  // Show skeleton while loading
  if (loading) {
    return <ServiceDetailSkeleton />;
  }

  if (!service) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="exclamation-circle" size={48} color={COLORS.danger} />
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
      <View className="flex-row justify-between bg-white border-b border-slate-200 px-4 pt-12 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.slate900} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 pr-8">
          Service Details
        </Text>
        <View />
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
          <AntDesign name="picture" size={64} color={COLORS.slate400} />
        </View>
      )}

      {/* Tab Bar — shared component */}
      <TabBar
        tabs={SERVICE_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />

      {/* Tab Content — all mounted; inactive ones hidden */}
      <View className="flex-1">
        <View
          style={{
            flex: 1,
            display: activeTab === "overview" ? "flex" : "none",
          }}
        >
          <OverviewTab service={service} />
        </View>
        <View
          style={{
            flex: 1,
            display: activeTab === "reviews" ? "flex" : "none",
          }}
        >
          <ReviewsTab
            service={service}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            onServiceUpdate={handleServiceUpdate}
            highlightReviewId={reviewId}
          />
        </View>
        <View
          style={{
            flex: 1,
            display: activeTab === "comments" ? "flex" : "none",
          }}
        >
          <CommentsTab
            service={service}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            highlightCommentId={commentId}
            expandReplies={expandReplies === "true"}
          />
        </View>
      </View>

      {/* Action Buttons */}
      {!isOwnService && (
        <View className="bg-white border-t border-slate-200 p-4">
          <View className="flex-row space-x-3">
            {service.phone_number && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${service.phone_number}`)}
                className="flex-1 bg-slate-100 py-4 rounded-2xl flex-row items-center justify-center"
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.slate900}
                />
                <Text className="ml-2 text-base font-semibold text-slate-900">
                  Call
                </Text>
              </TouchableOpacity>
            )}
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
