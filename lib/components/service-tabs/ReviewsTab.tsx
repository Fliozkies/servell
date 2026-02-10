// lib/components/service-tabs/ReviewsTab.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    canUserReviewService,
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
  onServiceUpdate?: () => void; // NEW: Callback to refresh service data
};

export default function ReviewsTab({
  service,
  currentUserId,
  isOwnService,
  onServiceUpdate, // NEW
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
  ); // NEW
  const [filters, setFilters] = useState<ReviewFilterOptions>({
    rating: null,
    hasReply: null,
    sortBy: "newest",
  });

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

        setHasMore(data.length === 10); // 10 is REVIEWS_PER_PAGE
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

  useEffect(() => {
    loadReviews(0);
    checkReviewEligibility();
  }, [loadReviews, checkReviewEligibility]);

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    loadReviews(0, true);
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
    // Reload with new filters
    setTimeout(() => loadReviews(0), 100);
  };

  const handleReviewSubmitted = () => {
    setWriteReviewVisible(false);
    setEditingReview(null); // NEW: Clear editing state
    handleRefresh();
    checkReviewEligibility();
    // NEW: Notify parent to refresh service data
    if (onServiceUpdate) {
      onServiceUpdate();
    }
  };

  // NEW: Handle edit review
  const handleEditReview = (review: ReviewWithDetails) => {
    setEditingReview(review);
    setWriteReviewVisible(true);
  };

  const getFilterButtonText = () => {
    const parts: string[] = [];

    if (filters.rating) {
      parts.push(`${filters.rating}★`);
    }
    if (filters.hasReply !== null) {
      parts.push(filters.hasReply ? "With Reply" : "No Reply");
    }

    const sortLabels = {
      newest: "Most Recent",
      oldest: "Oldest",
      most_helpful: "Most Helpful",
      most_critical: "Most Critical",
      highest_rating: "Highest Rating",
      lowest_rating: "Lowest Rating",
    };

    const sortText = sortLabels[filters.sortBy];

    if (parts.length > 0) {
      return `${parts.join(" • ")} • ${sortText}`;
    }
    return `Sort: ${sortText}`;
  };

  const renderHeader = () => (
    <View className="bg-slate-50">
      {/* Filter Button */}
      <View className="p-4 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          className="flex-row items-center justify-between bg-slate-100 px-4 py-3 rounded-xl"
        >
          <View className="flex-row items-center">
            <AntDesign name="filter" size={16} color="#64748b" />
            <Text className="ml-2 text-sm text-slate-700">
              {getFilterButtonText()}
            </Text>
          </View>
          <AntDesign name="down" size={12} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Write Review Button */}
      {canReview && !userReview && (
        <View className="p-4 bg-white border-b border-slate-200">
          <TouchableOpacity
            onPress={() => {
              setEditingReview(null); // NEW: Clear editing state
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

      {/* User's existing review with EDIT button */}
      {userReview && (
        <View className="p-4 bg-white border-b border-slate-200">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-slate-600">
              Your Review
            </Text>
            {/* NEW: Edit button for user's own review */}
            <TouchableOpacity
              onPress={() => handleEditReview(userReview)}
              className="px-3 py-1 rounded-full bg-blue-50"
            >
              <Text className="text-xs font-medium text-blue-600">Edit</Text>
            </TouchableOpacity>
          </View>
          <ReviewItem
            review={userReview}
            currentUserId={currentUserId}
            isOwnService={isOwnService}
            serviceProviderId={service.user_id}
            onUpdate={handleRefresh}
            onEdit={handleEditReview} // NEW: Pass edit callback
            isUserReview={true}
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
            onEdit={handleEditReview} // NEW: Pass edit callback
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

      {/* Filter Bottom Sheet */}
      <ReviewFilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        currentFilters={filters}
      />

      {/* Write/Edit Review Modal - MODIFIED to handle editing */}
      <WriteReviewModal
        visible={writeReviewVisible}
        onClose={() => {
          setWriteReviewVisible(false);
          setEditingReview(null); // NEW: Clear editing state
        }}
        serviceId={service.id}
        onSubmit={handleReviewSubmitted}
        existingReview={editingReview || userReview} // NEW: Use editingReview if set
      />
    </View>
  );
}
