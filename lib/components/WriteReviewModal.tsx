// lib/components/WriteReviewModal.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { createReview, updateReview } from "../api/reviews.api";
import { ReviewWithDetails } from "../types/database.types";

type WriteReviewModalProps = {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  onSubmit: () => void;
  existingReview?: ReviewWithDetails | null;
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function WriteReviewModal({
  visible,
  onClose,
  serviceId,
  onSubmit,
  existingReview,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0); // For star hover effect
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (existingReview) {
        setRating(existingReview.rating);
        setComment(existingReview.comment || "");
      } else {
        setRating(0);
        setComment("");
      }
      setHovered(0);
    }
  }, [existingReview, visible]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(
        "Rating Required",
        "Please select a star rating before submitting.",
      );
      return;
    }
    try {
      setSubmitting(true);
      if (existingReview) {
        await updateReview(existingReview.id, { rating, comment });
      } else {
        await createReview({ service_id: serviceId, rating, comment });
      }
      onSubmit();
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHovered(0);
    setComment("");
    onClose();
  };

  const displayRating = hovered || rating;
  const canSubmit = rating > 0 && !submitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior="position"
          style={styles.kavWrap}
          keyboardVerticalOffset={22}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {existingReview ? "Edit Your Review" : "Write a Review"}
                </Text>
                <Text style={styles.headerSub}>
                  Your feedback helps others decide
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <AntDesign name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Star Rating */}
              <View style={styles.ratingSection}>
                <Text style={styles.sectionLabel}>How would you rate it?</Text>

                {/* Stars */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => {
                        setRating(star);
                        setHovered(0);
                      }}
                      onPressIn={() => setHovered(star)}
                      onPressOut={() => setHovered(0)}
                      activeOpacity={0.8}
                      style={styles.starBtn}
                    >
                      <AntDesign
                        name="star"
                        size={40}
                        color={star <= displayRating ? "#FCC419" : "#e2e8f0"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rating label */}
                <View style={styles.ratingLabelWrap}>
                  {displayRating > 0 ? (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>
                        {STAR_LABELS[displayRating]}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.ratingHint}>Tap a star to rate</Text>
                  )}
                </View>
              </View>

              {/* Comment */}
              <View style={styles.commentSection}>
                <View style={styles.commentLabelRow}>
                  <Text style={styles.sectionLabel}>Your thoughts</Text>
                  <Text style={styles.optional}>Optional</Text>
                </View>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Tell others about your experience with this service…"
                  multiline
                  maxLength={500}
                  style={styles.commentInput}
                  placeholderTextColor="#94a3b8"
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{comment.length} / 500</Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={[
                  styles.submitBtn,
                  !canSubmit && styles.submitBtnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.submitText,
                      !canSubmit && styles.submitTextDisabled,
                    ]}
                  >
                    {existingReview ? "Update Review" : "Submit Review"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  backdropTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  kavWrap: { maxHeight: "92%" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  ratingSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabelWrap: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    backgroundColor: "#fef9c3",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
  },
  ratingHint: {
    fontSize: 13,
    color: "#94a3b8",
  },
  commentSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  commentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  optional: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  commentInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 110,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 6,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#e2e8f0",
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  submitTextDisabled: {
    color: "#94a3b8",
  },
});
