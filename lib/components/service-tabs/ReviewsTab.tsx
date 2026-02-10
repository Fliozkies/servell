// lib/components/service-tabs/ReviewsTab.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    canUserReviewService,
    deleteReview,
    fetchServiceReviews,
    getUserReviewForService,
} from "../../api/reviews.api";
import {
    ReviewFilterOptions,
    ReviewWithDetails,
    ServiceWithDetails,
} from "../../types/database.types";
import ReviewFilterBottomSheet from "../ReviewFilterBottomSheet";
import ReviewItem from "../ReviewItem";
import WriteReviewModal from "../WriteReviewModal";

type ReviewsTabProps = {
  service: ServiceWithDetails;
  currentUserId: string | null;
  isOwnService: boolean;
  onServiceUpdate?: () => void;
};

export default function ReviewsTab({
  service,
  currentUserId,
  isOwnService,
  onServiceUpdate,
}: ReviewsTabProps) {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState<ReviewWithDetails | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [writeReviewVisible, setWriteReviewVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewWithDetails | null>(
    null,
  );
  const [filters, setFilters] = useState<ReviewFilterOptions>({
    rating: null,
    hasReply: null,
    sortBy: "newest",
  });

  // Cache flag — only load once on first mount, unless manually refreshed
  const hasLoadedRef = useRef(false);

  const loadReviews = useCallback(
    async (pageNum: number, shouldRefresh: boolean = false) => {
      try {
        if (shouldRefresh) {
          setRefreshing(true);
        } else if (pageNum > 0) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const data = await fetchServiceReviews(service.id, filters, pageNum);

        if (shouldRefresh || pageNum === 0) {
          setReviews(data);
        } else {
          setReviews((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === 10);
        setPage(pageNum);
      } catch (error) {
        console.error("Error loading reviews:", error);
        Alert.alert("Error", "Failed to load reviews");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [service.id, filters],
  );

  const checkReviewEligibility = useCallback(async () => {
    if (!currentUserId || isOwnService) {
      setCanReview(false);
      return;
    }

    const eligible = await canUserReviewService(service.id);
    setCanReview(eligible);

    if (eligible) {
      const existing = await getUserReviewForService(service.id);
      setUserReview(existing);
    }
  }, [currentUserId, isOwnService, service.id]);

  // Load only once on first mount (cache behavior)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadReviews(0);
      checkReviewEligibility();
    }
  }); // Empty deps — intentional one-time load

  // Re-load when filters change (user explicitly changed filters)
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    loadReviews(0);
  }, [filters, loadReviews]);

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    loadReviews(0, true);
    checkReviewEligibility();
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadReviews(page + 1);
    }
  };

  const handleFilterApply = (newFilters: ReviewFilterOptions) => {
    setFilters(newFilters);
    setPage(0);
    setHasMore(true);
    setFilterModalVisible(false);
  };

  const handleReviewSubmitted = () => {
    setWriteReviewVisible(false);
    setEditingReview(null);
    handleRefresh();
    if (onServiceUpdate) {
      onServiceUpdate();
    }
  };

  const handleEditReview = (review: ReviewWithDetails) => {
    setEditingReview(review);
    setWriteReviewVisible(true);
  };

  // Delete handler for "Your Review" section
  const handleDeleteUserReview = () => {
    if (!userReview) return;
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReview(userReview.id);
              Alert.alert("Success", "Review deleted successfully");
              handleRefresh();
              if (onServiceUpdate) onServiceUpdate();
            } catch (error) {
              console.error("Error deleting review:", error);
              Alert.alert("Error", "Failed to delete review");
            }
          },
        },
      ],
    );
  };

  const getFilterButtonText = () => {
    const parts: string[] = [];
    if (filters.rating) parts.push(`${filters.rating}★`);
    if (filters.hasReply !== null) {
      parts.push(filters.hasReply ? "With Reply" : "No Reply");
    }
    const sortLabels: Record<string, string> = {
      newest: "Most Recent",
      oldest: "Oldest",
      most_helpful: "Most Helpful",
      most_critical: "Most Critical",
      highest_rating: "Highest Rating",
      lowest_rating: "Lowest Rating",
    };
    const sortText = sortLabels[filters.sortBy];
    if (parts.length > 0) return `${parts.join(" • ")} • ${sortText}`;
    return `Sort: ${sortText}`;
  };

  const hasActiveFilters =
    filters.rating !== null ||
    filters.hasReply !== null ||
    filters.sortBy !== "newest";

  const renderHeader = () => (
    <View className="bg-slate-50">
      {/* Filter Button */}
      <View className="p-4 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
        >
          <View className="flex-row items-center">
            <AntDesign
              name="filter"
              size={15}
              color={hasActiveFilters ? "#3b82f6" : "#64748b"}
            />
            <Text
              style={[
                styles.filterBtnText,
                hasActiveFilters && styles.filterBtnTextActive,
              ]}
            >
              {getFilterButtonText()}
            </Text>
          </View>
          <AntDesign
            name="down"
            size={11}
            color={hasActiveFilters ? "#3b82f6" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>

      {/* Write Review Button */}
      {canReview && !userReview && (
        <View className="p-4 bg-white border-b border-slate-200">
          <TouchableOpacity
            onPress={() => {
              setEditingReview(null);
              setWriteReviewVisible(true);
            }}
            className="bg-blue-500 py-3 rounded-xl flex-row items-center justify-center"
          >
            <AntDesign name="plus" size={18} color="#ffffff" />
            <Text className="ml-2 text-base font-semibold text-white">
              Write a Review
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Your Review Card */}
      {userReview && (
        <View style={styles.yourReviewCard}>
          {/* Your Review Header */}
          <View style={styles.yourReviewHeader}>
            <View style={styles.yourReviewLabelRow}>
              <View style={styles.yourReviewDot} />
              <Text style={styles.yourReviewLabel}>Your Review</Text>
            </View>
            {/* Edit & Delete buttons side by side */}
            <View style={styles.yourReviewActions}>
              <TouchableOpacity
                onPress={() => handleEditReview(userReview)}
                style={styles.editBtn}
              >
                <AntDesign name="edit" size={13} color="#3b82f6" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteUserReview}
                style={styles.deleteBtn}
              >
                <AntDesign name="delete" size={13} color="#ef4444" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Review content — no Edit/Delete inside the card */}
          <ReviewItem
            review={userReview}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            serviceProviderId={service.user_id}
            onUpdate={handleRefresh}
            isUserReview={true}
            hideActions={true}
          />
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#1877F2" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="flex-1 items-center justify-center py-12 px-8">
        <AntDesign name="inbox" size={64} color="#94a3b8" />
        <Text className="mt-4 text-slate-800 font-semibold text-lg">
          No reviews yet
        </Text>
        <Text className="mt-2 text-slate-600 text-center">
          {canReview
            ? "Be the first to review this service!"
            : "Message the service provider to leave a review"}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewItem
            review={item}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            serviceProviderId={service.user_id}
            onUpdate={handleRefresh}
            hideActions={true}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#1877F2"]}
            tintColor="#1877F2"
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <ReviewFilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        currentFilters={filters}
      />

      <WriteReviewModal
        visible={writeReviewVisible}
        onClose={() => {
          setWriteReviewVisible(false);
          setEditingReview(null);
        }}
        serviceId={service.id}
        onSubmit={handleReviewSubmitted}
        existingReview={editingReview || userReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  filterBtnText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  filterBtnTextActive: {
    color: "#2563eb",
  },
  yourReviewCard: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 0,
  },
  yourReviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  yourReviewLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  yourReviewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  yourReviewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a5f",
    letterSpacing: 0.2,
  },
  yourReviewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
});
