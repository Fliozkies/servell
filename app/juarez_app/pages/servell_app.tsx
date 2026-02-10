import {
  fetchConversations,
  subscribeToConversations,
} from "@/lib/api/messaging.api";
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from "@/lib/api/notifications.api";
import { supabase } from "@/lib/api/supabase";
import { useEffect, useRef, useState } from "react";
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

  // ── Search / filter state for Services tab ───────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categoryId: null,
    priceRange: { min: null, max: null },
    minRating: null,
    location: "",
    sortBy: "newest",
  });

  // ── Badge counts ──────────────────────────────────────────────────────────
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const userIdRef = useRef<string | null>(null);

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.minRating !== null ||
    (filters.location && filters.location.trim() !== "") ||
    filters.sortBy !== "newest";

  // ── Initialise badge counts and set up realtime listeners ─────────────────
  useEffect(() => {
    let unsubNotifs: (() => void) | null = null;
    let unsubConvos: (() => void) | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      userIdRef.current = user.id;

      // ── Initial unread message count ──────────────────────────────────────
      const conversations = await fetchConversations();
      const totalUnread = conversations.reduce(
        (sum, c) => sum + (c.unread_count || 0),
        0,
      );
      setUnreadMessages(totalUnread);

      // ── Initial unread notification count ────────────────────────────────
      const notifCount = await getUnreadNotificationCount();
      setUnreadNotifications(notifCount);

      // ── Realtime: new message → re-total unread count ─────────────────────
      unsubConvos = subscribeToConversations(user.id, async () => {
        const updated = await fetchConversations();
        const total = updated.reduce(
          (sum, c) => sum + (c.unread_count || 0),
          0,
        );
        setUnreadMessages(total);
      });

      // ── Realtime: new notification → increment badge ──────────────────────
      unsubNotifs = subscribeToNotifications(user.id, () => {
        setUnreadNotifications((prev) => prev + 1);
      });
    }

    init();

    return () => {
      unsubNotifs?.();
      unsubConvos?.();
    };
  }, []);

  // ── When the user opens the Message tab, re-fetch to refresh badge ────────
  useEffect(() => {
    if (activeTab === "Message") {
      fetchConversations().then((convos) => {
        const total = convos.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(total);
      });
    }
  }, [activeTab]);

  // ── Expose a reset so Notification screen can clear the badge ────────────
  const handleNotificationTabReset = () => {
    setUnreadNotifications(0);
  };

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

      {/* Main Content */}
      <View className="flex-1">
        {/* Services — always mounted */}
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

        {/* Messages — always mounted so realtime subscription stays alive */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Message" ? "flex" : "none",
          }}
        >
          <ConversationsScreen />
        </View>

        {/* Notification — always mounted so data isn't re-fetched on every visit */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Notification" ? "flex" : "none",
          }}
        >
          <NotificationScreen onAllRead={handleNotificationTabReset} />
        </View>

        {/* Profile — always mounted so data isn't re-fetched on every visit */}
        <View
          style={{
            flex: 1,
            display: activeTab === "Profile" ? "flex" : "none",
          }}
        >
          <Profile />
        </View>

        {/* Post — mount/unmount is fine; it's a form screen */}
        {activeTab === "Post" && (
          <CreateService
            onServiceCreated={handleServiceCreated}
            onCancel={handleCreateCancel}
          />
        )}
      </View>

      {activeTab !== "Post" && (
        <BottomNav
          currentTab={activeTab}
          onTabPress={setActiveTab}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />
      )}
    </View>
  );
}
