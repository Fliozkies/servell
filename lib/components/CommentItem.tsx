// lib/components/CommentItem.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { deleteComment, toggleCommentLike } from "../api/comments.api";
import { CommentWithDetails } from "../types/database.types";
import { formatDistanceToNow } from "../utils/date";
import { ProfileAvatar } from "./ui/ProfileAvatar";

type CommentItemProps = {
  comment: CommentWithDetails;
  currentUserId: string | null;
  onReply: (comment: CommentWithDetails) => void;
  onUpdate: () => void;
  highlight?: boolean;
  initiallyExpandReplies?: boolean; // ADD THIS LINE
};

/** Returns a consistent muted avatar background from initials */
// function avatarColor(name: string): string {
//   const colors = [
//     "#6366f1",
//     "#8b5cf6",
//     "#ec4899",
//     "#0ea5e9",
//     "#10b981",
//     "#f59e0b",
//     "#ef4444",
//     "#1877F2",
//   ];
//   let hash = 0;
//   for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
//   return colors[Math.abs(hash) % colors.length];
// }

export default function CommentItem({
  comment,
  currentUserId,
  onReply,
  onUpdate,
  highlight = false,
  initiallyExpandReplies = false,
}: CommentItemProps) {
  const [liking, setLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(initiallyExpandReplies);

  // Optimistic state for likes
  const [localLikeCount, setLocalLikeCount] = useState(comment.like_count);
  const [localIsLiked, setLocalIsLiked] = useState(comment.user_has_liked);

  const authorName = comment.profile?.first_name
    ? `${comment.profile.first_name} ${comment.profile.last_name || ""}`.trim()
    : "Anonymous";

  const handleLike = async () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to like comments");
      return;
    }
    if (liking) return;

    // Snapshot for rollback
    const previousLikeCount = localLikeCount;
    const previousIsLiked = localIsLiked;

    // Apply optimistically
    setLocalIsLiked(!localIsLiked);
    setLocalLikeCount(localIsLiked ? localLikeCount - 1 : localLikeCount + 1);

    try {
      setLiking(true);
      await toggleCommentLike(comment.id);
      // Success - update parent to sync with DB
      onUpdate();
    } catch (error) {
      console.error("Error liking comment:", error);
      // Rollback on error
      setLocalIsLiked(previousIsLiked);
      setLocalLikeCount(previousLikeCount);
      Alert.alert("Error", "Failed to like comment");
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(comment.id);
              onUpdate();
            } catch (error) {
              console.error("Error deleting comment:", error);
              Alert.alert("Error", "Failed to delete comment");
            }
          },
        },
      ],
    );
  };

  const isAuthor = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const replyCount = comment.replies?.length || 0;

  return (
    <View style={[styles.container, highlight && styles.containerHighlight]}>
      {/* ── Comment header ── */}
      <TouchableOpacity onPress={() => onReply(comment)}>
        <View className="flex-row items-start">
          <View className="mr-2">
            <ProfileAvatar profile={comment.profile} size={40} />
          </View>

          <View className="flex-1">
            {/* Name + badge row */}
            <View className="flex-row items-center flex-wrap">
              <Text className="text-sm font-bold text-slate-900 mr-[1px]">
                {authorName}
              </Text>
              {comment.is_provider && (
                <View className="bg-[#1877F2]/10 px-1 py-0.5 rounded-full">
                  <Text className="text-sm font-bold text-[#1877F2]">
                    Service Provider
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {formatDistanceToNow(comment.created_at)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLike}
            disabled={liking}
            className="flex-row items-center"
          >
            <AntDesign
              name={localIsLiked ? "like" : "like"}
              size={13}
              color={localIsLiked ? "#1877F2" : "#94a3b8"}
            />
            <Text
              className={`ml-1 text-xs font-semibold ${
                localIsLiked ? "text-[#1877F2]" : "text-slate-400"
              }`}
            >
              {localLikeCount}
            </Text>
          </TouchableOpacity>

          {/* Delete (own comments) */}
          {isAuthor && (
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="ml-4"
            >
              <AntDesign name="delete" size={14} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <View className="flex-row mb-2">
        {/* for offsetting */}
        <View className="w-10 mr-3" />

        {/* ── Comment body ── */}
        <Text className="text-sm text-slate-700 mt-2">{comment.content}</Text>
      </View>

      {/* ── Action row ── */}
      <View className="flex-row">
        {/* View replies */}

        {hasReplies && (
          <>
            <View className="w-10 mr-3" />

            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              className="flex-row items-center"
            >
              <AntDesign
                name={showReplies ? "up" : "down"}
                size={10}
                color="#1877F2"
              />
              <Text className="ml-1 text-sm font-semibold text-[#1877F2]">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {hasReplies && showReplies && <View className="flex-row"></View>}

      {/* ── Replies ── */}
      {hasReplies && showReplies && (
        <View className="flex-row mt-2">
          <View className="w-5 mr-3" />
          <View className="flex-1">
            {comment.replies!.map((reply) => {
              const replyAuthorName = reply.profile?.first_name
                ? `${reply.profile.first_name} ${reply.profile.last_name || ""}`.trim()
                : "Anonymous";
              const isReplyLiked = reply.user_has_liked;

              return (
                <View key={reply.id} className="mb-3">
                  <TouchableOpacity
                    onPress={() => onReply(reply)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-start">
                      <ProfileAvatar profile={reply.profile} size={32} />

                      <View className="ml-2 flex-1">
                        <View className="flex-row items-center flex-wrap">
                          <Text className="text-sm font-bold text-slate-900">
                            {replyAuthorName}
                          </Text>
                          {reply.is_provider && (
                            <View className="bg-[#1877F2]/10 px-1 py-1 rounded-full">
                              <Text className="text-sm font-bold text-[#1877F2]">
                                Service Provider
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11px] text-slate-400">
                          {formatDistanceToNow(reply.created_at)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={async () => {
                          if (!currentUserId) {
                            Alert.alert(
                              "Login Required",
                              "Please log in to like",
                            );
                            return;
                          }
                          try {
                            await toggleCommentLike(reply.id);
                            onUpdate();
                          } catch (error) {
                            console.error("Error liking reply:", error);
                          }
                        }}
                        className="flex-row items-center mt-1.5 ml-9"
                      >
                        <AntDesign
                          name={isReplyLiked ? "like" : "like"}
                          size={11}
                          color={isReplyLiked ? "#1877F2" : "#94a3b8"}
                        />
                        <Text
                          className={`ml-1 text-[10px] font-semibold ${
                            isReplyLiked ? "text-[#1877F2]" : "text-slate-400"
                          }`}
                        >
                          {reply.like_count}
                        </Text>
                      </TouchableOpacity>

                      {currentUserId === reply.user_id && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert("Delete Reply", "Are you sure?", [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await deleteComment(reply.id);
                                    onUpdate();
                                  } catch (error) {
                                    console.error(
                                      "Error deleting reply:",
                                      error,
                                    );
                                  }
                                },
                              },
                            ]);
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          className="ml-4"
                        >
                          <AntDesign name="delete" size={12} color="#cbd5e1" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Reply content */}
                  <Text className="text-sm text-slate-700 leading-5 mt-2">
                    <Text className="text-slate-400 italic">
                      @{authorName}
                      {": "}
                    </Text>
                    {reply.content}
                  </Text>

                  {/* Reply like action */}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  containerHighlight: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
});
