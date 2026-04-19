import { AntDesign } from "@expo/vector-icons";
import { Bell } from "lucide-react-native";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type ServicesHeaderProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  onNotificationPress: () => void;
  activeFilterCount?: number;
  hasActiveFilters?: boolean;
  unreadNotifications?: number;
};

export default function ServicesHeader({
  searchQuery,
  onSearchChange,
  onFilterPress,
  onNotificationPress,
  hasActiveFilters = false,
  unreadNotifications = 0,
}: ServicesHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange("");
  };

  const badgeCount =
    unreadNotifications > 99
      ? "99+"
      : unreadNotifications > 0
        ? String(unreadNotifications)
        : null;
  const isWideBadge = badgeCount !== null && badgeCount.length > 1;

  return (
    <View className="bg-white px-5 py-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-slate-900 text-3xl">Servell</Text>

        {/* Search + Filter row */}
        <View
          className={`flex-1 ml-4 flex-row items-center rounded-2xl px-3 ${
            isFocused ? "bg-blue-50" : "bg-slate-100"
          }`}
        >
          <AntDesign
            name="search"
            size={16}
            color={isFocused ? "#3b82f6" : "#94a3b8"}
          />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-2 py-2.5 text-sm text-slate-900"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} className="mr-1">
              <AntDesign name="close-circle" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* Filter icon */}
          <View className="pl-2 ml-1 border-l border-gray-200">
            <TouchableOpacity
              onPress={onFilterPress}
              className="p-1.5"
              activeOpacity={0.6}
            >
              <AntDesign
                name="filter"
                size={18}
                color={hasActiveFilters ? "#3b82f6" : "#94a3b8"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bell icon — notification button */}
        <TouchableOpacity
          onPress={onNotificationPress}
          activeOpacity={0.7}
          style={{ marginLeft: 10, position: "relative" }}
        >
          <Bell
            size={24}
            color={unreadNotifications > 0 ? "#1877F2" : "#94a3b8"}
            strokeWidth={unreadNotifications > 0 ? 2.5 : 2}
          />
          {badgeCount && (
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -6,
                backgroundColor: "#ef4444",
                borderRadius: 8,
                minWidth: isWideBadge ? 22 : 16,
                height: 16,
                paddingHorizontal: isWideBadge ? 3 : 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: "700",
                  lineHeight: 12,
                }}
              >
                {badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
