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

  // Search and Filter states - managed at app level for header
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categoryId: null,
    priceRange: { min: null, max: null },
    minRating: null,
    location: "",
    sortBy: "newest",
  });

  // Count active filters for header indicator
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null)
      count++;
    if (filters.minRating) count++;
    if (filters.location) count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const hasActiveFilters = activeFilterCount > 0;

  // Handle when a service is created
  const handleServiceCreated = () => {
    setActiveTab("Services"); // Go back to home/services tab
    // The ServicesContent component will auto-refresh on mount
  };

  // Handle cancel button in create service
  const handleCreateCancel = () => {
    setActiveTab("Services");
  };

  return (
    <View className="bg-slate-50 flex-1">
      {/**Header - Show only on Services tab */}
      {activeTab === "Services" && (
        <ServicesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterPress={() => setFilterModalVisible(true)}
          insets={insets}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Main Content Area */}
      <View className="flex-1">
        {activeTab === "Services" && (
          <ServicesContent
            searchQuery={searchQuery}
            filterModalVisible={filterModalVisible}
            onFilterModalClose={() => setFilterModalVisible(false)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}

        {activeTab === "Notification" && <NotificationScreen />}

        {activeTab === "Message" && <ConversationsScreen />}

        {activeTab === "Post" && (
          <CreateService
            onServiceCreated={handleServiceCreated}
            onCancel={handleCreateCancel}
          />
        )}

        {activeTab === "Profile" && <Profile />}
      </View>

      {/* Bottom Navigation - Hide when creating service */}
      {activeTab !== "Post" && (
        <BottomNav currentTab={activeTab} onTabPress={setActiveTab} />
      )}
    </View>
  );
}
