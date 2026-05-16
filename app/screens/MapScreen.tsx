// app/screens/MapScreen.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { searchAndFilterServices } from "../../lib/api/services.api";
import FilterBottomSheet from "../../lib/components/FilterBottomSheet";
import { COLORS } from "../../lib/constants/theme";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { ServiceWithDetails } from "../../lib/types/database.types";
import { FilterOptions } from "../../lib/types/filter.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hides all Google POI markers, transit icons, and business labels
const CLEAN_MAP_STYLE = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

// Digos City default center
const DIGOS_REGION: Region = {
  latitude: 6.7494,
  longitude: 125.3573,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// How far (meters) the user must move before we update their marker.
// 30m is fine-grained enough to feel live without hammering the GPS.
const LOCATION_UPDATE_DISTANCE_M = 30;
const RECENTER_BUTTON_SIZE = 48;
const FLOATING_CONTROL_GAP = 16;

type MapScreenProps = {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
};

function useBottomNavClearance() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 390, 0.85), 1.25);
  const bottomMargin = Math.max(insets.bottom + Math.round(16 * scale), 24);
  const navHeight = Math.round(74 * scale);

  return bottomMargin + navHeight + FLOATING_CONTROL_GAP;
}

export default function MapScreen({
  filters,
  onFiltersChange,
}: MapScreenProps) {
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [centeredOnUser, setCenteredOnUser] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);
  const bottomNavClearance = useBottomNavClearance();

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest";

  const shouldFitFilteredResults =
    debouncedSearch.trim().length > 0 || hasActiveFilters;

  // ── Load services matching map search / filters, then keep pinned only ───
  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
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

        if (!cancelled) {
          setServices(
            data.filter((s) => s.latitude != null && s.longitude != null),
          );
        }
      } catch {
        // Non-fatal — map still works without services
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadServices();

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
  ]);

  // ── Live location tracking ───────────────────────────────────────────────
  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError(true);
      return;
    }

    // Get a quick initial fix
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      };
      setUserLocation(coords);

      // Pan the map to the user on first fix
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        800,
      );
      setCenteredOnUser(true);
    } catch {
      // fall through to watchPosition
    }

    // Subscribe — only fires when user moves more than the threshold
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: LOCATION_UPDATE_DISTANCE_M,
      },
      (loc) => {
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      },
    );
  }, []);

  useEffect(() => {
    startLocationTracking();

    return () => {
      // Clean up subscription on unmount
      locationSubscription.current?.remove();
    };
  }, [startLocationTracking]);

  useEffect(() => {
    if (!shouldFitFilteredResults || services.length === 0) return;

    const coordinates = services.map((service) => ({
      latitude: service.latitude!,
      longitude: service.longitude!,
    }));

    const timer = setTimeout(() => {
      if (coordinates.length === 1) {
        mapRef.current?.animateToRegion(
          {
            ...coordinates[0],
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500,
        );
        return;
      }

      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 150,
          right: 60,
          bottom: bottomNavClearance + 130,
          left: 60,
        },
        animated: true,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [bottomNavClearance, services, shouldFitFilteredResults]);

  // ── Recenter button ──────────────────────────────────────────────────────
  const handleRecenter = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
    setCenteredOnUser(true);
  };

  // ── Format price for callout ─────────────────────────────────────────────
  const formatCalloutPrice = (price: number | null) =>
    price != null ? `₱${price.toLocaleString()}` : "Contact for price";

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DIGOS_REGION}
        customMapStyle={CLEAN_MAP_STYLE}
        showsUserLocation={false} // we draw our own marker for full control
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        onTouchStart={() => setCenteredOnUser(false)}
      >
        {/* ── User location marker (red ribbon / pin) ── */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={999}
          >
            <View style={styles.userMarkerWrapper}>
              <View style={styles.userMarkerDot} />
              <View style={styles.userMarkerPulse} />
            </View>
          </Marker>
        )}

        {/* ── Service markers ── */}
        {services.map((service) => (
          <Marker
            key={service.id}
            coordinate={{
              latitude: service.latitude!,
              longitude: service.longitude!,
            }}
            pinColor="#1877F2"
          >
            <Callout
              tooltip
              onPress={() => router.push(`/service/${service.id}`)}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={2}>
                  {service.title}
                </Text>
                <Text style={styles.calloutCategory}>
                  {service.category?.name ?? "Service"}
                </Text>
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutPrice}>
                    {formatCalloutPrice(service.price)}
                  </Text>
                  <View style={styles.calloutRating}>
                    <AntDesign name="star" size={11} color="#FCC419" />
                    <Text style={styles.calloutRatingText}>
                      {service.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.calloutTapHint}>
                  <Text style={styles.calloutTapText}>Tap to view details</Text>
                  <Ionicons name="chevron-forward" size={11} color="#1877F2" />
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* ── Search bar ── */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <AntDesign name="search" size={18} color={COLORS.slate400} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services..."
            placeholderTextColor={COLORS.slate400}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
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
            style={styles.filterBtn}
          >
            <View
              style={[
                styles.filterIconWrap,
                hasActiveFilters && styles.filterIconWrapActive,
              ]}
            >
              <AntDesign
                name="filter"
                size={18}
                color={hasActiveFilters ? "#fff" : COLORS.slate500}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Service count badge ── */}
      <View style={styles.countBadge}>
        <Ionicons name="location" size={13} color="#1877F2" />
        <Text style={styles.countText}>
          {services.length} service{services.length !== 1 ? "s" : ""} on map
        </Text>
      </View>

      {/* ── Recenter button ── */}
      <TouchableOpacity
        style={[
          styles.recenterBtn,
          { bottom: bottomNavClearance },
          centeredOnUser && styles.recenterBtnActive,
        ]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Ionicons
          name="locate"
          size={22}
          color={centeredOnUser ? "#fff" : "#1877F2"}
        />
      </TouchableOpacity>

      {/* ── No location warning ── */}
      {locationError && (
        <View
          style={[
            styles.locationWarning,
            { bottom: bottomNavClearance + RECENTER_BUTTON_SIZE + 12 },
          ]}
        >
          <Ionicons name="warning-outline" size={14} color="#b45309" />
          <Text style={styles.locationWarningText}>
            Location permission denied — live tracking unavailable
          </Text>
        </View>
      )}

      {/* ── Empty state overlay ── */}
      {services.length === 0 && !loading && (
        <View
          style={[
            styles.emptyOverlay,
            { paddingBottom: bottomNavClearance + 24 },
          ]}
        >
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={32} color={COLORS.slate400} />
            <Text style={styles.emptyTitle}>
              {shouldFitFilteredResults
                ? "No matching services on the map"
                : "No pinned services yet"}
            </Text>
            <Text style={styles.emptyBody}>
              {shouldFitFilteredResults
                ? "Try adjusting your search or filters."
                : "Services will appear here once providers pin their location when posting."}
            </Text>
          </View>
        </View>
      )}

      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={onFiltersChange}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  // Search bar
  searchBarWrapper: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    elevation: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#0f172a",
  },
  filterBtn: {
    marginLeft: 8,
  },
  filterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIconWrapActive: {
    backgroundColor: COLORS.primary,
  },
  // User marker
  userMarkerWrapper: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 2,
  },
  userMarkerPulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  // Callout
  callout: {
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  calloutCategory: {
    fontSize: 11,
    color: "#1877F2",
    fontWeight: "500",
    marginBottom: 6,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calloutPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  calloutRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fefce8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  calloutRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78350f",
  },
  calloutTapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  calloutTapText: {
    fontSize: 11,
    color: "#1877F2",
    fontWeight: "500",
  },
  // Count badge
  countBadge: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  // Recenter button
  recenterBtn: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  recenterBtnActive: {
    backgroundColor: "#1877F2",
  },
  // Location warning
  locationWarning: {
    position: "absolute",
    left: 16,
    right: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationWarningText: {
    fontSize: 11,
    color: "#92400e",
    flex: 1,
  },
  // Empty overlay
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    pointerEvents: "none",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 32,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
});
