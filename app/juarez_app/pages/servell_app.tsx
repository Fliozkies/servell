import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ServicesHeader from "../../../lib/components/ServicesHeader";
import { PageName } from "../../../lib/types/custom.types";
import { FilterOptions } from "../../../lib/types/filter.types";
import ConversationsScreen from "./conversations";
import CreateService from "./create_service";
import BottomNav from "./Navigation";
import NotificationScreen from "./notification";
import Profile from "./Profile_page";
import ServicesContent from "./services_content";

export default function ServellApp() {
  const [activeTab, setActiveTab] = useState<PageName>("Services");
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categoryId: null,
    priceRange: { min: null, max: null },
    minRating: null,
    location: "",
    sortBy: "newest",
  });

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest";

  const handleServiceCreated = () => {
    setActiveTab("Services");
  };

  const handleCreateCancel = () => {
    setActiveTab("Services");
  };

  return (
    <View className="bg-slate-50 flex-1">
      {/* Header — only on Services tab */}
      {activeTab === "Services" && (
        <ServicesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterPress={() => setFilterModalVisible(true)}
          insets={insets}
          hasActiveFilters={!!hasActiveFilters}
        />
      )}

      {/* Main Content — Services and Message are persistent (never unmounted).
          This means they load only once and keep their state across tab switches. */}
      <View className="flex-1">
        {/* Services — always mounted, hidden when not active */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Services" ? "flex" : "none",
          }}
        >
          <ServicesContent
            searchQuery={searchQuery}
            filterModalVisible={filterModalVisible}
            onFilterModalClose={() => setFilterModalVisible(false)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </View>

        {/* Messages (Conversations) — always mounted, real-time subscription stays alive */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Message" ? "flex" : "none",
          }}
        >
          <ConversationsScreen />
        </View>

        {/* Tabs that are fine to mount/unmount per navigation */}
        {activeTab === "Notification" && <NotificationScreen />}
        {activeTab === "Post" && (
          <CreateService
            onServiceCreated={handleServiceCreated}
            onCancel={handleCreateCancel}
          />
        )}
        {activeTab === "Profile" && <Profile />}
      </View>

      {activeTab !== "Post" && (
        <BottomNav currentTab={activeTab} onTabPress={setActiveTab} />
      )}
    </View>
  );
}
