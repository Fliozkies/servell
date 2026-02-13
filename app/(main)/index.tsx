import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../lib/components/BottomNav";
import ServicesHeader from "../../lib/components/ServicesHeader";
import { useUnreadCounts } from "../../lib/hooks/useUnreadCounts";
import { PageName } from "../../lib/types/custom.types";
import { FilterOptions } from "../../lib/types/filter.types";
import ConversationsScreen from "../screens/ConversationsScreen";
import CreateServiceScreen from "../screens/CreateServiceScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ServicesScreen from "../screens/ServicesScreen";

const DEFAULT_FILTERS: FilterOptions = {
  categoryId: null,
  priceRange: { min: null, max: null },
  minRating: null,
  location: "",
  sortBy: "newest",
};

/**
 * Main app shell — responsible ONLY for:
 *  - Tab navigation state
 *  - Services header / filter visibility (Services tab only)
 *  - Forwarding badge counts to BottomNav
 *
 * All business logic is delegated to hooks and child screens.
 */
export default function MainScreen() {
  const [activeTab, setActiveTab] = useState<PageName>("Services");
  // const insets = useSafeAreaInsets();

  // Search / filter state (Services tab)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Badge counts via extracted hook
  const { counts, resetNotifications, refreshMessages } = useUnreadCounts();

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest";

  // When the user navigates to Messages, refresh unread count
  useEffect(() => {
    if (activeTab === "Message") refreshMessages();
  }, [activeTab, refreshMessages]);

  return (
    <SafeAreaView className="bg-white flex-1">
      {activeTab === "Services" && (
        <ServicesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterPress={() => setFilterModalVisible(true)}
          hasActiveFilters={!!hasActiveFilters}
        />
      )}

      <View className="flex-1">
        {/* Always-mounted tabs preserve subscriptions and avoid re-fetching */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Services" ? "flex" : "none",
          }}
        >
          <ServicesScreen
            searchQuery={searchQuery}
            filterModalVisible={filterModalVisible}
            onFilterModalClose={() => setFilterModalVisible(false)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Message" ? "flex" : "none",
          }}
        >
          <ConversationsScreen />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Notification" ? "flex" : "none",
          }}
        >
          <NotificationScreen onAllRead={resetNotifications} />
        </View>

        <View
          style={{
            flex: 1,
            display: activeTab === "Profile" ? "flex" : "none",
          }}
        >
          <ProfileScreen />
        </View>

        {/* Post tab is mount/unmount — it's a form, no state to preserve */}
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
          onTabPress={setActiveTab}
          unreadMessages={counts.messages}
          unreadNotifications={counts.notifications}
        />
      )}
    </SafeAreaView>
  );
}
