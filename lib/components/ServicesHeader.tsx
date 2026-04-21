// lib/components/ServicesHeader.tsx
import { AntDesign } from "@expo/vector-icons";
import { Bell } from "lucide-react-native";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/theme";

export type CategoryPill = {
  id: string | null; // null = "All"
  name: string;
};

type ServicesHeaderProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  onNotificationPress: () => void;
  hasActiveFilters?: boolean;
  unreadNotifications?: number;
  /** Live category pills — id=null means "All" */
  categories?: CategoryPill[];
  activeCategoryId?: string | null;
  onCategoryPress?: (id: string | null) => void;
};

export default function ServicesHeader({
  searchQuery,
  onSearchChange,
  onFilterPress,
  onNotificationPress,
  hasActiveFilters = false,
  unreadNotifications = 0,
  categories = [],
  activeCategoryId = null,
  onCategoryPress,
}: ServicesHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const badgeCount =
    unreadNotifications > 99
      ? "99+"
      : unreadNotifications > 0
        ? String(unreadNotifications)
        : null;
  const isWideBadge = badgeCount !== null && badgeCount.length > 1;

  // Always prepend the "All" pill
  const pills: CategoryPill[] = [{ id: null, name: "All" }, ...categories];

  return (
    <View className="bg-white">
      {/* ── Row 1: Title + Search + Bell ── */}
      <View className="flex-row items-center px-4 pt-3 pb-2 gap-3">
        <Text
          className="text-[26px] font-bold text-slate-900"
          style={{ letterSpacing: -0.5 }}
        >
          Servell
        </Text>

        {/* Search + filter pill */}
        <View
          className="flex-1 flex-row items-center rounded-xl px-3 gap-2"
          style={{
            backgroundColor: isFocused ? "#eff6ff" : COLORS.slate100,
            borderWidth: 1,
            borderColor: isFocused ? "#bfdbfe" : "transparent",
          }}
        >
          <AntDesign
            name="search"
            size={13}
            color={isFocused ? COLORS.primary : COLORS.slate400}
          />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search services..."
            placeholderTextColor={COLORS.slate400}
            className="flex-1 py-2.5 text-[13px] text-slate-900"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <AntDesign
                name="close-circle"
                size={13}
                color={COLORS.slate400}
              />
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View
            style={{
              width: 1,
              height: 16,
              backgroundColor: COLORS.slate200,
              marginHorizontal: 2,
            }}
          />

          {/* Filter button */}
          <TouchableOpacity onPress={onFilterPress} activeOpacity={0.6}>
            <View
              className="w-[26px] h-[26px] rounded-lg items-center justify-center"
              style={{
                backgroundColor: hasActiveFilters
                  ? COLORS.primary
                  : "transparent",
              }}
            >
              <AntDesign
                name="filter"
                size={15}
                color={hasActiveFilters ? "#fff" : COLORS.slate400}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bell icon */}
        <TouchableOpacity
          onPress={onNotificationPress}
          activeOpacity={0.7}
          style={{ position: "relative" }}
        >
          <Bell
            size={22}
            color={unreadNotifications > 0 ? COLORS.primary : COLORS.slate400}
            strokeWidth={unreadNotifications > 0 ? 2.5 : 2}
          />
          {badgeCount && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -5,
                backgroundColor: COLORS.danger,
                borderRadius: 8,
                minWidth: isWideBadge ? 20 : 15,
                height: 15,
                paddingHorizontal: isWideBadge ? 3 : 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: "700",
                  lineHeight: 11,
                }}
              >
                {badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Row 2: Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingBottom: 10,
          gap: 7,
        }}
      >
        {pills.map((pill) => {
          const isActive = pill.id === activeCategoryId;
          return (
            <TouchableOpacity
              key={pill.id ?? "__all__"}
              onPress={() => onCategoryPress?.(pill.id)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: isActive ? COLORS.primary : COLORS.slate100,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isActive ? "#fff" : COLORS.slate500,
                }}
              >
                {pill.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
