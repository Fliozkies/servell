// app/screens/ServicesScreen.tsx
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { searchAndFilterServices } from "../../lib/api/services.api";
import FilterBottomSheet from "../../lib/components/FilterBottomSheet";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { COLORS } from "../../lib/constants/theme";
import { formatPrice } from "../../lib/utils/format";
import { ItemProps } from "../../lib/types/custom.types";
import { ServiceWithDetails } from "../../lib/types/database.types";
import { FilterOptions } from "../../lib/types/filter.types";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

// ── Service Card ──────────────────────────────────────────────────────────────

const ServiceCard = ({
  id,
  title,
  category,
  price,
  rating,
  author,
  image,
  reviewCount,
}: ItemProps & { id: string }) => (
  <TouchableOpacity
    onPress={() => router.push(`/service/${id}`)}
    style={{ width: COLUMN_WIDTH }}
    className="bg-white rounded-3xl mb-4 overflow-hidden border border-[#E9ECEF]"
    activeOpacity={0.85}
  >
    <View>
      {image ? (
        <Image
          style={{ height: 140 }}
          className="w-full object-cover"
          source={{ uri: image }}
        />
      ) : (
        <View
          style={{ height: 140 }}
          className="w-full bg-slate-100 items-center justify-center"
        >
          <AntDesign name="picture" size={36} color={COLORS.slate300} />
        </View>
      )}
      <View className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded-full flex-row items-center">
        <AntDesign name="star" size={10} color="#FCC419" />
        <Text className="text-white text-[10px] font-bold ml-1">
          {rating.toFixed(1)}
          {reviewCount > 0 ? ` (${reviewCount})` : ""}
        </Text>
      </View>
    </View>

    <View className="p-3 pt-2.5">
      <Text className="text-[#868E96] text-[11px] mb-0.5" numberOfLines={1}>
        {category}
      </Text>
      <Text
        className="text-[13px] font-bold text-[#212529] mb-2"
        numberOfLines={2}
      >
        {title}
      </Text>
      <View>
        {price !== null ? (
          <Text className="text-[16px] font-black text-[#212529] leading-tight">
            {formatPrice(price)}
          </Text>
        ) : (
          <Text className="text-[12px] font-semibold text-[#1877F2]">
            Contact for price
          </Text>
        )}
        <Text className="text-[#ADB5BD] text-[10px] mt-0.5" numberOfLines={1}>
          by {author}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ── Screen ────────────────────────────────────────────────────────────────────

type ServicesScreenProps = {
  searchQuery: string;
  filterModalVisible: boolean;
  onFilterModalClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
};

export default function ServicesScreen({
  searchQuery,
  filterModalVisible,
  onFilterModalClose,
  filters,
  onFiltersChange,
}: ServicesScreenProps) {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const loadServices = useCallback(async () => {
    try {
      setError(null);
      const data = await searchAndFilterServices({
        searchQuery: debouncedSearch,
        categoryId: filters.categoryId,
        minPrice: filters.priceRange.min,
        maxPrice: filters.priceRange.max,
        minRating: filters.minRating,
        location: filters.location,
        sortBy: filters.sortBy,
      });
      setServices(data);
    } catch {
      setError("Failed to load services. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    debouncedSearch,
    filters.categoryId,
    filters.priceRange.min,
    filters.priceRange.max,
    filters.minRating,
    filters.location,
    filters.sortBy,
  ]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const hasActiveFilter =
    searchQuery ||
    filters.categoryId ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating ||
    filters.location ||
    filters.sortBy !== "newest";

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-slate-600">Loading services...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="exclamation-circle" size={48} color={COLORS.danger} />
        <Text className="mt-4 text-slate-800 font-semibold text-center">
          {error}
        </Text>
        <Text className="mt-2 text-slate-600 text-center">
          Pull down to refresh
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {services.length === 0 ? (
        <View className="flex-1 items-center justify-center bg-slate-50 px-8">
          <AntDesign name="inbox" size={64} color={COLORS.slate400} />
          <Text className="mt-4 text-slate-800 font-semibold text-lg">
            {hasActiveFilter ? "No services found" : "No Services Yet"}
          </Text>
          <Text className="mt-2 text-slate-600 text-center">
            {hasActiveFilter
              ? "Try adjusting your search or filters"
              : "Be the first to post a service! Tap the + button below."}
          </Text>
        </View>
      ) : (
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
          renderItem={({ item }) => (
            <ServiceCard
              id={item.id}
              title={item.title}
              category={item.category?.name ?? "Uncategorized"}
              price={item.price}
              rating={item.rating}
              author={
                item.profile?.first_name
                  ? `${item.profile.first_name} ${item.profile.last_name ?? ""}`.trim()
                  : "Unknown"
              }
              image={item.image_url}
              reviewCount={item.review_count}
            />
          )}
        />
      )}

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={onFilterModalClose}
        onApply={onFiltersChange}
        currentFilters={filters}
      />
    </View>
  );
}
