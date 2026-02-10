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

export default function CommentItem({
  comment,
  currentUserId,
  onReply,
  onUpdate,
}: CommentItemProps) {
  const [liking, setLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(false); // NEW: Track if replies are visible

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

  return (
    <View className="bg-white p-4 border-b border-slate-200">
      {/* Comment Header */}
      <View className="flex-row items-start mb-2">
        <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
          <Text className="text-white text-sm font-bold">
            {authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-semibold text-slate-900">
              {authorName}
            </Text>
            {comment.is_provider && (
              <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-semibold text-blue-600">
                  Provider
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-slate-500">
            {formatDistanceToNow(comment.created_at)}
          </Text>
        </View>
      </View>

      {/* Comment Content */}
      <View className="ml-13">
        <Text className="text-sm text-slate-700 leading-5 mb-3">
          {comment.content}
        </Text>

        {/* Actions */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleLike}
            disabled={liking}
            className="flex-row items-center mr-6"
          >
            <AntDesign
              name={comment.user_has_liked ? "like" : "like"}
              size={14}
              color={comment.user_has_liked ? "#3b82f6" : "#64748b"}
            />
            <Text
              className={`ml-1 text-xs font-medium ${
                comment.user_has_liked ? "text-blue-600" : "text-slate-600"
              }`}
            >
              Like {comment.like_count > 0 && `(${comment.like_count})`}
            </Text>
          </TouchableOpacity>

          {currentUserId && (
            <TouchableOpacity onPress={() => onReply(comment)} className="mr-6">
              <Text className="text-xs font-medium text-slate-600">Reply</Text>
            </TouchableOpacity>
          )}

          {/* NEW: View Replies Button */}
          {hasReplies && (
            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              className="mr-6"
            >
              <Text className="text-xs font-medium text-blue-600">
                {showReplies ? "Hide" : "View"} {replyCount}{" "}
                {replyCount === 1 ? "Reply" : "Replies"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete button */}
          {isAuthor && (
            <TouchableOpacity onPress={handleDelete} className="ml-auto">
              <Text className="text-xs font-medium text-red-600">Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Replies - MODIFIED: Only show when showReplies is true */}
      {hasReplies && showReplies && (
        <View className="mt-4 ml-4 pl-4 border-l-2 border-slate-200">
          {comment.replies!.map((reply) => {
            const replyAuthorName = reply.profile?.first_name
              ? `${reply.profile.first_name} ${reply.profile.last_name || ""}`.trim()
              : "Anonymous";

            return (
              <View
                key={reply.id}
                className="mb-3 pb-3 border-b border-slate-100 last:border-b-0"
              >
                {/* Reply Header */}
                <View className="flex-row items-start mb-2">
                  <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {replyAuthorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="ml-2 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-xs font-semibold text-slate-900">
                        {replyAuthorName}
                      </Text>
                      {reply.is_provider && (
                        <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Text className="text-xs font-semibold text-blue-600">
                            Provider
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-slate-500">
                      {formatDistanceToNow(reply.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Reply Content - With "Replying to" prefix */}
                <View className="ml-10">
                  <Text className="text-sm text-slate-700 leading-5 mb-2">
                    <Text className="text-slate-500 italic">
                      Replying to {authorName}:{" "}
                    </Text>
                    {reply.content}
                  </Text>

                  {/* Reply Actions */}
                  <View className="flex-row items-center">
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
                      className="flex-row items-center mr-6"
                    >
                      <AntDesign
                        name={reply.user_has_liked ? "like" : "like"}
                        size={12}
                        color={reply.user_has_liked ? "#3b82f6" : "#64748b"}
                      />
                      <Text
                        className={`ml-1 text-xs ${
                          reply.user_has_liked
                            ? "text-blue-600"
                            : "text-slate-600"
                        }`}
                      >
                        Like {reply.like_count > 0 && `(${reply.like_count})`}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete button for reply author */}
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
                        className="ml-auto"
                      >
                        <Text className="text-xs font-medium text-red-600">
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
