import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface TabConfig<T extends string> {
  key: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: TabConfig<T>[];
  activeTab: T;
  onTabPress: (tab: T) => void;
}

/**
 * Generic horizontal tab bar with blue active underline.
 *
 * Replaces the identical flex-row tab rendering inside:
 *  - service_detail.tsx (overview / reviews / comments)
 *  - Profile_page.tsx (posts / subscriptions / reviews)
 */
export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabPress,
}: TabBarProps<T>) {
  return (
    <View className="bg-white border-b border-slate-200">
      <View className="flex-row">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              className={`flex-1 py-4 items-center border-b-2 ${
                isActive ? "border-blue-500" : "border-transparent"
              }`}
            >
              <Text
                className={`font-semibold ${
                  isActive ? "text-blue-500" : "text-slate-600"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
