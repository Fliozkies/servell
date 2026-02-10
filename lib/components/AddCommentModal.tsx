// lib/components/AddCommentModal.tsx
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
import { createComment } from "../api/comments.api";
import { CommentWithDetails } from "../types/database.types";

type AddCommentModalProps = {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  onSubmit: () => void;
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

  useEffect(() => {
    if (!visible) {
      setContent("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Comment cannot be empty");
      return;
    }

    try {
      setSubmitting(true);

      await createComment({
        service_id: serviceId,
        content: content.trim(),
        parent_comment_id: replyingTo?.id,
      });

      onSubmit();
      handleClose();
    } catch (error: any) {
      console.error("Error submitting comment:", error);
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
    ? `${replyingTo.profile.first_name} ${
        replyingTo.profile.last_name || ""
      }`.trim()
    : "Anonymous";

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
                {replyingTo ? `Replying to @${replyingToName}` : "Add Comment"}
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
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={
                    replyingTo ? "Write your reply..." : "Write a comment..."
                  }
                  multiline
                  autoFocus
                  maxLength={500}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                  style={{ minHeight: 120, textAlignVertical: "top" }}
                />
                <Text className="text-xs text-slate-500 mt-2 text-right">
                  {content.length}/500 characters
                </Text>
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
                disabled={submitting || !content.trim()}
                className={`flex-1 ml-2 py-3 rounded-xl items-center ${
                  submitting || !content.trim() ? "bg-slate-300" : "bg-blue-500"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    className={`font-semibold ${
                      submitting || !content.trim()
                        ? "text-slate-500"
                        : "text-white"
                    }`}
                  >
                    {replyingTo ? "Post Reply" : "Post Comment"}
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
