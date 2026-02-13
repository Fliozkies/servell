// lib/api/reviews.api.ts
import {
  CreateReviewInput,
  CreateReviewReplyInput,
  ReviewFilterOptions,
  ReviewReplyWithDetails,
  ReviewWithDetails,
  UpdateReviewInput,
} from "../types/database.types";
import { sendNotification } from "./notifications.api";
import { supabase } from "./supabase";

const REVIEWS_PER_PAGE = 10;

/**
 * Check if the current user can review a service
 * User must have a conversation with the service to review
 */
export async function canUserReviewService(
  serviceId: string,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc("can_user_review_service", {
      p_user_id: user.id,
      p_service_id: serviceId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return false;
  }
}

/**
 * Get user's existing review for a service (if any)
 */
export async function getUserReviewForService(
  serviceId: string,
): Promise<ReviewWithDetails | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        *,
        profile:profiles(*),
        review_reply:review_replies(*)
      `,
      )
      .eq("service_id", serviceId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No review found
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching user review:", error);
    return null;
  }
}

/**
 * Fetch reviews for a service with pagination and filtering
 */
export async function fetchServiceReviews(
  serviceId: string,
  options: ReviewFilterOptions,
  page: number = 0,
): Promise<ReviewWithDetails[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const offset = page * REVIEWS_PER_PAGE;

    // Start building query
    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        profile:profiles(*),
        review_reply:review_replies(
          *,
          provider_profile:profiles(*)
        )
      `,
      )
      .eq("service_id", serviceId);

    // Apply rating filter
    if (options.rating !== null && options.rating !== undefined) {
      query = query.eq("rating", options.rating);
    }

    // Apply reply filter
    if (options.hasReply !== null && options.hasReply !== undefined) {
      if (options.hasReply) {
        query = query.not("review_reply", "is", null);
      } else {
        query = query.is("review_reply", null);
      }
    }

    // Apply sorting
    switch (options.sortBy) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "most_helpful":
        query = query.order("helpful_count", { ascending: false });
        break;
      case "most_critical":
        query = query.order("helpful_count", { ascending: true });
        break;
      case "highest_rating":
        query = query.order("rating", { ascending: false });
        break;
      case "lowest_rating":
        query = query.order("rating", { ascending: true });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + REVIEWS_PER_PAGE - 1);

    const { data, error } = await query;

    if (error) throw error;

    // If user is logged in, fetch their reactions to these reviews
    if (user && data) {
      const reviewIds = data.map((review) => review.id);

      const { data: reactions } = await supabase
        .from("review_reactions")
        .select("review_id, reaction_type")
        .in("review_id", reviewIds)
        .eq("user_id", user.id);

      // Map reactions to reviews
      const reactionsMap = new Map(
        reactions?.map((r) => [r.review_id, r.reaction_type]) || [],
      );

      return data.map((review) => ({
        ...review,
        user_reaction: reactionsMap.get(review.id) || null,
      }));
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
}

/**
 * Create a new review
 */
export async function createReview(
  input: CreateReviewInput,
): Promise<ReviewWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if user can review
    const canReview = await canUserReviewService(input.service_id);
    if (!canReview) {
      throw new Error(
        "You must message the service provider before leaving a review",
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        service_id: input.service_id,
        user_id: user.id,
        rating: input.rating,
        comment: input.comment || null,
      })
      .select(
        `
        *,
        profile:profiles(*)
      `,
      )
      .single();

    if (error) throw error;

    // ✅ FIX: Notify the service owner about the new review
    const { data: service } = await supabase
      .from("services")
      .select("user_id, title")
      .eq("id", input.service_id)
      .single();

    if (service && service.user_id !== user.id) {
      await sendNotification({
        user_id: service.user_id,
        type: "new_review",
        title: "New Review",
        body: `Someone reviewed your service: ${service.title}`,
        data: { service_id: input.service_id, review_id: data.id },
      });
    }

    return data;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
): Promise<ReviewWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("reviews")
      .update({
        rating: input.rating,
        comment: input.comment,
      })
      .eq("id", reviewId)
      .eq("user_id", user.id)
      .select(
        `
        *,
        profile:profiles(*),
        review_reply:review_replies(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

/**
 * Add or update a reaction to a review
 */
export async function toggleReviewReaction(
  reviewId: string,
  reactionType: "helpful" | "unhelpful",
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if user already has a reaction
    const { data: existingReaction, error: fetchError } = await supabase
      .from("review_reactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no row exists

    if (fetchError) throw fetchError;

    let shouldNotify = false;

    if (existingReaction) {
      // If same reaction, remove it (toggle off)
      if (existingReaction.reaction_type === reactionType) {
        const { error } = await supabase
          .from("review_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (error) throw error;
        // Don't notify when removing a reaction
      } else {
        // Different reaction type - delete old and insert new
        // This avoids potential unique constraint issues with UPDATE
        const { error: deleteError } = await supabase
          .from("review_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from("review_reactions")
          .insert({
            review_id: reviewId,
            user_id: user.id,
            reaction_type: reactionType,
          });

        if (insertError) throw insertError;
        shouldNotify = true;
      }
    } else {
      // Create new reaction
      const { error } = await supabase.from("review_reactions").insert({
        review_id: reviewId,
        user_id: user.id,
        reaction_type: reactionType,
      });

      if (error) throw error;
      shouldNotify = true;
    }

    // ✅ FIX: Notify the review author about the reaction - INCLUDE service_id
    if (shouldNotify) {
      const { data: review } = await supabase
        .from("reviews")
        .select("user_id, service_id, service:services(title)")
        .eq("id", reviewId)
        .single();

      if (review && review.user_id !== user.id) {
        const serviceTitle = review.service?.[0]?.title ?? "a service";
        const reactionText =
          reactionType === "helpful" ? "helpful" : "unhelpful";
        await sendNotification({
          user_id: review.user_id,
          type: "review_reaction",
          title: "Review Reaction",
          body: `Someone marked your review on ${serviceTitle} as ${reactionText}`,
          data: {
            review_id: reviewId,
            service_id: review.service_id,
            reaction_type: reactionType,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error toggling review reaction:", error);
    throw error;
  }
}

/**
 * Create a reply to a review (provider only)
 */
export async function createReviewReply(
  input: CreateReviewReplyInput,
): Promise<ReviewReplyWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("review_replies")
      .insert({
        review_id: input.review_id,
        service_id: input.service_id,
        provider_id: user.id,
        content: input.content,
      })
      .select(
        `
        *,
        provider_profile:profiles(*)
      `,
      )
      .single();

    if (error) throw error;

    // ✅ FIX: Notify the reviewer about the provider's reply
    const { data: review } = await supabase
      .from("reviews")
      .select("user_id, service:services(title)")
      .eq("id", input.review_id)
      .single();

    if (review && review.user_id !== user.id) {
      const serviceTitle = review.service?.[0]?.title ?? "your review";
      await sendNotification({
        user_id: review.user_id,
        type: "review_reply",
        title: "Provider Replied",
        body: `The provider replied to your review on ${serviceTitle}`,
        data: {
          service_id: input.service_id,
          review_id: input.review_id,
          reply_id: data.id,
        },
      });
    }

    return data;
  } catch (error) {
    console.error("Error creating review reply:", error);
    throw error;
  }
}

/**
 * Update a review reply
 */
export async function updateReviewReply(
  replyId: string,
  content: string,
): Promise<ReviewReplyWithDetails> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("review_replies")
      .update({ content })
      .eq("id", replyId)
      .eq("provider_id", user.id)
      .select(
        `
        *,
        provider_profile:profiles(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating review reply:", error);
    throw error;
  }
}

/**
 * Delete a review reply
 */
export async function deleteReviewReply(replyId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("review_replies")
      .delete()
      .eq("id", replyId)
      .eq("provider_id", user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting review reply:", error);
    throw error;
  }
}
