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
