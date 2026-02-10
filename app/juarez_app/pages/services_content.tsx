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
import { searchAndFilterServices } from "../../../lib/api/services.api";
import FilterBottomSheet from "../../../lib/components/FilterBottomSheet";
import { useDebounce } from "../../../lib/hooks/useDebounce";
import { ItemProps } from "../../../lib/types/custom.types";
import { ServiceWithDetails } from "../../../lib/types/database.types";
import { FilterOptions } from "../../../lib/types/filter.types";

// Get screen width to handle grid spacing logic
const { width } = Dimensions.get("window");
const columnWidth = (width - 48) / 2; // Subtracting total horizontal padding

const Item = ({
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
    onPress={() => router.push(`/juarez_app/pages/service_detail?id=${id}`)}
    style={{ width: columnWidth }}
    className="bg-white rounded-3xl mb-4 overflow-hidden border border-[#E9ECEF]"
    activeOpacity={0.85}
  >
    {/* Image Container */}
    <View>
      {image ? (
        <Image
          style={{ height: 140 }}
          className="w-full object-cover"
          source={{ uri: image }}
        />
      ) : (
        // Placeholder for services without images
        <View
          style={{ height: 140 }}
          className="w-full bg-slate-100 items-center justify-center"
        >
          <AntDesign name="picture" size={36} color="#cbd5e1" />
        </View>
      )}

      {/* Rating Badge — overlaid on image bottom-left */}
      <View className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded-full flex-row items-center">
        <AntDesign name="star" size={10} color="#FCC419" />
        <Text className="text-white text-[10px] font-bold ml-1">
          {rating.toFixed(1)}
          {reviewCount > 0 ? ` (${reviewCount})` : ""}
        </Text>
      </View>
    </View>

    {/* Content Area */}
    <View className="p-3 pt-2.5">
      {/* Category */}
      <Text className="text-[#868E96] text-[11px] mb-0.5" numberOfLines={1}>
        {category}
      </Text>

      {/* Title */}
      <Text
        className="text-[13px] font-bold text-[#212529] mb-2"
        numberOfLines={2}
      >
        {title}
      </Text>

      {/* Footer: price on its own line, author below */}
      <View>
        {price !== null ? (
          <Text className="text-[16px] font-black text-[#212529] leading-tight">
            ₱{price.toLocaleString()}
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

type ServicesContentProps = {
  searchQuery: string;
  filterModalVisible: boolean;
  onFilterModalClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
};

export default function ServicesContent({
  searchQuery,
  filterModalVisible,
  onFilterModalClose,
  filters,
  onFiltersChange,
}: ServicesContentProps) {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Fetch services when search or filters change
  const loadServices = useCallback(async () => {
    try {
      setError(null);
      const data = await searchAndFilterServices({
        searchQuery: debouncedSearchQuery,
        categoryId: filters.categoryId,
        minPrice: filters.priceRange.min,
        maxPrice: filters.priceRange.max,
        minRating: filters.minRating,
        location: filters.location,
        sortBy: filters.sortBy,
      });
      setServices(data);
    } catch (err) {
      console.error("Error loading services:", err);
      setError("Failed to load services. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    debouncedSearchQuery,
    filters.categoryId,
    filters.priceRange.min,
    filters.priceRange.max,
    filters.minRating,
    filters.location,
    filters.sortBy,
    // setServices, setError, setLoading, setRefreshing are stable
  ]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    onFiltersChange(newFilters);
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading services...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="exclamation-circle" size={48} color="#ef4444" />
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
      {/* Empty state */}
      {services.length === 0 ? (
        <View className="flex-1 items-center justify-center bg-slate-50 px-8">
          <AntDesign name="inbox" size={64} color="#94a3b8" />
          <Text className="mt-4 text-slate-800 font-semibold text-lg">
            {searchQuery ||
            filters.categoryId ||
            filters.priceRange.min !== null ||
            filters.priceRange.max !== null ||
            filters.minRating ||
            filters.location ||
            filters.sortBy !== "newest"
              ? "No services found"
              : "No Services Yet"}
          </Text>
          <Text className="mt-2 text-slate-600 text-center">
            {searchQuery ||
            filters.categoryId ||
            filters.priceRange.min !== null ||
            filters.priceRange.max !== null ||
            filters.minRating ||
            filters.location ||
            filters.sortBy !== "newest"
              ? "Try adjusting your search or filters"
              : "Be the first to post a service! Tap the + button below to get started."}
          </Text>
        </View>
      ) : (
        // Services list
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
              colors={["#1877F2"]}
              tintColor="#1877F2"
            />
          }
          renderItem={({ item }) => {
            // Get author name from profile
            const authorName = item.profile?.first_name
              ? `${item.profile.first_name} ${item.profile.last_name || ""}`.trim()
              : "Unknown";

            // Get category name
            const categoryName = item.category?.name || "Uncategorized";

            return (
              <Item
                id={item.id}
                title={item.title}
                category={categoryName}
                price={item.price}
                rating={item.rating}
                author={authorName}
                image={item.image_url}
                reviewCount={item.review_count}
              />
            );
          }}
        />
      )}

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={onFilterModalClose}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </View>
  );
}
