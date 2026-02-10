// lib/components/ReviewItem.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    createReviewReply,
    deleteReview,
    deleteReviewReply,
    toggleReviewReaction,
    updateReviewReply,
} from "../api/reviews.api";
import { formatDistanceToNow } from "../functions/dateUtils";
import { ReviewWithDetails } from "../types/database.types";

type ReviewItemProps = {
  review: ReviewWithDetails;
  currentUserId: string | null;
  isOwnService: boolean;
  serviceProviderId: string;
  onUpdate: () => void;
  onEdit?: (review: ReviewWithDetails) => void; // NEW: Callback for editing
  isUserReview?: boolean;
};

export default function ReviewItem({
  review,
  currentUserId,
  isOwnService,
  serviceProviderId,
  onUpdate,
  onEdit, // NEW
  isUserReview = false,
}: ReviewItemProps) {
  const [reacting, setReacting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState(
    review.review_reply?.content || "",
  );
  const [submittingReply, setSubmittingReply] = useState(false);

  const authorName = review.profile?.first_name
    ? `${review.profile.first_name} ${review.profile.last_name || ""}`.trim()
    : "Anonymous";

  // MODIFIED: Simplified reaction handler - just toggle helpful
  const handleReaction = async () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to react to reviews");
      return;
    }

    if (review.user_id === currentUserId) {
      Alert.alert("Not Allowed", "You cannot react to your own review");
      return;
    }

    if (isOwnService) {
      Alert.alert(
        "Not Allowed",
        "Service providers cannot react to reviews on their services",
      );
      return;
    }

    try {
      setReacting(true);
      await toggleReviewReaction(review.id, "helpful");
      onUpdate(); // This will refresh the review data
    } catch (error) {
      console.error("Error reacting to review:", error);
      Alert.alert("Error", "Failed to react to review");
    } finally {
      setReacting(false);
    }
  };

  const handleDeleteReview = () => {
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
              await deleteReview(review.id);
              Alert.alert("Success", "Review deleted successfully");
              onUpdate();
            } catch (error) {
              console.error("Error deleting review:", error);
              Alert.alert("Error", "Failed to delete review");
            }
          },
        },
      ],
    );
  };

  // NEW: Handle edit review
  const handleEditReview = () => {
    if (onEdit) {
      onEdit(review);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      Alert.alert("Error", "Reply cannot be empty");
      return;
    }

    try {
      setSubmittingReply(true);

      if (review.review_reply) {
        // Update existing reply
        await updateReviewReply(review.review_reply.id, replyContent);
      } else {
        // Create new reply
        await createReviewReply({
          review_id: review.id,
          service_id: review.service_id,
          content: replyContent,
        });
      }

      setShowReplyInput(false);
      onUpdate();
    } catch (error) {
      console.error("Error submitting reply:", error);
      Alert.alert("Error", "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = () => {
    if (!review.review_reply) return;

    Alert.alert("Delete Reply", "Are you sure you want to delete your reply?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReviewReply(review.review_reply!.id);
            onUpdate();
          } catch (error) {
            console.error("Error deleting reply:", error);
            Alert.alert("Error", "Failed to delete reply");
          }
        },
      },
    ]);
  };

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <AntDesign
            key={star}
            name="star"
            size={14}
            color={star <= rating ? "#FCC419" : "#e2e8f0"}
          />
        ))}
      </View>
    );
  };

  const canReact =
    currentUserId && currentUserId !== review.user_id && !isOwnService;
  const isReviewAuthor = currentUserId === review.user_id;
  const canReply = isOwnService && currentUserId === serviceProviderId;

  return (
    <View className="bg-white p-4 border-b border-slate-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
            <Text className="text-white text-sm font-bold">
              {authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              {authorName}
            </Text>
            <Text className="text-xs text-slate-500">
              {formatDistanceToNow(review.created_at)}
            </Text>
          </View>
        </View>
        {renderStars(review.rating)}
      </View>

      {/* Comment */}
      {review.comment && (
        <Text className="text-sm text-slate-700 leading-5 mb-3">
          {review.comment}
        </Text>
      )}

      {/* MODIFIED: Simplified Reactions - Single clickable heart */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          {canReact ? (
            <TouchableOpacity
              onPress={handleReaction}
              disabled={reacting}
              className="flex-row items-center"
            >
              <AntDesign
                name={review.user_reaction === "helpful" ? "heart" : "heart"}
                size={16}
                color={
                  review.user_reaction === "helpful" ? "#ef4444" : "#64748b"
                }
              />
              <Text
                className={`ml-1 text-sm font-medium ${
                  review.user_reaction === "helpful"
                    ? "text-red-600"
                    : "text-slate-600"
                }`}
              >
                {review.helpful_count}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center">
              <AntDesign name="heart" size={16} color="#64748b" />
              <Text className="ml-1 text-sm text-slate-600">
                {review.helpful_count}
              </Text>
            </View>
          )}
        </View>

        {/* MODIFIED: Edit and Delete buttons for review author */}
        {isReviewAuthor && (
          <View className="flex-row items-center">
            {!isUserReview && onEdit && (
              <TouchableOpacity
                onPress={handleEditReview}
                className="mr-3 px-3 py-1 rounded-full bg-blue-50"
              >
                <Text className="text-xs font-medium text-blue-600">Edit</Text>
              </TouchableOpacity>
            )}
            {!isUserReview && (
              <TouchableOpacity
                onPress={handleDeleteReview}
                className="px-3 py-1 rounded-full bg-red-50"
              >
                <Text className="text-xs font-medium text-red-600">Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Provider Reply */}
      {review.review_reply && (
        <View className="mt-3 ml-4 pl-3 border-l-2 border-blue-200 bg-blue-50 p-3 rounded-lg">
          <View className="flex-row items-center mb-1">
            <AntDesign name="tag" size={12} color="#3b82f6" />
            <Text className="ml-1 text-xs font-semibold text-blue-600">
              Provider Reply
            </Text>
            {canReply && (
              <TouchableOpacity onPress={handleDeleteReply} className="ml-auto">
                <AntDesign name="delete" size={14} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-sm text-slate-700">
            {review.review_reply.content}
          </Text>
          <Text className="text-xs text-slate-500 mt-1">
            {formatDistanceToNow(review.review_reply.created_at)}
          </Text>
        </View>
      )}

      {/* Reply Button for Provider */}
      {canReply && !review.review_reply && !showReplyInput && (
        <TouchableOpacity
          onPress={() => setShowReplyInput(true)}
          className="mt-2 ml-4"
        >
          <Text className="text-sm font-medium text-blue-600">Reply</Text>
        </TouchableOpacity>
      )}

      {/* Reply Input */}
      {canReply && showReplyInput && (
        <View className="mt-3 ml-4 pl-3 border-l-2 border-blue-200">
          <TextInput
            value={replyContent}
            onChangeText={setReplyContent}
            placeholder="Write your reply..."
            multiline
            maxLength={1000}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 mb-2"
            style={{ minHeight: 80 }}
          />
          <View className="flex-row justify-end">
            <TouchableOpacity
              onPress={() => {
                setShowReplyInput(false);
                setReplyContent(review.review_reply?.content || "");
              }}
              className="px-4 py-2 rounded-lg mr-2"
            >
              <Text className="text-sm font-medium text-slate-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmitReply}
              disabled={submittingReply}
              className="px-4 py-2 bg-blue-500 rounded-lg"
            >
              <Text className="text-sm font-medium text-white">
                {submittingReply ? "Submitting..." : "Submit Reply"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
