// lib/components/service-tabs/OverviewTab.tsx
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ServiceWithDetails } from "../../types/database.types";

type OverviewTabProps = {
  service: ServiceWithDetails;
};

export default function OverviewTab({ service }: OverviewTabProps) {
  const authorName = service.profile?.first_name
    ? `${service.profile.first_name} ${service.profile.last_name || ""}`.trim()
    : "Unknown";
  const categoryName = service.category?.name || "Uncategorized";

  return (
    <ScrollView className="flex-1 bg-slate-50">
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
            <Text className="text-lg font-bold text-slate-900 mb-2">Tags</Text>
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
  );
}
