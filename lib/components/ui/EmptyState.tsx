import React from "react";
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  subtitle?: string;
}

/**
 * Generic empty / zero-state UI block.
 *
 * Replaces the repeated pattern of:
 *   <View className="py-16 items-center px-6">
 *     <View className="w-16 h-16 rounded-full bg-slate-100 ...">
 *       {icon}
 *     </View>
 *     <Text ...>{title}</Text>
 *     <Text ...>{subtitle}</Text>
 *   </View>
 *
 * Used across: ServicesContent, ConversationsScreen, ProfilePage tabs,
 * NotificationScreen, ReviewsTab, CommentsTab.
 */
export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="py-16 items-center px-6">
      <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
        {icon}
      </View>
      <Text className="text-base font-bold text-slate-700 text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm text-slate-400 text-center mt-1">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
