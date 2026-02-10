// Database type definitions for Supabase tables

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  physis_verified: boolean;
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
  phone_number: string | null;
  rating: number;
  review_count: number;
  status: "active" | "inactive" | "deleted";
  created_at: string;
  updated_at: string;
};

// Service with joined data from other tables
export type ServiceWithDetails = Service & {
  category?: Category;
  profile?: Profile;
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

// Conversation with additional details
export type ConversationWithDetails = Conversation & {
  service?: Service;
  buyer_profile?: Profile;
  seller_profile?: Profile;
  last_message?: Message;
  unread_count?: number;
};

// Message with sender details
export type MessageWithSender = Message & {
  sender_profile?: Profile;
};

// Input type for creating a conversation
export type CreateConversationInput = {
  service_id: string;
  seller_id: string;
};

// Input type for sending a message
export type SendMessageInput = {
  conversation_id: string;
  content: string;
};

// ============================================
// REVIEWS & COMMENTS TYPES
// ============================================

// Review with additional details
export type ReviewWithDetails = Review & {
  profile?: Profile;
  review_reply?: ReviewReply;
  user_reaction?: "helpful" | "unhelpful" | null;
};

// Review reaction
export type ReviewReaction = {
  id: string;
  review_id: string;
  user_id: string;
  reaction_type: "helpful" | "unhelpful";
  created_at: string;
};

// Review reply from provider
export type ReviewReply = {
  id: string;
  review_id: string;
  service_id: string;
  provider_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

// Review reply with provider details
export type ReviewReplyWithDetails = ReviewReply & {
  provider_profile?: Profile;
};

// Service comment
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

// Comment with additional details
export type CommentWithDetails = ServiceComment & {
  profile?: Profile;
  replies?: CommentWithDetails[];
  user_has_liked?: boolean;
  is_provider?: boolean;
};

// Comment like
export type CommentLike = {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
};

// Input type for creating a review
export type CreateReviewInput = {
  service_id: string;
  rating: number;
  comment?: string;
};

// Input type for updating a review
export type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

// Input type for creating a review reply
export type CreateReviewReplyInput = {
  review_id: string;
  service_id: string;
  content: string;
};

// Input type for creating a comment
export type CreateCommentInput = {
  service_id: string;
  content: string;
  parent_comment_id?: string;
};

// Input type for updating a comment
export type UpdateCommentInput = {
  content: string;
};

// Review filter options
export type ReviewFilterOptions = {
  rating?: number | null; // Filter by specific rating (1-5)
  hasReply?: boolean | null; // true = with reply, false = no reply, null = all
  sortBy:
    | "newest"
    | "oldest"
    | "most_helpful"
    | "most_critical"
    | "highest_rating"
    | "lowest_rating";
};

// Comment sort options
export type CommentSortOption = "newest" | "oldest" | "most_liked";
