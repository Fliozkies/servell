// app/services-list/index.tsx
//
// Full-screen service list — pushed from:
//   - "See all" on Top Rated section
//   - "See all" on Nearest to you section
//   - Category pills in ServicesHeader
//
// Params:
//   sort    — "rating_high" | "nearest" | "newest"   (optional)
//   categoryId  — UUID string                         (optional)
//   title   — display string for the header           (required)

import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { searchAndFilterServices } from "../../lib/api/services.api";
import BottomNav from "../../lib/components/BottomNav";
import { COLORS } from "../../lib/constants/theme";
import {
  ScrollDirectionProvider,
  useScrollDirection,
} from "../../lib/context/ScrollDirectionContext";
import { useUnreadCounts } from "../../lib/hooks/useUnreadCounts";
import { PageName } from "../../lib/types/custom.types";
import { ServiceWithDetails } from "../../lib/types/database.types";
import { SortOption, UserLocation } from "../../lib/types/filter.types";
import { formatPrice } from "../../lib/utils/format";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

// How far down before the scroll-to-top button appears
const SCROLL_TO_TOP_THRESHOLD = 400;

// ── Service Card ──────────────────────────────────────────────────────────────

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

const ServiceCard = ({
  service,
  showDistance,
}: {
  service: ServiceWithDetails;
  showDistance: boolean;
}) => {
  const catName = service.category?.name ?? "Others";

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
      {service.image_url ? (
        <View style={{ height: 130, position: "relative" }}>
          <Image
            source={{ uri: service.image_url }}
            style={{ height: 130, width: "100%" }}
          />
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
          {showDistance && service._distanceKm != null && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(24,119,242,0.85)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
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
        </View>
      ) : (
        <View
          style={{
            height: 130,
            backgroundColor: COLORS.slate100,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AntDesign name="picture" size={32} color={COLORS.slate300} />
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

// ── Screen ────────────────────────────────────────────────────────────────────

function ServiceListScreenInner() {
  const params = useLocalSearchParams<{
    title: string;
    sort?: SortOption;
    categoryId?: string;
    userLocationLat?: string;
    userLocationLng?: string;
  }>();

  const title = params.title ?? "Services";
  const sort: SortOption = (params.sort as SortOption) ?? "newest";
  const categoryId = params.categoryId ?? null;

  const userLocation: UserLocation = useMemo(
    () =>
      params.userLocationLat && params.userLocationLng
        ? {
            latitude: parseFloat(params.userLocationLat),
            longitude: parseFloat(params.userLocationLng),
          }
        : null,
    [params.userLocationLat, params.userLocationLng],
  );

  const insets = useSafeAreaInsets();

  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BottomNav
  const [activeTab] = useState<PageName>("Services");
  const { counts } = useUnreadCounts();
  const { createScrollHandler } = useScrollDirection();
  const scrollDirectionHandler = useRef(createScrollHandler()).current;

  // Scroll-to-top
  const flatListRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // BottomNav is position:absolute with bottom = insets.bottom + 16 (min 24),
  // and its own height is ~60px. Add 16px gap above it.
  const navBottom = Math.max(insets.bottom + 16, 24);
  const scrollTopBottom = navBottom + 60 + 16;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollDirectionHandler(e);

      const y = e.nativeEvent.contentOffset.y;
      const shouldShow = y > SCROLL_TO_TOP_THRESHOLD;
      setShowScrollTop((prev) => {
        if (prev !== shouldShow) {
          Animated.timing(fadeAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
        return shouldShow;
      });
    },
    [scrollDirectionHandler, fadeAnim],
  );

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await searchAndFilterServices({
        categoryId,
        sortBy: sort,
        userLocation,
      });
      setServices(
        sort === "rating_high"
          ? data.filter(hasRating).sort(compareTopRatedServices)
          : data,
      );
    } catch {
      setError("Failed to load services. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, sort, userLocation]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleTabPress = (_tab: PageName) => {
    router.back();
  };

  const showDistance = sort === "nearest" && userLocation != null;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: COLORS.slate200,
          backgroundColor: "#fff",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.slate100,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <AntDesign name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 18, fontWeight: "700", color: "#0f172a", flex: 1 }}
        >
          {title}
        </Text>
        {services.length > 0 && !loading && (
          <Text style={{ fontSize: 13, color: COLORS.slate400 }}>
            {services.length} results
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {loading && !refreshing ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text
              style={{ marginTop: 12, color: COLORS.slate500, fontSize: 13 }}
            >
              Loading…
            </Text>
          </View>
        ) : error ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <AntDesign
              name="exclamation-circle"
              size={48}
              color={COLORS.danger}
            />
            <Text
              style={{
                marginTop: 12,
                color: "#0f172a",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <AntDesign name="inbox" size={64} color={COLORS.slate300} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 16,
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              No services found
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: COLORS.slate500,
                textAlign: "center",
              }}
            >
              Try a different category or check back later
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={services}
            numColumns={2}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => (
              <ServiceCard service={item} showDistance={showDistance} />
            )}
          />
        )}
      </View>

      {/* BottomNav — position:absolute internally, renders over content */}
      <BottomNav
        currentTab={activeTab}
        onTabPress={handleTabPress}
        unreadMessages={counts.messages}
        unreadNotifications={counts.notifications}
      />

      {/* Scroll-to-top — position:absolute at screen level, above BottomNav */}
      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: scrollTopBottom,
          alignSelf: "center",
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          onPress={scrollToTop}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: COLORS.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <AntDesign name="arrow-up" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            Back to top
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

export default function ServiceListScreen() {
  return (
    <ScrollDirectionProvider>
      <ServiceListScreenInner />
    </ScrollDirectionProvider>
  );
}
