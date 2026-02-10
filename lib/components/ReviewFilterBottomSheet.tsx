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
  { value: 5, label: "5 ★" },
  { value: 4, label: "4 ★" },
  { value: 3, label: "3 ★" },
  { value: 2, label: "2 ★" },
  { value: 1, label: "1 ★" },
];

const REPLY_OPTIONS = [
  { value: null, label: "All Reviews" },
  { value: true, label: "With Reply" },
  { value: false, label: "No Reply" },
];

type SortOption = {
  value: ReviewFilterOptions["sortBy"];
  label: string;
  disabled?: boolean;
};

type AccordionKey = "rating" | "reply" | "sort";

export default function ReviewFilterBottomSheet({
  visible,
  onClose,
  onApply,
  currentFilters,
}: ReviewFilterBottomSheetProps) {
  const [filters, setFilters] = useState<ReviewFilterOptions>(currentFilters);
  const [expandedSection, setExpandedSection] = useState<AccordionKey | null>(
    "rating",
  );

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
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

  const toggleSection = (key: AccordionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

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

  const getActiveCount = () => {
    let count = 0;
    if (filters.rating !== null) count++;
    if (filters.hasReply !== null) count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  };

  const getSectionSummary = (key: AccordionKey): string | null => {
    switch (key) {
      case "rating":
        return filters.rating !== null ? `${filters.rating}★ only` : null;
      case "reply":
        if (filters.hasReply === null) return null;
        return filters.hasReply ? "With Reply" : "No Reply";
      case "sort":
        if (filters.sortBy === "newest") return null;
        return (
          getSortOptions().find((s) => s.value === filters.sortBy)?.label ??
          null
        );
      default:
        return null;
    }
  };

  const renderSectionHeader = (
    key: AccordionKey,
    label: string,
    icon: string,
  ) => {
    const isOpen = expandedSection === key;
    const summary = getSectionSummary(key);
    return (
      <TouchableOpacity
        onPress={() => toggleSection(key)}
        activeOpacity={0.7}
        style={[styles.sectionHeader, isOpen && styles.sectionHeaderActive]}
      >
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[styles.sectionIcon, isOpen && styles.sectionIconActive]}
          >
            <AntDesign
              name={icon as any}
              size={14}
              color={isOpen ? "#fff" : "#64748b"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.sectionLabel, isOpen && styles.sectionLabelActive]}
            >
              {label}
            </Text>
            {summary && !isOpen && (
              <Text style={styles.sectionSummary} numberOfLines={1}>
                {summary}
              </Text>
            )}
          </View>
        </View>
        <AntDesign
          name={isOpen ? "up" : "down"}
          size={12}
          color={isOpen ? "#3b82f6" : "#94a3b8"}
        />
      </TouchableOpacity>
    );
  };

  const sortOptions = getSortOptions();
  const activeCount = getActiveCount();

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
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Filter & Sort</Text>
              {activeCount > 0 && (
                <Text style={styles.headerSubtitle}>
                  {activeCount} filter{activeCount > 1 ? "s" : ""} active
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AntDesign name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Accordion Sections */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 8,
              paddingTop: 8,
            }}
          >
            {/* Filter by Rating */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("rating", "Filter by Rating", "star")}
              {expandedSection === "rating" && (
                <View style={styles.sectionBody}>
                  <View style={styles.chipRow}>
                    {RATING_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        onPress={() => updateFilter("rating", option.value)}
                        style={[
                          styles.chip,
                          filters.rating === option.value && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.rating === option.value &&
                              styles.chipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Review Type */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("reply", "Review Type", "message")}
              {expandedSection === "reply" && (
                <View style={styles.sectionBody}>
                  <View style={styles.chipRow}>
                    {REPLY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        onPress={() => updateFilter("hasReply", option.value)}
                        style={[
                          styles.chip,
                          filters.hasReply === option.value &&
                            styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.hasReply === option.value &&
                              styles.chipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Sort By */}
            <View style={[styles.accordionItem, { marginBottom: 0 }]}>
              {renderSectionHeader("sort", "Sort By", "swap")}
              {expandedSection === "sort" && (
                <View style={styles.sectionBody}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() =>
                        !option.disabled && updateFilter("sortBy", option.value)
                      }
                      disabled={option.disabled}
                      style={[
                        styles.sortRow,
                        option.disabled && styles.sortRowDisabled,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sortLabel,
                            filters.sortBy === option.value &&
                              styles.sortLabelActive,
                            option.disabled && styles.sortLabelDisabled,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.disabled && (
                          <Text style={styles.sortDisabledNote}>
                            Not available with rating filter
                          </Text>
                        )}
                      </View>
                      {filters.sortBy === option.value && !option.disabled && (
                        <View style={styles.sortCheck}>
                          <AntDesign name="check" size={12} color="#3b82f6" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply</Text>
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
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionItem: {
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#f8fafc",
  },
  sectionHeaderActive: {
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconActive: {
    backgroundColor: "#3b82f6",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  sectionLabelActive: {
    color: "#1d4ed8",
  },
  sectionSummary: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 1,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5.5,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  chipTextActive: {
    color: "#fff",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sortRowDisabled: {
    opacity: 0.4,
  },
  sortLabel: {
    fontSize: 14,
    color: "#475569",
  },
  sortLabelActive: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  sortLabelDisabled: {
    color: "#94a3b8",
  },
  sortDisabledNote: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  sortCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
