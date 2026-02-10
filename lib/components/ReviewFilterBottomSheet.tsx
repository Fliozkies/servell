// lib/components/ReviewFilterBottomSheet.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ReviewFilterOptions } from "../types/database.types";

type ReviewFilterBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ReviewFilterOptions) => void;
  currentFilters: ReviewFilterOptions;
};

const RATING_OPTIONS = [
  { value: null, label: "All" },
  { value: 5, label: "5★" },
  { value: 4, label: "4★" },
  { value: 3, label: "3★" },
  { value: 2, label: "2★" },
  { value: 1, label: "1★" },
];

const REPLY_OPTIONS = [
  { value: null, label: "All Reviews" },
  { value: true, label: "With Provider Reply" },
  { value: false, label: "No Reply Yet" },
];

type SortOption = {
  value: ReviewFilterOptions["sortBy"];
  label: string;
  disabled?: boolean;
};

export default function ReviewFilterBottomSheet({
  visible,
  onClose,
  onApply,
  currentFilters,
}: ReviewFilterBottomSheetProps) {
  const [filters, setFilters] = useState<ReviewFilterOptions>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApply(filters);
  };

  const handleClearAll = () => {
    const clearedFilters: ReviewFilterOptions = {
      rating: null,
      hasReply: null,
      sortBy: "newest",
    };
    setFilters(clearedFilters);
  };

  const updateFilter = <K extends keyof ReviewFilterOptions>(
    key: K,
    value: ReviewFilterOptions[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Determine which sort options should be disabled
  const getSortOptions = (): SortOption[] => {
    const hasRatingFilter = filters.rating !== null;

    return [
      { value: "newest", label: "Most Recent" },
      { value: "oldest", label: "Oldest First" },
      { value: "most_helpful", label: "Most Helpful (Hearts)" },
      { value: "most_critical", label: "Most Critical (Hearts)" },
      {
        value: "highest_rating",
        label: "Highest Rating",
        disabled: hasRatingFilter,
      },
      {
        value: "lowest_rating",
        label: "Lowest Rating",
        disabled: hasRatingFilter,
      },
    ];
  };

  const sortOptions = getSortOptions();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "85%" }}>
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-slate-900">
              Filter & Sort Reviews
            </Text>
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            {/* Filter by Rating */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Filter by Rating
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {RATING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => updateFilter("rating", option.value)}
                    className={`mr-2 px-4 py-2 rounded-full border ${
                      filters.rating === option.value
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filters.rating === option.value
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filter by Reply Status */}
            <View className="p-4 border-b border-gray-100">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Review Type
              </Text>
              <View className="flex-row flex-wrap">
                {REPLY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => updateFilter("hasReply", option.value)}
                    className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                      filters.hasReply === option.value
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filters.hasReply === option.value
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

            {/* Sort By */}
            <View className="p-4 pb-6">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Sort By
              </Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() =>
                    !option.disabled && updateFilter("sortBy", option.value)
                  }
                  disabled={option.disabled}
                  className={`flex-row items-center justify-between py-3 border-b border-gray-100 ${
                    option.disabled ? "opacity-40" : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <Text
                      className={`text-sm ${
                        option.disabled ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {option.disabled && (
                      <Text className="ml-2 text-xs text-slate-400">
                        (Not available with rating filter)
                      </Text>
                    )}
                  </View>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
