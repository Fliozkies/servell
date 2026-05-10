import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Clock, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";
import { searchAndFilterServices } from "../../lib/api/services.api";
import FilterBottomSheet from "../../lib/components/FilterBottomSheet";
import { COLORS } from "../../lib/constants/theme";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { ServiceWithDetails } from "../../lib/types/database.types";
import { FilterOptions } from "../../lib/types/filter.types";
import { formatPrice } from "../../lib/utils/format";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

const SEARCH_HISTORY_KEY = "@servell_search_history";
const MAX_HISTORY_ITEMS = 20;

// ── Mini card colours ────────────────────────────────────────────────────────
const MINI_CARD_BG: Record<string, string> = {
  Tech: "#dbeafe",
  Design: "#ede9fe",
  Home: "#dcfce7",
  Beauty: "#fce7f3",
  Others: "#fef3c7",
};
const MINI_CARD_STROKE: Record<string, string> = {
  Tech: "#3b82f6",
  Design: "#7c3aed",
  Home: "#16a34a",
  Beauty: "#db2777",
  Others: "#d97706",
};

function formatAuthor(service: ServiceWithDetails): string {
  if (service.profile?.first_name) {
    return `${service.profile.first_name} ${service.profile.last_name ?? ""}`.trim();
  }
  return "Unknown";
}

// ── Grid Card ─────────────────────────────────────────────────────────────────
const GridCard = ({ service }: { service: ServiceWithDetails }) => {
  const catName = service.category?.name ?? "Others";
  const bg = MINI_CARD_BG[catName] ?? "#f1f5f9";
  const stroke = MINI_CARD_STROKE[catName] ?? "#64748b";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/service/${service.id}`)}
      activeOpacity={0.85}
      style={{
        width: COLUMN_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: COLORS.slate200,
        marginBottom: 10,
      }}
    >
      {/* Image */}
      {service.image_url ? (
        <View style={{ height: 110, position: "relative" }}>
          <Image
            source={{ uri: service.image_url }}
            style={{ height: 110, width: "100%" }}
          />
          {/* Rating overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <AntDesign name="star" size={9} color="#FCC419" />
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
              {service.rating.toFixed(1)}
              {service.review_count > 0 ? ` (${service.review_count})` : ""}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            height: 110,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <AntDesign name="picture" size={32} color={stroke} />
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              backgroundColor: "rgba(0,0,0,0.45)",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <AntDesign name="star" size={9} color="#FCC419" />
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
              {service.rating.toFixed(1)}
              {service.review_count > 0 ? ` (${service.review_count})` : ""}
            </Text>
          </View>
        </View>
      )}

      {/* Body */}
      <View style={{ padding: 10 }}>
        <Text
          style={{
            fontSize: 10,
            color: COLORS.primary,
            fontWeight: "600",
            marginBottom: 2,
          }}
        >
          {catName}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: "#0f172a",
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {service.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>
              {formatPrice(service.price)}
            </Text>
            <Text
              style={{ fontSize: 10, color: COLORS.slate400, marginTop: 1 }}
              numberOfLines={1}
            >
              by {formatAuthor(service)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Screen Props ──────────────────────────────────────────────────────────────
type SearchScreenProps = {
  searchQuery: string;
  onSearchQueryChange: (text: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onBack: () => void;
};

// ── Search Screen ─────────────────────────────────────────────────────────────
export default function SearchScreen({
  searchQuery,
  onSearchQueryChange,
  filters,
  onFiltersChange,
  onBack,
}: SearchScreenProps) {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest" ||
    filters.userLocation !== null;

  const isSearching =
    !!debouncedSearch ||
    !!filters.categoryId ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    !!filters.minRating ||
    !!filters.location ||
    filters.sortBy !== "newest";

  // ── Search history helpers ──────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = useCallback(async (history: string[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, []);

  const addToHistory = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...searchHistory.filter(
          (h) => h.toLowerCase() !== trimmed.toLowerCase(),
        ),
      ].slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(updated);
      await saveHistory(updated);
    },
    [searchHistory, saveHistory],
  );

  const removeFromHistory = useCallback(
    async (query: string) => {
      const updated = searchHistory.filter((h) => h !== query);
      setSearchHistory(updated);
      await saveHistory(updated);
    },
    [searchHistory, saveHistory],
  );

  const clearAllHistory = useCallback(async () => {
    setSearchHistory([]);
    await saveHistory([]);
  }, [saveHistory]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Save to history when user submits a search (debounced search changes)
  useEffect(() => {
    if (debouncedSearch.trim()) {
      addToHistory(debouncedSearch.trim());
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus the search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load results
  useEffect(() => {
    if (!isSearching) {
      setServices([]);
      return;
    }

    let cancelled = false;

    async function search() {
      setLoading(true);
      try {
        const data = await searchAndFilterServices({
          searchQuery: debouncedSearch,
          categoryId: filters.categoryId,
          minPrice: filters.priceRange.min,
          maxPrice: filters.priceRange.max,
          minRating: filters.minRating,
          location: filters.location,
          sortBy: filters.sortBy,
          userLocation: filters.userLocation,
        });
        if (!cancelled) setServices(data);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    filters.categoryId,
    filters.priceRange.min,
    filters.priceRange.max,
    filters.minRating,
    filters.location,
    filters.sortBy,
    filters.userLocation,
    isSearching,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleHistoryTap = (query: string) => {
    onSearchQueryChange(query);
  };

  // ── Render search history ──────────────────────────────────────────────────
  const renderSearchHistory = () => {
    if (searchHistory.length === 0) return null;

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Recent searches
          </Text>
          <TouchableOpacity
            onPress={clearAllHistory}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Trash2 size={13} color={COLORS.danger} strokeWidth={2} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: COLORS.danger,
              }}
            >
              Clear all
            </Text>
          </TouchableOpacity>
        </View>

        {/* History items */}
        {searchHistory.map((item, index) => (
          <TouchableOpacity
            key={`${item}-${index}`}
            onPress={() => handleHistoryTap(item)}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 11,
              borderBottomWidth: index < searchHistory.length - 1 ? 0.5 : 0,
              borderBottomColor: COLORS.slate200,
            }}
          >
            <Clock size={16} color={COLORS.slate400} strokeWidth={2} />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 14,
                color: "#334155",
              }}
              numberOfLines={1}
            >
              {item}
            </Text>
            <TouchableOpacity
              onPress={() => removeFromHistory(item)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={COLORS.slate400} strokeWidth={2} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* ── Top bar: Back button + Search bar ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 0,
          paddingBottom: 8,
          backgroundColor: "#fff",
          gap: 8,
        }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: COLORS.slate200,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color={COLORS.slate600} strokeWidth={2} />
        </TouchableOpacity>

        {/* Search bar */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: COLORS.slate200,
            borderRadius: 16,
            paddingHorizontal: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <AntDesign name="search" size={18} color={COLORS.slate400} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search services..."
            placeholderTextColor={COLORS.slate400}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              fontSize: 15,
              color: "#0f172a",
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchQueryChange("")}>
              <AntDesign
                name="close-circle"
                size={16}
                color={COLORS.slate400}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
            style={{ marginLeft: 8 }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: !!hasActiveFilters
                  ? COLORS.primary
                  : COLORS.slate100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AntDesign
                name="filter"
                size={18}
                color={!!hasActiveFilters ? "#fff" : COLORS.slate500}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Results / History ── */}
      <View style={{ flex: 1, backgroundColor: COLORS.slate100 }}>
        {!isSearching ? (
          /* Show search history when not actively searching */
          searchHistory.length > 0 ? (
            <ScrollView
              style={{ flex: 1, backgroundColor: "#fff" }}
              showsVerticalScrollIndicator={false}
            >
              {renderSearchHistory()}
            </ScrollView>
          ) : (
            /* Empty state — prompt user to search */
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
              }}
            >
              <AntDesign name="search" size={56} color={COLORS.slate300} />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  fontWeight: "600",
                  color: COLORS.slate500,
                  textAlign: "center",
                }}
              >
                Search for services
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: COLORS.slate400,
                  textAlign: "center",
                }}
              >
                Type a keyword or use filters to find what you need
              </Text>
            </View>
          )
        ) : loading && services.length === 0 ? (
          /* Loading */
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.slate400 }}>
              Searching...
            </Text>
          </View>
        ) : services.length === 0 ? (
          /* No results */
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <AntDesign name="inbox" size={56} color={COLORS.slate400} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: "600",
                color: COLORS.slate600,
              }}
            >
              No services found
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: COLORS.slate400,
                textAlign: "center",
              }}
            >
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          /* Results grid */
          <FlatList
            data={services}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{ padding: 16 }}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => <GridCard service={item} />}
          />
        )}
      </View>

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={onFiltersChange}
        currentFilters={filters}
      />
    </View>
  );
}
