// Database type definitions for Supabase tables

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  physis_verified: boolean;
  /** Display string from Google Places (e.g. "Digos City, Davao del Sur") */
  location_text: string | null;
  /** Geocoded latitude from registration location picker */
  location_lat: number | null;
  /** Geocoded longitude from registration location picker */
  location_lng: number | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  created_at: string;
};

export type Service = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  phone_number: string | null;
  rating: number;
  review_count: number;
  status: "active" | "inactive" | "deleted";
  /** Non-null and in the future = this service is actively boosted/featured */
  boosted_until: string | null;
  /** Boost tier — reserved for future pricing tiers */
  boost_tier: "standard" | "premium" | null;
  created_at: string;
  updated_at: string;
};

// Service with joined data from other tables
export type ServiceWithDetails = Service & {
  category?: Category;
  profile?: Profile;
  _distanceKm?: number | null; // computed client-side when sorting by nearest
  _editorsScore?: number | null; // computed client-side for Editor's Pick ranking
};

export type Review = {
  id: string;
  service_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  updated_at: string;
};

// Input type for creating a new service
export type CreateServiceInput = {
  title: string;
  description: string;
  price?: number;
  image_url?: string;
  category_id: string;
  tags?: string[];
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  phone_number?: string;
};

// Input type for updating a service
export type UpdateServiceInput = Partial<CreateServiceInput> & {
  status?: "active" | "inactive" | "deleted";
};

// ============================================
// MESSAGING TYPES
// ============================================

export type Conversation = {
  id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationWithDetails = Conversation & {
  service?: Service;
  buyer_profile?: Profile;
  seller_profile?: Profile;
  last_message?: Message;
  unread_count?: number;
};

export type MessageWithSender = Message & {
  sender_profile?: Profile;
};

export type CreateConversationInput = {
  service_id: string;
  seller_id: string;
};

export type SendMessageInput = {
  conversation_id: string;
  content: string;
};

// ============================================
// REVIEWS & COMMENTS TYPES
// ============================================

export type ReviewWithDetails = Review & {
  profile?: Profile;
  review_reply?: ReviewReply;
  user_reaction?: "helpful" | "unhelpful" | null;
};

export type ReviewReaction = {
  id: string;
  review_id: string;
  user_id: string;
  reaction_type: "helpful" | "unhelpful";
  created_at: string;
};

export type ReviewReply = {
  id: string;
  review_id: string;
  service_id: string;
  provider_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ReviewReplyWithDetails = ReviewReply & {
  provider_profile?: Profile;
};

export type ServiceComment = {
  id: string;
  service_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type CommentWithDetails = ServiceComment & {
  profile?: Profile;
  replies?: CommentWithDetails[];
  user_has_liked?: boolean;
  is_provider?: boolean;
};

export type CommentLike = {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
};

export type CreateReviewInput = {
  service_id: string;
  rating: number;
  comment?: string;
};

export type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

export type CreateReviewReplyInput = {
  review_id: string;
  service_id: string;
  content: string;
};

export type CreateCommentInput = {
  service_id: string;
  content: string;
  parent_comment_id?: string;
};

export type UpdateCommentInput = {
  content: string;
};

export type ReviewFilterOptions = {
  rating?: number | null;
  hasReply?: boolean | null;
  sortBy:
    | "newest"
    | "oldest"
    | "most_helpful"
    | "most_critical"
    | "highest_rating"
    | "lowest_rating";
};

export type CommentSortOption = "newest" | "oldest" | "most_liked";

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType =
  | "new_message"
  | "new_review"
  | "review_reply"
  | "review_reaction"
  | "new_subscriber"
  | "service_discount"
  | "new_service_from_subscription"
  | "price_drop"
  | "broadcast"
  | "account_verified"
  | "new_comment"
  | "comment_reply"
  | "comment_like";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
};

// ============================================================
// SUBSCRIPTION TYPES
// ============================================================

export type ServiceSubscription = {
  id: string;
  subscriber_id: string;
  provider_id: string;
  created_at: string;
};

export type ServiceSubscriptionWithProfile = ServiceSubscription & {
  provider_profile?: Profile;
  subscriber_profile?: Profile;
};

export type CreateNotificationInput = {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
};
