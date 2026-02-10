import AntDesign from "@expo/vector-icons/AntDesign";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
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

type AccordionKey = "category" | "price" | "rating" | "location" | "sort";

export default function FilterBottomSheet({
  visible,
  onClose,
  onApply,
  currentFilters,
}: FilterBottomSheetProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [expandedSection, setExpandedSection] = useState<AccordionKey | null>(
    "category",
  );
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, slideAnim]);

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
      priceRange: { ...prev.priceRange, [type]: numValue },
    }));
  };

  const toggleSection = (key: AccordionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const getActiveCount = () => {
    let count = 0;
    if (filters.categoryId !== null) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null)
      count++;
    if (filters.minRating !== null) count++;
    if (filters.location && filters.location.trim() !== "") count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  };

  const getSectionSummary = (key: AccordionKey): string | null => {
    switch (key) {
      case "category":
        if (filters.categoryId === null) return null;
        const cat = categories.find((c) => c.id === filters.categoryId);
        return cat?.name ?? null;
      case "price":
        const min = filters.priceRange.min;
        const max = filters.priceRange.max;
        if (min === null && max === null) return null;
        if (min !== null && max !== null) return `₱${min} – ₱${max}`;
        if (min !== null) return `From ₱${min}`;
        return `Up to ₱${max}`;
      case "rating":
        return filters.minRating !== null ? `${filters.minRating}★ & up` : null;
      case "location":
        return filters.location && filters.location.trim() !== ""
          ? filters.location
          : null;
      case "sort":
        return filters.sortBy !== "newest"
          ? (SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label ??
              null)
          : null;
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
              <Text style={styles.headerTitle}>Filters</Text>
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
            {/* Category */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("category", "Category", "appstore")}
              {expandedSection === "category" && (
                <View style={styles.sectionBody}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      onPress={() => updateFilter("categoryId", null)}
                      style={[
                        styles.chip,
                        filters.categoryId === null && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filters.categoryId === null && styles.chipTextActive,
                        ]}
                      >
                        All
                      </Text>
                    </TouchableOpacity>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => updateFilter("categoryId", category.id)}
                        style={[
                          styles.chip,
                          filters.categoryId === category.id &&
                            styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.categoryId === category.id &&
                              styles.chipTextActive,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Price Range */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("price", "Price Range (₱)", "tags")}
              {expandedSection === "price" && (
                <View style={styles.sectionBody}>
                  <View style={styles.priceRow}>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Min</Text>
                      <TextInput
                        value={filters.priceRange.min?.toString() || ""}
                        onChangeText={(v) => updatePriceRange("min", v)}
                        placeholder="0"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <Text style={styles.priceSep}>—</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Max</Text>
                      <TextInput
                        value={filters.priceRange.max?.toString() || ""}
                        onChangeText={(v) => updatePriceRange("max", v)}
                        placeholder="Any"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Minimum Rating */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("rating", "Minimum Rating", "star")}
              {expandedSection === "rating" && (
                <View style={styles.sectionBody}>
                  <View style={styles.ratingRow}>
                    {RATING_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        onPress={() => updateFilter("minRating", option.value)}
                        style={[
                          styles.ratingChip,
                          filters.minRating === option.value &&
                            styles.ratingChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.minRating === option.value &&
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

            {/* Location */}
            <View style={styles.accordionItem}>
              {renderSectionHeader("location", "Location", "environment")}
              {expandedSection === "location" && (
                <View style={styles.sectionBody}>
                  <TextInput
                    value={filters.location}
                    onChangeText={(v) => updateFilter("location", v)}
                    placeholder="Enter location..."
                    style={styles.input}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              )}
            </View>

            {/* Sort By */}
            <View style={[styles.accordionItem, { marginBottom: 0 }]}>
              {renderSectionHeader("sort", "Sort By", "swap")}
              {expandedSection === "sort" && (
                <View style={styles.sectionBody}>
                  {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFilter("sortBy", option.value)}
                      style={styles.sortRow}
                    >
                      <Text
                        style={[
                          styles.sortLabel,
                          filters.sortBy === option.value &&
                            styles.sortLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {filters.sortBy === option.value && (
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
              <Text style={styles.applyBtnText}>Apply Filters</Text>
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
  chip: {
    marginRight: 8,
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
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4,
    fontWeight: "500",
  },
  priceSep: {
    fontSize: 18,
    color: "#cbd5e1",
    marginTop: 14,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0f172a",
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ratingChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  ratingChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sortLabel: {
    fontSize: 14,
    color: "#475569",
  },
  sortLabelActive: {
    color: "#1d4ed8",
    fontWeight: "600",
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
