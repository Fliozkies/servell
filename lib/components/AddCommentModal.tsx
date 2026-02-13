// lib/components/AddCommentModal.tsx
import { AntDesign, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { createComment } from "../api/comments.api";
import { CommentWithDetails } from "../types/database.types";

type AddCommentModalProps = {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  onSubmit: (newComment?: CommentWithDetails) => void;
  replyingTo?: CommentWithDetails | null;
};

export default function AddCommentModal({
  visible,
  onClose,
  serviceId,
  onSubmit,
  replyingTo,
}: AddCommentModalProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setContent("");
    } else {
      // Auto focus after sheet animates in
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      setSubmitting(true);

      // Enforce 2-level threading: if replying to a reply, use the root parent instead
      const parentId = replyingTo?.parent_comment_id
        ? replyingTo.parent_comment_id // This is a reply, use its parent (the root comment)
        : replyingTo?.id; // This is a top-level comment, use its ID directly

      const newComment = await createComment({
        service_id: serviceId,
        content: content.trim(),
        parent_comment_id: parentId,
      });

      // Pass the new comment back for optimistic UI update
      onSubmit(newComment);
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent("");
    onClose();
  };

  const replyingToName = replyingTo?.profile?.first_name
    ? `${replyingTo.profile.first_name} ${replyingTo.profile.last_name || ""}`.trim()
    : "Anonymous";

  const isReply = !!replyingTo;
  const charLimit = 500;
  const canSubmit = content.trim().length > 0 && !submitting;

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
          behavior="padding"
          style={styles.kavWrap}
          keyboardVerticalOffset={28}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[styles.headerIcon, isReply && styles.headerIconReply]}
                >
                  <Ionicons
                    name={
                      isReply ? "return-down-forward" : "chatbubble-ellipses"
                    }
                    size={16}
                    color={isReply ? "#8b5cf6" : "#3b82f6"}
                  />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isReply ? "Reply to comment" : "Add a comment"}
                  </Text>
                  {isReply && (
                    <Text style={styles.replyingToLabel}>
                      @{replyingToName}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <AntDesign name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quoted original comment (when replying) */}
            {isReply && replyingTo?.content && (
              <View style={styles.quotedComment}>
                <View style={styles.quoteLine} />
                <Text style={styles.quotedText} numberOfLines={2}>
                  {replyingTo.content}
                </Text>
              </View>
            )}

            {/* Input */}
            <View style={styles.inputSection}>
              <TextInput
                ref={inputRef}
                value={content}
                onChangeText={setContent}
                placeholder={
                  isReply
                    ? `Reply to @${replyingToName}…`
                    : "Share your thoughts…"
                }
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={charLimit}
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
                  !canSubmit && styles.submitBtnDisabled,
                  isReply && styles.submitBtnReply,
                  isReply && !canSubmit && styles.submitBtnDisabled,
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
                    {isReply ? "Post Reply" : "Post Comment"}
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdropTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  kavWrap: { maxHeight: "85%" },
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconReply: {
    backgroundColor: "#f5f3ff",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  replyingToLabel: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "600",
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  quotedComment: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    overflow: "hidden",
    padding: 10,
  },
  quoteLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#8b5cf6",
    marginRight: 10,
  },
  quotedText: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    fontStyle: "italic",
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  charCountWarn: {
    color: "#f97316",
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
  submitBtnReply: {
    backgroundColor: "#7c3aed",
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
