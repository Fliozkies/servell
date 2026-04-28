import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { fetchServices, haversineDistance } from "../../lib/api/services.api";
import { supabase } from "../../lib/api/supabase";
import { COLORS } from "../../lib/constants/theme";
import { useDebounce } from "../../lib/hooks/useDebounce";
import { ServiceWithDetails } from "../../lib/types/database.types";

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

const DIGOS_REGION: Region = {
  latitude: 6.7494,
  longitude: 125.3573,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const LOCATION_UPDATE_DISTANCE_M = 30;
const MAX_SUGGESTIONS = 7;
const NAV_CLEARANCE = 140;

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 10) return `${km.toFixed(1)}km away`;
  return `${Math.round(km)}km away`;
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const searchInputRef = useRef<TextInput>(null);

  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [profileLocation, setProfileLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [centeredOnUser, setCenteredOnUser] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const debouncedQuery = useDebounce(searchQuery, 300);

  const referenceLocation = userLocation ?? profileLocation;

  useEffect(() => {
    async function loadProfileLocation() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("location_lat, location_lng")
        .eq("id", user.id)
        .single();
      if (profile?.location_lat != null && profile?.location_lng != null) {
        setProfileLocation({
          latitude: profile.location_lat,
          longitude: profile.location_lng,
        });
      }
    }
    loadProfileLocation();
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const data = await fetchServices();
      setServices(
        data.filter((s) => s.latitude != null && s.longitude != null),
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError(true);
      return;
    }
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        800,
      );
      setCenteredOnUser(true);
    } catch {
      // fall back to profile location
    }
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
    loadServices();
    startLocationTracking();
    return () => {
      locationSubscription.current?.remove();
    };
  }, [loadServices, startLocationTracking]);

  const handleRecenter = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      500,
    );
    setCenteredOnUser(true);
  };

  const formatCalloutPrice = (price: number | null) =>
    price != null ? `₱${price.toLocaleString()}` : "Contact for price";

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return services
      .filter((s) => {
        const inTitle = s.title.toLowerCase().includes(q);
        const inCategory = s.category?.name?.toLowerCase().includes(q) ?? false;
        const inTags =
          s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        return inTitle || inCategory || inTags;
      })
      .map((s) => {
        const distanceKm =
          referenceLocation && s.latitude != null && s.longitude != null
            ? haversineDistance(
                referenceLocation.latitude,
                referenceLocation.longitude,
                s.latitude,
                s.longitude,
              )
            : null;
        return { ...s, _distanceKm: distanceKm };
      })
      .sort((a, b) => {
        if (a._distanceKm == null && b._distanceKm == null) return 0;
        if (a._distanceKm == null) return 1;
        if (b._distanceKm == null) return -1;
        return a._distanceKm - b._distanceKm;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [debouncedQuery, services, referenceLocation]);

  const handleSelectSuggestion = (
    service: ServiceWithDetails & { _distanceKm: number | null },
  ) => {
    Keyboard.dismiss();
    setSearchQuery(service.title);
    setSearchFocused(false);
    setSelectedServiceId(service.id);
    if (service.latitude != null && service.longitude != null) {
      mapRef.current?.animateToRegion(
        {
          latitude: service.latitude,
          longitude: service.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedServiceId(null);
    searchInputRef.current?.focus();
  };

  const showSuggestions = searchFocused && debouncedQuery.trim().length > 0;

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
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        onTouchStart={() => {
          setCenteredOnUser(false);
          if (searchFocused) {
            Keyboard.dismiss();
            setSearchFocused(false);
          }
        }}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={999}
          >
            <View style={styles.userMarkerWrapper}>
              <View style={styles.userMarkerDot} />
              <View style={styles.userMarkerPulse} />
            </View>
          </Marker>
        )}

        {services.map((service) => {
          const isSelected = service.id === selectedServiceId;
          return (
            <Marker
              key={service.id}
              coordinate={{
                latitude: service.latitude!,
                longitude: service.longitude!,
              }}
              zIndex={isSelected ? 100 : 1}
            >
              <View style={styles.pin}>
                <Ionicons
                  name="location"
                  size={isSelected ? 32 : 24}
                  color={isSelected ? COLORS.primary : "#475569"}
                />
              </View>
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
                    <Text style={styles.calloutTapText}>
                      Tap to view details
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={11}
                      color={COLORS.primary}
                    />
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Search bar ── */}
      <View style={styles.searchContainer}>
        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <AntDesign name="search" size={17} color={COLORS.slate400} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search services on map…"
            placeholderTextColor={COLORS.slate400}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (suggestions.length > 0)
                handleSelectSuggestion(suggestions[0]);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AntDesign
                name="close-circle"
                size={15}
                color={COLORS.slate400}
              />
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && (
          <View style={styles.suggestions}>
            {suggestions.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No services found</Text>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="always"
                bounces={false}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.suggestionItem,
                      index < suggestions.length - 1 && styles.suggestionBorder,
                    ]}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIcon}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.suggestionMeta} numberOfLines={1}>
                        {item.category?.name ?? "Service"}
                        {item._distanceKm != null ? (
                          <Text style={styles.suggestionDistance}>
                            {" · "}
                            {formatDistance(item._distanceKm)}
                          </Text>
                        ) : (
                          <Text style={styles.suggestionNoLocation}>
                            {" · Enable location for distance"}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* ── Service count badge ── */}
      {!showSuggestions && (
        <View style={[styles.countBadge, { bottom: NAV_CLEARANCE }]}>
          <Ionicons name="location" size={13} color={COLORS.primary} />
          <Text style={styles.countText}>
            {services.length} service{services.length !== 1 ? "s" : ""} on map
          </Text>
        </View>
      )}

      {/* ── Recenter button ── */}
      <TouchableOpacity
        style={[
          styles.recenterBtn,
          { bottom: NAV_CLEARANCE + 54 },
          centeredOnUser && styles.recenterBtnActive,
        ]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Ionicons
          name="locate"
          size={22}
          color={centeredOnUser ? "#fff" : COLORS.primary}
        />
      </TouchableOpacity>

      {/* ── Location error banner ── */}
      {locationError && (
        <View style={[styles.locationWarning, { bottom: NAV_CLEARANCE }]}>
          <Ionicons name="warning-outline" size={14} color="#b45309" />
          <Text style={styles.locationWarningText}>
            Location permission denied — showing distances from profile location
          </Text>
        </View>
      )}

      {/* ── Empty state overlay ── */}
      {services.length === 0 && !loading && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={32} color={COLORS.slate400} />
            <Text style={styles.emptyTitle}>No pinned services yet</Text>
            <Text style={styles.emptyBody}>
              Services will appear here once providers pin their location when
              posting.
            </Text>
          </View>
        </View>
      )}
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

  // ── User marker ──
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

  // ── Service pins ──
  pin: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Callout ──
  callout: {
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
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
    color: COLORS.primary,
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
    color: COLORS.primary,
    fontWeight: "500",
  },

  // ── Search ──
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 16 : 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    gap: 8,
  },
  searchBarFocused: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    padding: 0,
  },

  // ── Suggestions dropdown ──
  suggestions: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    maxHeight: 320,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  suggestionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.slate200,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: 12,
    color: COLORS.slate500,
  },
  suggestionDistance: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  suggestionNoLocation: {
    color: COLORS.slate400,
    fontStyle: "italic",
  },
  noResults: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 13,
    color: COLORS.slate400,
  },

  // ── Count badge ──
  countBadge: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ── Recenter button ──
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: COLORS.primary,
  },

  // ── Location warning ──
  locationWarning: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  locationWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
  },

  // ── Empty overlay ──
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    maxWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.slate500,
    textAlign: "center",
    lineHeight: 18,
  },
});
