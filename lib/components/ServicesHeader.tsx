import { AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type ServicesHeaderProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  activeFilterCount?: number;
  hasActiveFilters?: boolean;
};

export default function ServicesHeader({
  searchQuery,
  onSearchChange,
  onFilterPress,
  hasActiveFilters = false,
}: ServicesHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange("");
  };

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

          {/* Filter icon — blue when active, no badge */}
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
      </View>
    </View>
  );
}
