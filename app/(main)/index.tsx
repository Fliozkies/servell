import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/api/supabase";
import BottomNav from "../../lib/components/BottomNav";
import ServicesHeader, {
  CategoryPill,
} from "../../lib/components/ServicesHeader";
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

  // Search / filter state (Services tab)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Category pills — populated when ServicesScreen loads categories
  const [categories, setCategories] = useState<CategoryPill[]>([]);

  // Profile location fallback — loaded once on mount from the user's profile.
  // Used as userLocation when GPS is not granted and "nearest" sort is active.
  const [profileLocation, setProfileLocation] = useState<UserLocation>(null);

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
      setActiveTab(tab);
    }
  };

  const handleCategoryPress = (id: string | null) => {
    if (id === null) {
      // "All" — just clear the category filter, stay on home
      setFilters((prev) => ({ ...prev, categoryId: id }));
      return;
    }
    // Any specific category — push to list screen
    const categoryName =
      categories.find((c) => c.id === id)?.name ?? "Services";
    router.push({
      pathname: "/services-list",
      params: { title: categoryName, categoryId: id },
    });
  };

  // ServicesHeader rendered as a scrollable element (not sticky)
  const servicesHeader = (
    <ServicesHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onFilterPress={() => setFilterModalVisible(true)}
      onNotificationPress={() => setActiveTab("Notification")}
      hasActiveFilters={!!hasActiveFilters}
      unreadNotifications={counts.notifications}
      categories={categories}
      activeCategoryId={filters.categoryId}
      onCategoryPress={handleCategoryPress}
    />
  );

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top", "left", "right"]}>
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
            onCategoriesLoaded={setCategories}
            effectiveUserLocation={effectiveUserLocation}
            // Pass header as a prop so it scrolls with the content
            listHeader={servicesHeader}
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
          />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Profile" ? "flex" : "none",
          }}
        >
          <ProfileScreen key={profileRefreshKey} />
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
        />
      )}
    </SafeAreaView>
  );
}
