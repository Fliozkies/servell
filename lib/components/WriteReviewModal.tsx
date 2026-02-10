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

export default function WriteReviewModal({
  visible,
  onClose,
  serviceId,
  onSubmit,
  existingReview,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
    } else {
      setRating(0);
      setComment("");
    }
  }, [existingReview, visible]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      setSubmitting(true);

      if (existingReview) {
        await updateReview(existingReview.id, { rating, comment });
        Alert.alert("Success", "Review updated successfully!");
      } else {
        await createReview({ service_id: serviceId, rating, comment });
        Alert.alert("Success", "Review submitted successfully!");
      }

      onSubmit();
      handleClose();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalContainer}
          keyboardVerticalOffset={28}
        >
          <View
            className="bg-white rounded-t-3xl"
            style={styles.contentContainer}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-slate-900">
                {existingReview ? "Edit Review" : "Write a Review"}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <AntDesign name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Content - Wrapped in ScrollView for keyboard */}
            <ScrollView
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="p-4">
                {/* Rating */}
                <View className="mb-6">
                  <Text className="text-base font-semibold text-slate-900 mb-3">
                    How was your experience?
                  </Text>
                  <View className="flex-row justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        className="mx-2"
                      >
                        <AntDesign
                          name={star <= rating ? "star" : "star"}
                          size={36}
                          color={star <= rating ? "#FCC419" : "#cbd5e1"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Comment */}
                <View className="mb-4">
                  <Text className="text-base font-semibold text-slate-900 mb-2">
                    Share your thoughts (optional)
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Tell us about your experience..."
                    multiline
                    maxLength={500}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                    style={{ minHeight: 120, textAlignVertical: "top" }}
                  />
                  <Text className="text-xs text-slate-500 mt-1 text-right">
                    {comment.length}/500 characters
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="flex-row p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={handleClose}
                className="flex-1 mr-2 py-3 bg-white border border-gray-300 rounded-xl items-center"
              >
                <Text className="text-slate-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || rating === 0}
                className={`flex-1 ml-2 py-3 rounded-xl items-center ${
                  submitting || rating === 0 ? "bg-slate-300" : "bg-blue-500"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    className={`font-semibold ${
                      submitting || rating === 0
                        ? "text-slate-500"
                        : "text-white"
                    }`}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    maxHeight: "90%",
  },
  contentContainer: {
    maxHeight: "100%",
  },
  scrollView: {
    flexGrow: 0,
  },
});
