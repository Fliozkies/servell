// lib/components/CommentItem.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { deleteComment, toggleCommentLike } from "../api/comments.api";
import { formatDistanceToNow } from "../functions/dateUtils";
import { CommentWithDetails } from "../types/database.types";

type CommentItemProps = {
  comment: CommentWithDetails;
  currentUserId: string | null;
  onReply: (comment: CommentWithDetails) => void;
  onUpdate: () => void;
};

/** Returns a consistent muted avatar background from initials */
function avatarColor(name: string): string {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#1877F2",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

export default function CommentItem({
  comment,
  currentUserId,
  onReply,
  onUpdate,
}: CommentItemProps) {
  const [liking, setLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const authorName = comment.profile?.first_name
    ? `${comment.profile.first_name} ${comment.profile.last_name || ""}`.trim()
    : "Anonymous";

  const handleLike = async () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to like comments");
      return;
    }
    try {
      setLiking(true);
      await toggleCommentLike(comment.id);
      onUpdate();
    } catch (error) {
      console.error("Error liking comment:", error);
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
  const isLiked = comment.user_has_liked;

  return (
    <View className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
      {/* ── Comment header ── */}
      <View className="flex-row items-start">
        <View
          className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: avatarColor(authorName) }}
        >
          <Text className="text-white text-sm font-bold">
            {authorName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View className="ml-2.5 flex-1">
          {/* Name + badge row */}
          <View className="flex-row items-center flex-wrap">
            <Text className="text-sm font-bold text-slate-900 mr-1.5">
              {authorName}
            </Text>
            {comment.is_provider && (
              <View className="bg-[#1877F2]/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-[#1877F2]">
                  Provider
                </Text>
              </View>
            )}
          </View>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            {formatDistanceToNow(comment.created_at)}
          </Text>
        </View>

        {/* Delete (own comments) */}
        {isAuthor && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AntDesign name="delete" size={14} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Comment body ── */}
      <Text className="text-sm text-slate-700 leading-5 mt-2 ml-11">
        {comment.content}
      </Text>

      {/* ── Action row ── */}
      <View className="flex-row items-center mt-2.5 ml-11 gap-4">
        {/* Like */}
        <TouchableOpacity
          onPress={handleLike}
          disabled={liking}
          className="flex-row items-center"
        >
          <AntDesign
            name={isLiked ? "like" : "like"}
            size={13}
            color={isLiked ? "#1877F2" : "#94a3b8"}
          />
          <Text
            className={`ml-1 text-xs font-semibold ${
              isLiked ? "text-[#1877F2]" : "text-slate-400"
            }`}
          >
            {comment.like_count > 0 ? comment.like_count : "Like"}
          </Text>
        </TouchableOpacity>

        {/* Reply */}
        {currentUserId && (
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text className="text-xs font-semibold text-slate-400">Reply</Text>
          </TouchableOpacity>
        )}

        {/* View replies */}
        {hasReplies && (
          <TouchableOpacity
            onPress={() => setShowReplies(!showReplies)}
            className="flex-row items-center"
          >
            <AntDesign
              name={showReplies ? "up" : "down"}
              size={10}
              color="#1877F2"
            />
            <Text className="ml-1 text-xs font-semibold text-[#1877F2]">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Replies ── */}
      {hasReplies && showReplies && (
        <View className="mt-3 ml-9 pl-3 border-l-2 border-slate-100">
          {comment.replies!.map((reply) => {
            const replyAuthorName = reply.profile?.first_name
              ? `${reply.profile.first_name} ${reply.profile.last_name || ""}`.trim()
              : "Anonymous";
            const isReplyLiked = reply.user_has_liked;

            return (
              <View key={reply.id} className="mb-3">
                <View className="flex-row items-start">
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: avatarColor(replyAuthorName) }}
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {replyAuthorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View className="ml-2 flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text className="text-xs font-bold text-slate-900 mr-1.5">
                        {replyAuthorName}
                      </Text>
                      {reply.is_provider && (
                        <View className="bg-[#1877F2]/10 px-1.5 py-0.5 rounded-full">
                          <Text className="text-[9px] font-bold text-[#1877F2]">
                            Provider
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[11px] text-slate-400">
                      {formatDistanceToNow(reply.created_at)}
                    </Text>
                  </View>

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
                                console.error("Error deleting reply:", error);
                              }
                            },
                          },
                        ]);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <AntDesign name="delete" size={12} color="#cbd5e1" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Reply content */}
                <Text className="text-xs text-slate-700 leading-5 mt-1.5 ml-9">
                  <Text className="text-slate-400 italic">@{authorName} </Text>
                  {reply.content}
                </Text>

                {/* Reply like action */}
                <TouchableOpacity
                  onPress={async () => {
                    if (!currentUserId) {
                      Alert.alert("Login Required", "Please log in to like");
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
                    {reply.like_count > 0 ? reply.like_count : "Like"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
