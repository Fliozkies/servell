// app/screens/ServicesScreen.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
// import { LinearGradient } from "expo-linear-gradient";
import { ArrowUp } from "lucide-react-native";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchBoostedServices,
  fetchEditorsPick,
  searchAndFilterServices,
} from "../../lib/api/services.api";
import AdBanner from "../../lib/components/AdBanner";
import { BoostServiceModal } from "../../lib/components/BoostServiceModal";
import FilterBottomSheet from "../../lib/components/FilterBottomSheet";
import { ServicesScreenSkeleton } from "../../lib/components/SkeletonLoader";
import { COLORS } from "../../lib/constants/theme";
import { useScrollDirection } from "../../lib/context/ScrollDirectionContext";
import { useCurrentUserId } from "../../lib/hooks/useCurrentUserId";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { ServiceWithDetails } from "../../lib/types/database.types";
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

function hasRating(service: ServiceWithDetails): boolean {
  return service.review_count > 0 && service.rating > 0;
}

function compareTopRatedServices(
  a: ServiceWithDetails,
  b: ServiceWithDetails,
): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  return b.review_count - a.review_count;
}

// ── Featured Card ─────────────────────────────────────────────────────────────

// Shared content block used inside both the image and fallback card variants
const FeaturedCardContent = ({
  service,
  isBoosted,
}: {
  service: ServiceWithDetails;
  isBoosted: boolean;
}) => (
  <View style={{ gap: 6 }}>
    {/* Badge */}
    <View
      style={{
        backgroundColor: isBoosted
          ? "rgba(37,99,235,0.85)"
          : "rgba(255,255,255,0.18)",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {isBoosted ? "⚡ FEATURED" : "⭐ TOP PICK"}
      </Text>
    </View>

    {/* Title */}
    <Text
      style={{
        fontSize: 24,
        fontWeight: "900",
        color: "#fff",
        lineHeight: 28,
        textShadowColor: "rgba(0,0,0,0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      }}
      numberOfLines={2}
    >
      {service.title}
    </Text>

    {/* Author · Location */}
    <Text
      style={{
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      }}
      numberOfLines={1}
    >
      by {formatAuthor(service)}
      {service.location ? ` · ${service.location}` : ""}
    </Text>

    {/* Price + Rating row */}
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 2,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#fff",
          textShadowColor: "rgba(0,0,0,0.5)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}
      >
        {formatPrice(service.price)}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(0,0,0,0.35)",
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        }}
      >
        <Text style={{ color: "#fbbf24", fontSize: 12 }}>★</Text>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
          {service.rating.toFixed(1)}
          {service.review_count > 0 ? ` (${service.review_count})` : ""}
        </Text>
      </View>
    </View>
  </View>
);

const FeaturedCard = ({
  service,
  isBoosted,
}: {
  service: ServiceWithDetails;
  isBoosted: boolean;
}) => {
  const accentColor = isBoosted ? COLORS.primary : "#78350f";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/service/${service.id}`)}
      activeOpacity={0.88}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        height: 220,
        // Subtle shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {service.image_url ? (
        /* ── Image variant: service photo as full background ── */
        <ImageBackground
          source={{ uri: service.image_url }}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          {/* Temporary fallback for LinearGradient due to missing native module */}
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              padding: 18,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <FeaturedCardContent service={service} isBoosted={isBoosted} />
          </View>
        </ImageBackground>
      ) : (
        /* ── Fallback: solid accent colour with subtle noise texture ── */
        <View
          style={{
            flex: 1,
            backgroundColor: accentColor,
            justifyContent: "flex-end",
            padding: 18,
          }}
        >
          {/* Decorative circle for visual interest when no image */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(255,255,255,0.07)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 20,
              right: 60,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255,255,255,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AntDesign name="picture" size={32} color="rgba(255,255,255,0.3)" />
          </View>
          <FeaturedCardContent service={service} isBoosted={isBoosted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

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
            fontSize: 14,
            fontWeight: "800",
            color: "#0f172a",
            marginBottom: 5,
          }}
          numberOfLines={1}
        >
          {service.title}
        </Text>
        <Text
          style={{ fontSize: 12, fontWeight: "700", color: COLORS.slate700 }}
        >
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
            fontSize: 14,
            fontWeight: "800",
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
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: COLORS.slate700,
              }}
            >
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
  /** Effective user location (GPS or profile fallback) — passed through for See all navigation */
  effectiveUserLocation?: import("../../lib/types/filter.types").UserLocation;
  /** Optional header element to render at the top of the scroll content (non-sticky) */
  listHeader?: ReactNode;
  /** Callback fired when scroll reaches or leaves the top */
  onAtTopChange?: (isAtTop: boolean) => void;
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ServicesScreen({
  searchQuery,
  filterModalVisible,
  onFilterModalClose,
  filters,
  onFiltersChange,
  effectiveUserLocation,
  listHeader,
  onAtTopChange,
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
  const [isBoostModalVisible, setIsBoostModalVisible] = useState(false);

  const userId = useCurrentUserId();

  const { createScrollHandler, direction, subscribe } = useScrollDirection();
  const baseScrollHandler = useRef(createScrollHandler()).current;
  const scrollRef = useRef<any>(null);
  const scrollYRef = useRef(0);

  const backToTopAnim = useRef(new Animated.Value(0)).current;

  const scrollHandler = useCallback(
    (e: any) => {
      baseScrollHandler(e);
      const currentY = e.nativeEvent.contentOffset.y;

      if (scrollYRef.current <= 50 && currentY > 50) {
        onAtTopChange?.(false);
      } else if (scrollYRef.current > 50 && currentY <= 50) {
        onAtTopChange?.(true);
      }

      scrollYRef.current = currentY;

      const shouldShow = currentY > 300 && direction.current === "up";
      Animated.timing(backToTopAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    },
    [baseScrollHandler, direction, backToTopAnim, onAtTopChange],
  );

  useEffect(() => {
    return subscribe((dir) => {
      const shouldShow = scrollYRef.current > 300 && dir === "up";
      Animated.timing(backToTopAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [subscribe, backToTopAnim]);

  const scrollToTop = () => {
    if (scrollYRef.current <= 300 || direction.current !== "up") return;
    if (scrollRef.current) {
      if (scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ y: 0, animated: true });
      } else if (scrollRef.current.scrollToOffset) {
        scrollRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  };

  const renderBackToTop = () => (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 120, // Above the BottomNav
        left: "50%",
        marginLeft: -25, // Center horizontally based on width 50
        zIndex: 50,
        opacity: backToTopAnim,
        transform: [
          {
            scale: backToTopAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.01, 1],
            }),
          },
          {
            translateY: backToTopAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={scrollToTop}
        activeOpacity={0.8}
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: COLORS.primary,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 8,
        }}
      >
        <ArrowUp size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );

  const debouncedSearch = useDebounce(searchQuery, 400);

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

  // "Top rated" — top 6 reviewed services by rating, then review count.
  const topRatedServices = !isFiltered
    ? [...services].filter(hasRating).sort(compareTopRatedServices).slice(0, 6)
    : [];

  // ── States ───────────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return <ServicesScreenSkeleton listHeader={listHeader} />;
  }

  if (error && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        {listHeader}
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
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
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
          {listHeader}
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
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          data={services}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ padding: 16 }}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader ? () => <>{listHeader}</> : undefined}
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
        {renderBackToTop()}
      </View>
    );
  }

  // ── Default / homepage view — sectioned layout ────────────────────────────

  if (services.length === 0) {
    return (
      <ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
        {listHeader}
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
      <ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1, backgroundColor: COLORS.slate100 }}
        contentContainerStyle={{ gap: 20 }}
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
        {/* ── Header (scrolls with content, not sticky) ── */}
        {listHeader && (
          <View style={{ backgroundColor: "#fff" }}>{listHeader}</View>
        )}

        {/* ── Ad Banner ── */}
        <AdBanner marginVertical={4} />

        <View style={{ paddingHorizontal: 16, gap: 20 }}>
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
                        userLocationLng: String(
                          effectiveUserLocation.longitude,
                        ),
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
          <PromoBanner onPress={() => setIsBoostModalVisible(true)} />

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
        </View>
      </ScrollView>

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={onFilterModalClose}
        onApply={onFiltersChange}
        currentFilters={filters}
      />

      <BoostServiceModal
        visible={isBoostModalVisible}
        userId={userId}
        onClose={() => setIsBoostModalVisible(false)}
      />

      {renderBackToTop()}
    </View>
  );
}
