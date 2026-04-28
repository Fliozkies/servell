// lib/components/AddCommentModal.tsx
//
// Reused for:
//  - Adding/replying to comments (Comments tab)
//  - Provider replying to a review (Reviews tab) via replyToReview prop
import { AntDesign, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createComment } from "../api/comments.api";
import { createReviewReply, updateReviewReply } from "../api/reviews.api";
import { CommentWithDetails, ReviewWithDetails } from "../types/database.types";

type AddCommentModalProps = {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  onSubmit: (newComment?: CommentWithDetails) => void;
  /** For comment replies */
  replyingTo?: CommentWithDetails | null;
  /** For provider replying to a review — mutually exclusive with replyingTo */
  replyToReview?: ReviewWithDetails | null;
};

export default function AddCommentModal({
  visible,
  onClose,
  serviceId,
  onSubmit,
  replyingTo,
  replyToReview,
}: AddCommentModalProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const isReviewReply = !!replyToReview;
  const isCommentReply = !!replyingTo;
  const charLimit = isReviewReply ? 1000 : 500;

  useEffect(() => {
    if (visible) {
      // Pre-fill with existing review reply content if editing
      if (isReviewReply && replyToReview?.review_reply?.content) {
        setContent(replyToReview.review_reply.content);
      } else {
        setContent("");
      }
      setModalVisible(true);
      slideAnim.setValue(0);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          bounciness: 4,
          speed: 14,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible, isReviewReply, replyToReview, slideAnim, backdropOpacity]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      setSubmitting(true);

      if (isReviewReply && replyToReview) {
        // Provider replying to a review
        if (replyToReview.review_reply) {
          await updateReviewReply(
            replyToReview.review_reply.id,
            content.trim(),
          );
        } else {
          await createReviewReply({
            review_id: replyToReview.id,
            service_id: serviceId,
            content: content.trim(),
          });
        }
        onSubmit();
      } else {
        // Regular comment or comment reply
        const parentId = replyingTo?.parent_comment_id
          ? replyingTo.parent_comment_id
          : replyingTo?.id;

        const newComment = await createComment({
          service_id: serviceId,
          content: content.trim(),
          parent_comment_id: parentId,
        });
        onSubmit(newComment);
      }

      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent("");
    onClose();
  };

  const canSubmit = content.trim().length > 0 && !submitting;

  // ── Header labels ──────────────────────────────────────────────────────────
  let headerIcon: "return-down-forward" | "chatbubble-ellipses" | "create" =
    "chatbubble-ellipses";
  let headerIconColor = "#3b82f6";
  let headerTitle = "Add a Comment";
  let headerSubtitle: string | null = null;
  let quotedText: string | null = null;

  if (isReviewReply && replyToReview) {
    headerIcon = "create";
    headerIconColor = "#10b981";
    headerTitle = replyToReview.review_reply
      ? "Edit Your Reply"
      : "Reply to Review";
    const reviewerName = replyToReview.profile?.first_name
      ? `${replyToReview.profile.first_name} ${replyToReview.profile.last_name || ""}`.trim()
      : "Anonymous";
    headerSubtitle = `Replying to ${reviewerName}`;
    quotedText = replyToReview.comment || null;
  } else if (isCommentReply && replyingTo) {
    headerIcon = "return-down-forward";
    headerIconColor = "#8b5cf6";
    headerTitle = "Reply";
    const replyName = replyingTo.profile?.first_name
      ? `${replyingTo.profile.first_name} ${replyingTo.profile.last_name || ""}`.trim()
      : "Anonymous";
    headerSubtitle = `Replying to ${replyName}`;
    quotedText = replyingTo.content;
  }

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* Fixed backdrop — never moves, only fades */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.45)", opacity: backdropOpacity },
        ]}
        pointerEvents="none"
      />
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* KeyboardAvoidingView wraps the whole bottom area so the sheet lifts with keyboard */}
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.kavOuter}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerIcon,
                    { backgroundColor: `${headerIconColor}18` },
                  ]}
                >
                  <Ionicons
                    name={headerIcon}
                    size={16}
                    color={headerIconColor}
                  />
                </View>
                <View>
                  <Text style={styles.headerTitle}>{headerTitle}</Text>
                  {headerSubtitle && (
                    <Text
                      style={[
                        styles.replyingToLabel,
                        { color: headerIconColor },
                      ]}
                    >
                      {headerSubtitle}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <AntDesign name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quoted text */}
            {quotedText && (
              <View style={styles.quotedComment}>
                <View
                  style={[
                    styles.quoteLine,
                    { backgroundColor: headerIconColor },
                  ]}
                />
                <Text style={styles.quotedText} numberOfLines={2}>
                  {quotedText}
                </Text>
              </View>
            )}

            {/* Input */}
            <View style={styles.inputSection}>
              <TextInput
                ref={inputRef}
                value={content}
                onChangeText={(t) => {
                  if (t.length <= charLimit) setContent(t);
                }}
                placeholder={
                  isReviewReply
                    ? "Write your reply to this review…"
                    : isCommentReply
                      ? "Write your reply…"
                      : "Write a comment…"
                }
                placeholderTextColor="#94a3b8"
                multiline
                style={styles.input}
                textAlignVertical="top"
              />
              <Text
                style={[
                  styles.charCount,
                  content.length > charLimit * 0.9 && styles.charCountWarn,
                ]}
              >
                {content.length} / {charLimit}
              </Text>
            </View>

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
                  { backgroundColor: canSubmit ? headerIconColor : "#e2e8f0" },
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
                    {isReviewReply
                      ? replyToReview?.review_reply
                        ? "Update Reply"
                        : "Post Reply"
                      : isCommentReply
                        ? "Post Reply"
                        : "Post Comment"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
  },
  sheetContainer: {
    // KAV owns the bottom positioning now
  },
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  replyingToLabel: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  quotedComment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
  },
  quoteLine: { width: 3, borderRadius: 2, alignSelf: "stretch", minHeight: 20 },
  quotedText: { flex: 1, fontSize: 12, color: "#64748b", lineHeight: 17 },
  inputSection: { paddingHorizontal: 16, paddingVertical: 12 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 6,
  },
  charCountWarn: { color: "#ef4444" },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 12,
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
  cancelText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  submitText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  submitTextDisabled: { color: "#94a3b8" },
});
