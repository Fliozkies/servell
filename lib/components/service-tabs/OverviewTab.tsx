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

        {/* ── Provider card ── */}
        <View className="bg-white border border-slate-100 rounded-2xl p-4">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Service Provider
          </Text>
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-[#1877F2] items-center justify-center">
              <Text className="text-white text-base font-bold">
                {authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-slate-900">
                {authorName}
              </Text>
              {service.profile?.physis_verified ? (
                <View className="flex-row items-center mt-0.5">
                  <MaterialIcons name="verified" size={13} color="#10b981" />
                  <Text className="ml-1 text-xs text-emerald-600 font-medium">
                    PhilSys Verified
                  </Text>
                </View>
              ) : (
                <Text className="text-xs text-slate-400 mt-0.5">
                  Not yet verified
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
