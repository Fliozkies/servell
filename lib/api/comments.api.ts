// lib/api/comments.api.ts
import {
  CommentSortOption,
  CommentWithDetails,
  CreateCommentInput,
  UpdateCommentInput,
} from "../types/database.types";
import { sendNotification } from "./notifications.api";
import { supabase } from "./supabase";

const COMMENTS_PER_PAGE = 10;

/**
 * Fetch comments for a service with pagination and sorting
 */
export async function fetchServiceComments(
  serviceId: string,
  sortBy: CommentSortOption = "newest",
  page: number = 0,
): Promise<CommentWithDetails[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const offset = page * COMMENTS_PER_PAGE;

    // Fetch parent comments (top-level)
    let query = supabase
      .from("service_comments")
      .select(
        `
        *,
        profile:profiles(*)
      `,
      )
      .eq("service_id", serviceId)
      .is("parent_comment_id", null)
      .eq("is_deleted", false);

    // Apply sorting
    switch (sortBy) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "most_liked":
        query = query.order("like_count", { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + COMMENTS_PER_PAGE - 1);

    const { data: parentComments, error: parentError } = await query;

    if (parentError) throw parentError;
    if (!parentComments || parentComments.length === 0) return [];

    const commentIds = parentComments.map((c) => c.id);

    // Fetch replies for these parent comments
    const { data: replies, error: repliesError } = await supabase
      .from("service_comments")
      .select(
        `
        *,
        profile:profiles(*)
      `,
      )
      .in("parent_comment_id", commentIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;

    // If user is logged in, fetch their likes
    let userLikes: Set<string> = new Set();
    if (user) {
      const allCommentIds = [
        ...commentIds,
        ...(replies?.map((r) => r.id) || []),
      ];

      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", allCommentIds)
        .eq("user_id", user.id);

      userLikes = new Set(likes?.map((l) => l.comment_id) || []);
    }

    // Get service details to identify provider
    const { data: service } = await supabase
      .from("services")
      .select("user_id")
      .eq("id", serviceId)
      .single();

    const providerId = service?.user_id;

    // Map replies to parent comments
    const repliesMap = new Map<string, CommentWithDetails[]>();
    replies?.forEach((reply) => {
      const parentId = reply.parent_comment_id!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push({
        ...reply,
        user_has_liked: userLikes.has(reply.id),
        is_provider: reply.user_id === providerId,
      });
    });

    // Combine parent comments with their replies
    const commentsWithDetails: CommentWithDetails[] = parentComments.map(
      (comment) => ({
        ...comment,
        replies: repliesMap.get(comment.id) || [],
        user_has_liked: userLikes.has(comment.id),
        is_provider: comment.user_id === providerId,
      }),
    );

    return commentsWithDetails;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

/**
 * Create a new comment
 */
export async function createComment(
  input: CreateCommentInput,
): Promise<CommentWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("service_comments")
      .insert({
        service_id: input.service_id,
        user_id: user.id,
        content: input.content,
        parent_comment_id: input.parent_comment_id || null,
      })
      .select(
        `
        *,
        profile:profiles(*)
      `,
      )
      .single();

    if (error) throw error;

    // Check if user is the provider
    const { data: service } = await supabase
      .from("services")
      .select("user_id, title")
      .eq("id", input.service_id)
      .single();

    // ✅ FIX: If this is a top-level comment, notify the service owner
    if (!input.parent_comment_id && service && service.user_id !== user.id) {
      await sendNotification({
        user_id: service.user_id,
        type: "new_comment",
        title: "New Comment",
        body: `Someone commented on your service: ${service.title}`,
        data: { service_id: input.service_id, comment_id: data.id },
      });
    }

    // ✅ FIX: If this is a reply, notify the parent comment author
    if (input.parent_comment_id) {
      const { data: parentComment } = await supabase
        .from("service_comments")
        .select("user_id")
        .eq("id", input.parent_comment_id)
        .single();

      if (parentComment && parentComment.user_id !== user.id) {
        await sendNotification({
          user_id: parentComment.user_id,
          type: "comment_reply",
          title: "New Reply",
          body: `Someone replied to your comment`,
          data: {
            service_id: input.service_id,
            comment_id: data.id,
            parent_comment_id: input.parent_comment_id,
          },
        });
      }
    }

    return {
      ...data,
      user_has_liked: false,
      is_provider: data.user_id === service?.user_id,
      replies: [],
    };
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  input: UpdateCommentInput,
): Promise<CommentWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("service_comments")
      .update({ content: input.content })
      .eq("id", commentId)
      .eq("user_id", user.id)
      .select(
        `
        *,
        profile:profiles(*)
      `,
      )
      .single();

    if (error) throw error;

    return {
      ...data,
      user_has_liked: false,
      is_provider: false,
      replies: [],
    };
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

/**
 * Delete a comment (soft delete)
 */
/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("User not authenticated");

    // First, verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from("service_comments")
      .select("id, user_id, is_deleted")
      .eq("id", commentId)
      .single();

    if (fetchError) throw fetchError;
    if (!comment) throw new Error("Comment not found");
    if (comment.user_id !== user.id) throw new Error("Unauthorized");

    // Use service role client to bypass RLS for the update
    const { error } = await supabase.rpc("soft_delete_comment", {
      p_comment_id: commentId,
      p_user_id: user.id,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(commentId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if user already liked this comment
    const { data: existingLike } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("id", existingLike.id);

      if (error) throw error;
      // Don't notify when unliking
    } else {
      // Like
      const { error } = await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: user.id,
      });

      if (error) throw error;

      // ✅ FIX: Notify the comment author about the like - INCLUDE service_id
      const { data: comment } = await supabase
        .from("service_comments")
        .select("user_id, service_id, service:services(title)")
        .eq("id", commentId)
        .single();

      if (comment && comment.user_id !== user.id) {
        const serviceTitle = comment.service?.[0]?.title ?? "a service";
        await sendNotification({
          user_id: comment.user_id,
          type: "comment_like",
          title: "Comment Liked",
          body: `Someone liked your comment on ${serviceTitle}`,
          data: {
            comment_id: commentId,
            service_id: comment.service_id,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error toggling comment like:", error);
    throw error;
  }
}
