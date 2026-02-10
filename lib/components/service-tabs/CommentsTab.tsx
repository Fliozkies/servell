// lib/components/service-tabs/CommentsTab.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { fetchServiceComments } from "../../api/comments.api";
import {
    CommentSortOption,
    CommentWithDetails,
    ServiceWithDetails,
} from "../../types/database.types";
import AddCommentModal from "../AddCommentModal";
import CommentItem from "../CommentItem";

type CommentsTabProps = {
  service: ServiceWithDetails;
  currentUserId: string | null;
  isOwnService: boolean;
};

export default function CommentsTab({
  service,
  currentUserId,
  isOwnService,
}: CommentsTabProps) {
  const [comments, setComments] = useState<CommentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<CommentSortOption>("newest");
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [addCommentVisible, setAddCommentVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentWithDetails | null>(null);

  // Cache flag — only load once on first mount, unless manually refreshed
  const hasLoadedRef = useRef(false);
  const isFirstSortRender = useRef(true);

  const loadComments = useCallback(
    async (pageNum: number, shouldRefresh: boolean = false) => {
      try {
        if (shouldRefresh) {
          setRefreshing(true);
        } else if (pageNum > 0) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const data = await fetchServiceComments(service.id, sortBy, pageNum);

        if (shouldRefresh || pageNum === 0) {
          setComments(data);
        } else {
          setComments((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === 10); // 10 is COMMENTS_PER_PAGE
        setPage(pageNum);
      } catch (error) {
        console.error("Error loading comments:", error);
        Alert.alert("Error", "Failed to load comments");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [service.id, sortBy],
  );

  // Load only once on first mount (cache behavior)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadComments(0);
    }
  }); // Empty deps — intentional one-time load

  // Re-load when sort changes (user explicitly changed sort)
  useEffect(() => {
    if (isFirstSortRender.current) {
      isFirstSortRender.current = false;
      return;
    }
    loadComments(0);
  }, [sortBy, loadComments]);

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    loadComments(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadComments(page + 1);
    }
  };

  const handleSortChange = (newSort: CommentSortOption) => {
    setSortBy(newSort);
    setSortDropdownVisible(false);
    setPage(0);
    setHasMore(true);
    // Reload with new sort
    setTimeout(() => loadComments(0), 100);
  };

  const handleAddComment = () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to add a comment");
      return;
    }
    setReplyingTo(null);
    setAddCommentVisible(true);
  };

  const handleReply = (comment: CommentWithDetails) => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to reply");
      return;
    }
    setReplyingTo(comment);
    setAddCommentVisible(true);
  };

  const handleCommentSubmitted = () => {
    setAddCommentVisible(false);
    setReplyingTo(null);
    handleRefresh();
  };

  const getSortLabel = () => {
    const labels = {
      newest: "Most Recent",
      oldest: "Oldest First",
      most_liked: "Most Liked",
    };
    return labels[sortBy];
  };

  const renderHeader = () => (
    <View className="bg-white">
      {/* Sort Dropdown */}
      <View className="p-4 border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setSortDropdownVisible(!sortDropdownVisible)}
          className="flex-row items-center justify-between"
        >
          <Text className="text-sm text-slate-600">Sort by:</Text>
          <View className="flex-row items-center">
            <Text className="text-sm font-semibold text-slate-900 mr-2">
              {getSortLabel()}
            </Text>
            <AntDesign
              name={sortDropdownVisible ? "up" : "down"}
              size={12}
              color="#64748b"
            />
          </View>
        </TouchableOpacity>

        {/* Dropdown Options */}
        {sortDropdownVisible && (
          <View className="mt-3 bg-slate-50 rounded-xl overflow-hidden">
            <TouchableOpacity
              onPress={() => handleSortChange("newest")}
              className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200"
            >
              <Text className="text-sm text-slate-700">Most Recent</Text>
              {sortBy === "newest" && (
                <AntDesign name="check" size={16} color="#3b82f6" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSortChange("oldest")}
              className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200"
            >
              <Text className="text-sm text-slate-700">Oldest First</Text>
              {sortBy === "oldest" && (
                <AntDesign name="check" size={16} color="#3b82f6" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSortChange("most_liked")}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <Text className="text-sm text-slate-700">Most Liked</Text>
              {sortBy === "most_liked" && (
                <AntDesign name="check" size={16} color="#3b82f6" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Comment Button */}
      <View className="p-4 border-b border-slate-200">
        <TouchableOpacity
          onPress={handleAddComment}
          className="bg-slate-100 px-4 py-3 rounded-xl flex-row items-center"
        >
          <AntDesign name="message" size={16} color="#64748b" />
          <Text className="ml-2 text-slate-600">Add a comment...</Text>
        </TouchableOpacity>
      </View>
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
        <AntDesign name="message" size={64} color="#94a3b8" />
        <Text className="mt-4 text-slate-800 font-semibold text-lg">
          No comments yet
        </Text>
        <Text className="mt-2 text-slate-600 text-center">
          Start the conversation! Be the first to comment.
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading comments...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommentItem
            comment={item}
            currentUserId={currentUserId}
            onReply={handleReply}
            onUpdate={handleRefresh}
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

      {/* Add Comment Modal */}
      <KeyboardAvoidingView>
        <AddCommentModal
          visible={addCommentVisible}
          onClose={() => {
            setAddCommentVisible(false);
            setReplyingTo(null);
          }}
          serviceId={service.id}
          onSubmit={handleCommentSubmitted}
          replyingTo={replyingTo}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
