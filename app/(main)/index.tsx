import { AntDesign } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/api/supabase";
import BottomNav from "../../lib/components/BottomNav";
import ServicesHeader from "../../lib/components/ServicesHeader";
import { COLORS } from "../../lib/constants/theme";
import { useUnreadCounts } from "../../lib/hooks/useUnreadCounts";
import { PageName } from "../../lib/types/custom.types";
import { FilterOptions, UserLocation } from "../../lib/types/filter.types";
import ConversationsScreen from "../screens/ConversationsScreen";
import CreateServiceScreen from "../screens/CreateServiceScreen";
import MapScreen from "../screens/MapScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ServicesScreen from "../screens/ServicesScreen";

const DEFAULT_FILTERS: FilterOptions = {
  categoryId: null,
  priceRange: { min: null, max: null },
  minRating: null,
  location: "",
  sortBy: "newest",
  userLocation: null,
};

/**
 * Main app shell — responsible ONLY for:
 *  - Tab navigation state
 *  - Services header / filter visibility (Services tab only)
 *  - Category pill state (loaded from ServicesScreen, rendered in header)
 *  - Profile location fallback for "Nearest to you" when GPS not granted
 *  - Forwarding badge counts to BottomNav
 */
export default function MainScreen() {
  const [activeTab, setActiveTab] = useState<PageName>("Services");
  const [previousTab, setPreviousTab] = useState<PageName>("Services");

  // Search / filter state (Services tab)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Profile location fallback — loaded once on mount from the user's profile.
  // Used as userLocation when GPS is not granted and "nearest" sort is active.
  const [profileLocation, setProfileLocation] = useState<UserLocation>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Refresh keys
  const [servicesRefreshKey, setServicesRefreshKey] = useState(0);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);
  const [notificationsRefreshKey, setNotificationsRefreshKey] = useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const { counts, resetNotifications, refreshMessages } = useUnreadCounts();

  // ── Load profile location once on mount ─────────────────────────────────
  useEffect(() => {
    async function loadProfileLocation() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("location_lat, location_lng, physis_verified")
        .eq("id", user.id)
        .single();

      if (profile?.location_lat != null && profile?.location_lng != null) {
        setProfileLocation({
          latitude: profile.location_lat,
          longitude: profile.location_lng,
        });
      }
      setIsVerified(profile?.physis_verified ?? false);
    }
    loadProfileLocation();
  }, []);

  // ── Effective userLocation ───────────────────────────────────────────────
  // If the filter already has a live GPS location, use it.
  // Otherwise fall back to the profile's registered location.
  const effectiveUserLocation: UserLocation =
    filters.userLocation ?? profileLocation;

  // Merge effectiveUserLocation into filters before passing to ServicesScreen
  const effectiveFilters: FilterOptions = {
    ...filters,
    userLocation: effectiveUserLocation,
  };

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest" ||
    filters.userLocation !== null;

  useEffect(() => {
    if (activeTab === "Message") refreshMessages();
  }, [activeTab, refreshMessages]);

  // Also refresh message badge whenever the main screen regains focus
  // (e.g., user returns from chat screen via back button)
  useFocusEffect(
    useCallback(() => {
      refreshMessages();
    }, [refreshMessages]),
  );

  const handleTabPress = (tab: PageName) => {
    if (tab === "Post" && !isVerified) {
      Alert.alert(
        "Verification Required",
        "You need to verify your account before posting services. Go to Profile → Settings → Verify Account.",
        [{ text: "OK" }],
      );
      return;
    }
    if (tab === activeTab) {
      switch (tab) {
        case "Services":
          setServicesRefreshKey((prev) => prev + 1);
          break;
        case "Map":
          setMapRefreshKey((prev) => prev + 1);
          break;
        case "Message":
          setMessagesRefreshKey((prev) => prev + 1);
          refreshMessages();
          break;
        case "Notification":
          setNotificationsRefreshKey((prev) => prev + 1);
          break;
        case "Profile":
          setProfileRefreshKey((prev) => prev + 1);
          break;
      }
    } else {
      setPreviousTab(activeTab);
      setActiveTab(tab);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top", "left", "right"]}>
      {activeTab === "Services" && (
        <ServicesHeader
          onNotificationPress={() => {
            setPreviousTab(activeTab);
            setActiveTab("Notification");
          }}
          unreadNotifications={counts.notifications}
        />
      )}

      <View className="flex-1">
        <View
          style={{
            flex: 1,
            display: activeTab === "Services" ? "flex" : "none",
          }}
        >
          <ServicesScreen
            key={servicesRefreshKey}
            searchQuery={searchQuery}
            filterModalVisible={filterModalVisible}
            onFilterModalClose={() => setFilterModalVisible(false)}
            filters={effectiveFilters}
            onFiltersChange={setFilters}
            effectiveUserLocation={effectiveUserLocation}
            listHeader={
              <View className="px-4 pt-3 pb-4">
                <View
                  style={{
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
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search services..."
                    placeholderTextColor={COLORS.slate400}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      fontSize: 15,
                      color: "#0f172a",
                    }}
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
            }
          />
        </View>

        <View
          style={{ flex: 1, display: activeTab === "Map" ? "flex" : "none" }}
        >
          <MapScreen key={mapRefreshKey} />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Message" ? "flex" : "none",
          }}
        >
          <ConversationsScreen key={messagesRefreshKey} />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Notification" ? "flex" : "none",
          }}
        >
          <NotificationScreen
            key={notificationsRefreshKey}
            onAllRead={resetNotifications}
            onBack={() => setActiveTab(previousTab)}
          />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Profile" ? "flex" : "none",
          }}
        >
          <ProfileScreen
            key={profileRefreshKey}
            onVerified={() => setIsVerified(true)}
          />
        </View>

        {activeTab === "Post" && (
          <CreateServiceScreen
            onServiceCreated={() => setActiveTab("Services")}
            onCancel={() => setActiveTab("Services")}
          />
        )}
      </View>

      {activeTab !== "Post" && (
        <BottomNav
          currentTab={activeTab}
          onTabPress={handleTabPress}
          unreadMessages={counts.messages}
          unreadNotifications={counts.notifications}
          isVerified={isVerified}
        />
      )}
    </SafeAreaView>
  );
}
