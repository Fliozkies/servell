import { AntDesign } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchCategories } from "../api/services.api";
import { Category } from "../types/database.types";
import {
  FilterOptions,
  RATING_OPTIONS,
  SORT_OPTIONS,
} from "../types/filter.types";

type FilterBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
};

export default function FilterBottomSheet({
  visible,
  onClose,
  onApply,
  currentFilters,
}: FilterBottomSheetProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Update local filters when props change
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClearAll = () => {
    const clearedFilters: FilterOptions = {
      categoryId: null,
      priceRange: { min: null, max: null },
      minRating: null,
      location: "",
      sortBy: "newest",
    };
    setFilters(clearedFilters);
  };

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updatePriceRange = (type: "min" | "max", value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setFilters((prev) => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: numValue,
      },
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Use StyleSheet with rgba for proper Android opacity support */}
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "85%" }}>
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-slate-900">Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            {/* Category Filter */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <TouchableOpacity
                  onPress={() => updateFilter("categoryId", null)}
                  className={`mr-2 px-4 py-2 rounded-full border ${
                    filters.categoryId === null
                      ? "bg-blue-500 border-blue-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      filters.categoryId === null
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => updateFilter("categoryId", category.id)}
                    className={`mr-2 px-4 py-2 rounded-full border ${
                      filters.categoryId === category.id
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filters.categoryId === category.id
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Price Range Filter */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Price Range (₱)
              </Text>
              <View className="flex-row items-center">
                <View className="flex-1 mr-2">
                  <Text className="text-xs text-slate-600 mb-1">Min</Text>
                  <TextInput
                    value={filters.priceRange.min?.toString() || ""}
                    onChangeText={(value) => updatePriceRange("min", value)}
                    placeholder="0"
                    keyboardType="numeric"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </View>
                <Text className="text-slate-400 mt-5">-</Text>
                <View className="flex-1 ml-2">
                  <Text className="text-xs text-slate-600 mb-1">Max</Text>
                  <TextInput
                    value={filters.priceRange.max?.toString() || ""}
                    onChangeText={(value) => updatePriceRange("max", value)}
                    placeholder="Any"
                    keyboardType="numeric"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </View>
              </View>
            </View>

            {/* Rating Filter */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Minimum Rating
              </Text>
              <View className="flex-row flex-wrap">
                {RATING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => updateFilter("minRating", option.value)}
                    className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                      filters.minRating === option.value
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filters.minRating === option.value
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Filter */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Location
              </Text>
              <TextInput
                value={filters.location}
                onChangeText={(value) => updateFilter("location", value)}
                placeholder="Enter location..."
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </View>

            {/* Sort By */}
            <View className="p-4 pb-6">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Sort By
              </Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => updateFilter("sortBy", option.value)}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <Text className="text-sm text-slate-700">{option.label}</Text>
                  {filters.sortBy === option.value && (
                    <AntDesign name="check-circle" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="flex-row p-4 border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={handleClearAll}
              className="flex-1 mr-2 py-3 bg-white border border-gray-300 rounded-xl items-center"
            >
              <Text className="text-slate-700 font-semibold">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              className="flex-1 ml-2 py-3 bg-blue-500 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Use StyleSheet for proper Android opacity support
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Use rgba instead of bg-black/50
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
