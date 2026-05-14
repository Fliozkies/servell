// lib/components/ReviewItem.tsx
import { AntDesign } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  deleteReview,
  deleteReviewReply,
  toggleReviewReaction,
} from "../api/reviews.api";
import { ReviewWithDetails } from "../types/database.types";
import { formatDistanceToNow } from "../utils/date";
import AddCommentModal from "./AddCommentModal";
import { ProfileAvatar } from "./ui/ProfileAvatar";

type ReviewItemProps = {
  review: ReviewWithDetails;
  currentUserId: string | null;
  isOwnService: boolean;
  serviceProviderId: string;
  onUpdate: () => void;
  onEdit?: (review: ReviewWithDetails) => void;
  isUserReview?: boolean;
  /** When true, Edit/Delete buttons are hidden — managed by the parent */
  hideActions?: boolean;
  highlight?: boolean;
};

export default function ReviewItem({
  review,
  currentUserId,
  isOwnService,
  serviceProviderId,
  onUpdate,
  onEdit,
  isUserReview = false,
  hideActions = false,
  highlight = false,
}: ReviewItemProps) {
  // Optimistic local state for reactions — no full reload on tap
  const [localReaction, setLocalReaction] = useState<
    "helpful" | "unhelpful" | null
  >(review.user_reaction ?? null);
  const [localHelpfulCount, setLocalHelpfulCount] = useState(
    review.helpful_count ?? 0,
  );
  const [localUnhelpfulCount, setLocalUnhelpfulCount] = useState(
    review.unhelpful_count ?? 0,
  );
  const [reacting, setReacting] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);

  const authorName = review.profile?.first_name
    ? `${review.profile.first_name} ${review.profile.last_name || ""}`.trim()
    : "Anonymous";

  const authorId = review.profile?.id ?? review.user_id;

  const handleAuthorPress = () => {
    if (!authorId) return;
    router.push(`/profile/${authorId}`);
  };

  // Optimistic reaction toggle — updates UI instantly, syncs DB in background
  const handleReaction = async (type: "helpful" | "unhelpful") => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to react to reviews");
      return;
    }
    if (review.user_id === currentUserId) {
      Alert.alert("Not Allowed", "You cannot react to your own review");
      return;
    }
    if (isOwnService) {
      Alert.alert("Not Allowed", "Service providers cannot react to reviews");
      return;
    }
    if (reacting) return;

    // Snapshot for rollback
    const previousReaction = localReaction;
    const previousHelpful = localHelpfulCount;
    const previousUnhelpful = localUnhelpfulCount;

    // Apply optimistically
    const isSameReaction = localReaction === type;
    if (isSameReaction) {
      // Toggle off
      setLocalReaction(null);
      if (type === "helpful") setLocalHelpfulCount((c) => Math.max(0, c - 1));
      else setLocalUnhelpfulCount((c) => Math.max(0, c - 1));
    } else {
      // Remove previous reaction count if any
      if (localReaction === "helpful")
        setLocalHelpfulCount((c) => Math.max(0, c - 1));
      if (localReaction === "unhelpful")
        setLocalUnhelpfulCount((c) => Math.max(0, c - 1));
      // Apply new reaction
      setLocalReaction(type);
      if (type === "helpful") setLocalHelpfulCount((c) => c + 1);
      else setLocalUnhelpfulCount((c) => c + 1);
    }

    try {
      setReacting(true);
      await toggleReviewReaction(review.id, type);
    } catch (error) {
      // Rollback on failure
      setLocalReaction(previousReaction);
      setLocalHelpfulCount(previousHelpful);
      setLocalUnhelpfulCount(previousUnhelpful);
      Alert.alert("Error", "Failed to react. Please try again.");
      console.log("Error: " + error);
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
              onUpdate();
            } catch (error) {
              Alert.alert("Error", "Failed to delete review");
              console.log("Error: " + error);
            }
          },
        },
      ],
    );
  };

  const handleEditReview = () => {
    if (onEdit) onEdit(review);
  };

  const handleDeleteReply = () => {
    if (!review.review_reply) return;
    Alert.alert("Delete Reply", "Delete your reply?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReviewReply(review.review_reply!.id);
            onUpdate();
          } catch (error) {
            Alert.alert("Error", "Failed to delete reply");
            console.log("Error: " + error);
          }
        },
      },
    ]);
  };

  const renderStars = (rating: number) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <AntDesign
          key={star}
          name="star"
          size={13}
          color={star <= rating ? "#FCC419" : "#e2e8f0"}
        />
      ))}
    </View>
  );

  const canReact = !!(
    currentUserId &&
    currentUserId !== review.user_id &&
    !isOwnService
  );
  const isReviewAuthor = currentUserId === review.user_id;
  const canReply = isOwnService && currentUserId === serviceProviderId;

  return (
    <View style={[styles.container, highlight && styles.containerHighlight]}>
      {/* Header — author avatar + name are tappable to view their profile */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleAuthorPress}
          activeOpacity={0.7}
          style={styles.authorTouchable}
        >
          <ProfileAvatar profile={review.profile} size={40} />
          <View style={styles.headerMeta}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(review.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        {renderStars(review.rating)}
      </View>

      {/* Comment */}
      {review.comment ? (
        <Text style={styles.commentText}>{review.comment}</Text>
      ) : null}

      {/* Reactions row */}
      <View style={styles.reactionsRow}>
        {/* ❤️ Helpful */}
        <TouchableOpacity
          onPress={() => handleReaction("helpful")}
          disabled={reacting || !canReact}
          activeOpacity={canReact ? 0.7 : 1}
          style={[
            styles.reactionBtn,
            localReaction === "helpful" && styles.reactionBtnActiveHelpful,
          ]}
        >
          <AntDesign
            name="heart"
            size={14}
            color={localReaction === "helpful" ? "#ef4444" : "#94a3b8"}
          />
          <Text
            style={[
              styles.reactionCount,
              localReaction === "helpful" && styles.reactionCountHelpful,
            ]}
          >
            {localHelpfulCount}
          </Text>
        </TouchableOpacity>

        {/* 💔 Unhelpful */}
        <TouchableOpacity
          onPress={() => handleReaction("unhelpful")}
          disabled={reacting || !canReact}
          activeOpacity={canReact ? 0.7 : 1}
          style={[
            styles.reactionBtn,
            localReaction === "unhelpful" && styles.reactionBtnActiveUnhelpful,
          ]}
        >
          <MaterialCommunityIcons
            name="heart-broken"
            size={14}
            color={localReaction === "unhelpful" ? "#6366f1" : "#94a3b8"}
          />
          <Text
            style={[
              styles.reactionCount,
              localReaction === "unhelpful" && styles.reactionCountUnhelpful,
            ]}
          >
            {localUnhelpfulCount}
          </Text>
        </TouchableOpacity>

        {/* Edit/Delete inside card — only if not managed externally by parent */}
        {isReviewAuthor && !hideActions && (
          <View style={styles.actionBtns}>
            {onEdit && (
              <TouchableOpacity
                onPress={handleEditReview}
                style={styles.editBtn}
              >
                <AntDesign name="edit" size={12} color="#3b82f6" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleDeleteReview}
              style={styles.deleteBtn}
            >
              <AntDesign name="delete" size={12} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Provider Reply bubble */}
      {review.review_reply && (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <AntDesign name="tag" size={11} color="#3b82f6" />
            <Text style={styles.replyLabel}>Provider Reply</Text>
            {canReply && (
              <TouchableOpacity
                onPress={handleDeleteReply}
                style={{ marginLeft: "auto" }}
              >
                <AntDesign name="delete" size={13} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.replyText}>{review.review_reply.content}</Text>
          <Text style={styles.replyTime}>
            {formatDistanceToNow(review.review_reply.created_at)}
          </Text>
        </View>
      )}

      {/* Reply trigger */}
      {canReply && (
        <TouchableOpacity
          onPress={() => setReplyModalVisible(true)}
          style={styles.replyTrigger}
        >
          <AntDesign name="message" size={13} color="#3b82f6" />
          <Text style={styles.replyTriggerText}>
            {review.review_reply ? "Edit Reply" : "Reply"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Reply modal — reuses AddCommentModal with replyToReview prop */}
      <AddCommentModal
        visible={replyModalVisible}
        onClose={() => setReplyModalVisible(false)}
        serviceId={review.service_id}
        replyToReview={review}
        onSubmit={() => {
          setReplyModalVisible(false);
          onUpdate();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  // Wraps avatar + name/timestamp to make them jointly tappable
  authorTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerMeta: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  timestamp: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  starsRow: { flexDirection: "row", gap: 2 },
  commentText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginBottom: 10,
  },
  reactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  reactionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reactionBtnActiveHelpful: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  reactionBtnActiveUnhelpful: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  reactionCount: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  reactionCountHelpful: { color: "#ef4444" },
  reactionCountUnhelpful: { color: "#6366f1" },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  editBtnText: { fontSize: 11, fontWeight: "600", color: "#3b82f6" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  deleteBtnText: { fontSize: 11, fontWeight: "600", color: "#ef4444" },
  replyBox: {
    marginTop: 10,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 10,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  replyLabel: { fontSize: 11, fontWeight: "700", color: "#3b82f6" },
  replyText: { fontSize: 13, color: "#334155", lineHeight: 18 },
  replyTime: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  replyTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginLeft: 12,
  },
  replyTriggerText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  containerHighlight: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
});
