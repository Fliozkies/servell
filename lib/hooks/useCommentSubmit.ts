import { useState } from "react";
import { Alert } from "react-native";
import { createComment } from "../api/comments.api";
import { createReviewReply, updateReviewReply } from "../api/reviews.api";
import { CommentWithDetails, ReviewWithDetails } from "../types/database.types";

type SubmissionType = {
  serviceId: string;
  // comment / comment reply
  replyingTo?: CommentWithDetails | null;
  // review reply
  replyToReview?: ReviewWithDetails | null;
};

export function useCommentSubmit() {
  const [submitting, setSubmitting] = useState(false);

  const submit = async ({
    serviceId,
    replyingTo,
    replyToReview,
    content,
  }: SubmissionType & { content: string }) => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      if (replyToReview) {
        // Provider replying to a review
        if (replyToReview.review_reply) {
          await updateReviewReply(replyToReview.review_reply.id, content.trim());
        } else {
          await createReviewReply({
            review_id: replyToReview.id,
            service_id: serviceId,
            content: content.trim(),
          });
        }
        return null; // no new CommentWithDetails returned
      } else {
        // Regular comment or reply to comment
        const parentId = replyingTo?.parent_comment_id
          ? replyingTo.parent_comment_id
          : replyingTo?.id;
        const newComment = await createComment({
          service_id: serviceId,
          content: content.trim(),
          parent_comment_id: parentId,
        });
        return newComment;
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit");
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}