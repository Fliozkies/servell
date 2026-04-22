// app/screens/ServicesScreen.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchBoostedServices,
  fetchCategories,
  fetchEditorsPick,
  searchAndFilterServices,
} from "../../lib/api/services.api";
import AdBanner from "../../lib/components/AdBanner";
import FilterBottomSheet from "../../lib/components/FilterBottomSheet";
import { CategoryPill } from "../../lib/components/ServicesHeader";
import { COLORS } from "../../lib/constants/theme";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { useScrollDirection } from "../../lib/context/ScrollDirectionContext";
import { Category, ServiceWithDetails } from "../../lib/types/database.types";
import { FilterOptions } from "../../lib/types/filter.types";
import { formatPrice } from "../../lib/utils/format";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAuthor(service: ServiceWithDetails): string {
  if (service.profile?.first_name) {
    return `${service.profile.first_name} ${service.profile.last_name ?? ""}`.trim();
  }
  return "Unknown";
}

// ── Featured Card ─────────────────────────────────────────────────────────────

const FeaturedCard = ({
  service,
  isBoosted,
}: {
  service: ServiceWithDetails;
  isBoosted: boolean;
}) => (
  <TouchableOpacity
    onPress={() => router.push(`/service/${service.id}`)}
    activeOpacity={0.88}
    style={{
      backgroundColor: isBoosted ? COLORS.primary : "#78350f",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    }}
  >
    {/* Thumbnail */}
    {service.image_url ? (
      <Image
        source={{ uri: service.image_url }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 12,
          flexShrink: 0,
        }}
      />
    ) : (
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.15)",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AntDesign name="picture" size={28} color="rgba(255,255,255,0.5)" />
      </View>
    )}

    {/* Content */}
    <View style={{ flex: 1, minWidth: 0 }}>
      {/* Badge — ⚡ FEATURED for paid boost, ⭐ TOP PICK for editor's pick */}
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.2)",
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          {isBoosted ? "⚡ FEATURED" : "⭐ TOP PICK"}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#fff",
          marginBottom: 2,
        }}
        numberOfLines={1}
      >
        {service.title}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.75)",
          marginBottom: 6,
        }}
        numberOfLines={1}
      >
        by {formatAuthor(service)}
        {service.location ? ` · ${service.location}` : ""}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
          {formatPrice(service.price)}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            backgroundColor: "rgba(255,255,255,0.2)",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#fbbf24", fontSize: 10 }}>★</Text>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
            {service.rating.toFixed(1)}
            {service.review_count > 0 ? ` (${service.review_count})` : ""}
          </Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// ── Mini Card (horizontal scroll) ─────────────────────────────────────────────

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

const MiniCard = ({ service }: { service: ServiceWithDetails }) => {
  const catName = service.category?.name ?? "Others";
  const bg = MINI_CARD_BG[catName] ?? "#f1f5f9";
  const stroke = MINI_CARD_STROKE[catName] ?? "#64748b";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/service/${service.id}`)}
      activeOpacity={0.85}
      style={{
        width: 140,
        flexShrink: 0,
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: COLORS.slate200,
      }}
    >
      {/* Image / placeholder */}
      {service.image_url ? (
        <Image
          source={{ uri: service.image_url }}
          style={{ height: 90, width: "100%" }}
        />
      ) : (
        <View
          style={{
            height: 90,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AntDesign name="picture" size={28} color={stroke} />
        </View>
      )}

      {/* Distance badge */}
      {service._distanceKm != null && (
        <View
          style={{
            position: "absolute",
            bottom: 8 + 50, // above the body (90px img - rough offset)
            right: 6,
            backgroundColor: "rgba(24,119,242,0.85)",
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Ionicons name="location-outline" size={8} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 8, fontWeight: "700" }}>
            {service._distanceKm < 1
              ? `${Math.round(service._distanceKm * 1000)}m`
              : `${service._distanceKm.toFixed(1)}km`}
          </Text>
        </View>
      )}

      <View style={{ padding: 8, paddingTop: 7 }}>
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
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {service.title}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
          {formatPrice(service.price)}
        </Text>
        <Text
          style={{ fontSize: 10, color: COLORS.slate400, marginTop: 1 }}
          numberOfLines={1}
        >
          by {formatAuthor(service)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Promo Banner ──────────────────────────────────────────────────────────────

const PromoBanner = ({ onPress }: { onPress?: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: COLORS.slate200,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    }}
  >
    <View
      style={{
        width: 44,
        height: 44,
        backgroundColor: "#EEF4FF",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Ionicons name="flash" size={22} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#0f172a",
          marginBottom: 2,
        }}
      >
        Boost your service
      </Text>
      <Text style={{ fontSize: 11, color: COLORS.slate500 }}>
        Get seen by more customers
      </Text>
    </View>
    <View
      style={{
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
        Promote
      </Text>
    </View>
  </TouchableOpacity>
);

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

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = ({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    }}
  >
    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>
      {title}
    </Text>
    {action && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text
          style={{ fontSize: 12, fontWeight: "500", color: COLORS.primary }}
        >
          {action}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Screen Props ──────────────────────────────────────────────────────────────

type ServicesScreenProps = {
  searchQuery: string;
  filterModalVisible: boolean;
  onFilterModalClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onCategoriesLoaded?: (pills: CategoryPill[]) => void;
  /** Effective user location (GPS or profile fallback) — passed through for See all navigation */
  effectiveUserLocation?: import("../../lib/types/filter.types").UserLocation;
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ServicesScreen({
  searchQuery,
  filterModalVisible,
  onFilterModalClose,
  filters,
  onFiltersChange,
  onCategoriesLoaded,
  effectiveUserLocation,
}: ServicesScreenProps) {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [boostedServices, setBoostedServices] = useState<ServiceWithDetails[]>(
    [],
  );
  const [editorsPickService, setEditorsPickService] =
    useState<ServiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // ── Load categories once ─────────────────────────────────────────────────
  useEffect(() => {
    fetchCategories()
      .then((cats: Category[]) => {
        const pills: CategoryPill[] = cats.map((c) => ({
          id: c.id,
          name: c.name,
        }));
        onCategoriesLoaded?.(pills);
      })
      .catch(() => {
        // If categories fail, header keeps static pills — no-op
      });
  }, [onCategoriesLoaded]);

  // ── Load services ────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    try {
      setError(null);
      const [data, boosted, editorsPick] = await Promise.all([
        searchAndFilterServices({
          searchQuery: debouncedSearch,
          categoryId: filters.categoryId,
          minPrice: filters.priceRange.min,
          maxPrice: filters.priceRange.max,
          minRating: filters.minRating,
          location: filters.location,
          sortBy: filters.sortBy,
          userLocation: filters.userLocation,
        }),
        fetchBoostedServices(),
        fetchEditorsPick(),
      ]);
      setServices(data);
      setBoostedServices(boosted);
      setEditorsPickService(editorsPick);
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
    filters.userLocation,
  ]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  // ── Derived data for sections ────────────────────────────────────────────

  const isFiltered =
    !!searchQuery ||
    !!filters.categoryId ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    !!filters.minRating ||
    !!filters.location ||
    filters.sortBy !== "newest";

  // "Featured" — boosted service takes priority; Editor's Pick is the fallback.
  // Neither shows when filters/search are active.
  const featuredService = !isFiltered
    ? boostedServices.length > 0
      ? boostedServices[0]
      : editorsPickService
    : null;

  // Whether the featured card is a paid boost or an editor's pick
  const featuredIsBoosted = !isFiltered && boostedServices.length > 0;

  // "Nearest to you" — only shown when the user has granted location permission.
  // Shows up to 5 closest services that have coordinates, sorted by distance.
  const nearestServices =
    !isFiltered && filters.userLocation
      ? [...services]
          .filter((s) => s.latitude != null && s.longitude != null)
          .sort(
            (a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity),
          )
          .slice(0, 5)
      : [];

  // "Top rated" — top 6 by rating, excluding any boosted service already shown
  const topRatedServices = !isFiltered
    ? [...services]
        .sort((a, b) => b.rating - a.rating)
        .filter((s) => s.id !== featuredService?.id)
        .slice(0, 6)
    : [];

  // ── States ───────────────────────────────────────────────────────────────

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

  // ── Filtered/search view — plain grid ────────────────────────────────────

  if (isFiltered) {
    if (services.length === 0) {
      return (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <View className="flex-1 items-center justify-center bg-slate-50 px-8">
            <AntDesign name="inbox" size={64} color={COLORS.slate400} />
            <Text className="mt-4 text-slate-800 font-semibold text-lg">
              No services found
            </Text>
            <Text className="mt-2 text-slate-600 text-center">
              Try adjusting your search or filters
            </Text>
          </View>

          <FilterBottomSheet
            visible={filterModalVisible}
            onClose={onFilterModalClose}
            onApply={onFiltersChange}
            currentFilters={filters}
          />
        </ScrollView>
      );
    }

    return (
      <View className="flex-1">
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
        <FilterBottomSheet
          visible={filterModalVisible}
          onClose={onFilterModalClose}
          onApply={onFiltersChange}
          currentFilters={filters}
        />
      </View>
    );
  }

  // ── Default / homepage view — sectioned layout ────────────────────────────

  if (services.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View className="flex-1 items-center justify-center bg-slate-50 px-8">
          <AntDesign name="inbox" size={64} color={COLORS.slate400} />
          <Text className="mt-4 text-slate-800 font-semibold text-lg">
            No Services Yet
          </Text>
          <Text className="mt-2 text-slate-600 text-center">
            Be the first to post a service! Tap the + button below.
          </Text>
        </View>

        <FilterBottomSheet
          visible={filterModalVisible}
          onClose={onFilterModalClose}
          onApply={onFiltersChange}
          currentFilters={filters}
        />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Ad Banner — must live outside ScrollView to avoid Fabric addViewAt crash ── */}
      <AdBanner marginVertical={4} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.slate100 }}
        contentContainerStyle={{ padding: 16, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Featured ── */}
        {featuredService && (
          <View>
            <SectionHeader title="Featured" />
            <FeaturedCard
              service={featuredService}
              isBoosted={featuredIsBoosted}
            />
          </View>
        )}

        {/* ── Nearest to you ── */}
        {nearestServices.length > 0 && (
          <View>
            <SectionHeader
              title="Nearest to you"
              action="See all"
              onAction={() =>
                router.push({
                  pathname: "/services-list",
                  params: {
                    title: "Nearest to You",
                    sort: "nearest",
                    ...(effectiveUserLocation && {
                      userLocationLat: String(effectiveUserLocation.latitude),
                      userLocationLng: String(effectiveUserLocation.longitude),
                    }),
                  },
                })
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {nearestServices.map((s) => (
                <MiniCard key={s.id} service={s} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Promo banner ── */}
        <PromoBanner />

        {/* ── Top rated ── */}
        {topRatedServices.length > 0 && (
          <View>
            <SectionHeader
              title="Top rated"
              action="See all"
              onAction={() =>
                router.push({
                  pathname: "/services-list",
                  params: { title: "Top Rated", sort: "rating_high" },
                })
              }
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {topRatedServices.map((s) => (
                <GridCard key={s.id} service={s} />
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 8 }} />
      </ScrollView>

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={onFilterModalClose}
        onApply={onFiltersChange}
        currentFilters={filters}
      />
    </View>
  );
}
