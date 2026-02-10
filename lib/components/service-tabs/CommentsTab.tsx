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

  const renderHeader = () => (
    <View className="bg-white border-b border-slate-100">
      {/* Add Comment bar */}
      <TouchableOpacity
        onPress={handleAddComment}
        activeOpacity={0.75}
        className="mx-4 mt-4 mb-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center"
      >
        <View className="w-7 h-7 rounded-full bg-[#1877F2] items-center justify-center mr-3">
          <AntDesign name="plus" size={14} color="#fff" />
        </View>
        <Text className="text-sm text-slate-400 flex-1">
          Share your thoughts...
        </Text>
      </TouchableOpacity>

      {/* Sort pills */}
      <View className="flex-row px-4 pb-3 gap-2">
        {(["newest", "oldest", "most_liked"] as const).map((option) => {
          const labels = {
            newest: "Recent",
            oldest: "Oldest",
            most_liked: "Top",
          };
          const isActive = sortBy === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => handleSortChange(option)}
              className={`px-3 py-1.5 rounded-full border ${
                isActive
                  ? "bg-[#1877F2] border-[#1877F2]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-white" : "text-slate-500"
                }`}
              >
                {labels[option]}
              </Text>
            </TouchableOpacity>
          );
        })}
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
