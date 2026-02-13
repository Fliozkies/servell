// lib/components/ui/ServiceDetailSkeleton.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../constants/theme";

export default function ServiceDetailSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({ width, height, style }: any) => (
    <Animated.View
      style={[
        { width, height, backgroundColor: "#e2e8f0", borderRadius: 8, opacity },
        style,
      ]}
    />
  );

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

      {/* Image Skeleton */}
      <View className="w-full h-64 bg-slate-200" />

      {/* Tab Bar Skeleton */}
      <View className="flex-row bg-white border-b border-slate-200 px-4 py-3">
        <SkeletonBox width={80} height={36} style={{ marginRight: 12 }} />
        <SkeletonBox width={80} height={36} style={{ marginRight: 12 }} />
        <SkeletonBox width={80} height={36} />
      </View>

      {/* Content Skeleton */}
      <View className="flex-1 p-4">
        <SkeletonBox width="100%" height={24} style={{ marginBottom: 12 }} />
        <SkeletonBox width="80%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="90%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={20} style={{ marginBottom: 20 }} />

        <SkeletonBox width="100%" height={100} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={100} />
      </View>

      {/* Action Buttons Skeleton */}
      <View className="bg-white border-t border-slate-200 p-4">
        <View className="flex-row space-x-3">
          <SkeletonBox width="45%" height={52} />
          <SkeletonBox width="45%" height={52} />
        </View>
      </View>
    </View>
  );
}
