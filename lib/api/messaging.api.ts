// lib/api/messaging.api.ts
import {
    Conversation,
    ConversationWithDetails,
    CreateConversationInput,
    Message,
    MessageWithSender,
    SendMessageInput,
} from "../types/database.types";
import { supabase } from "./supabase";

/**
 * Get or create a conversation between buyer and seller for a specific service
 */
export async function getOrCreateConversation(
  input: CreateConversationInput,
): Promise<Conversation> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("service_id", input.service_id)
      .eq("buyer_id", user.id)
      .single();

    if (existing) {
      return existing;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        service_id: input.service_id,
        buyer_id: user.id,
        seller_id: input.seller_id,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create conversation");

    return data;
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    throw error;
  }
}

/**
 * Get all conversations for the current user
 */
export async function fetchConversations(): Promise<ConversationWithDetails[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        service:services(*),
        buyer_profile:profiles!buyer_id(*),
        seller_profile:profiles!seller_id(*)
      `,
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    // Fetch last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conversation) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        return {
          ...conversation,
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        };
      }),
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}

/**
 * Get messages for a specific conversation
 */
export async function fetchMessages(
  conversationId: string,
): Promise<MessageWithSender[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender_profile:profiles!sender_id(*)
      `,
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: input.conversation_id,
        sender_id: user.id,
        content: input.content.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to send message");

    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  conversationId: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
}

/**
 * Subscribe to new messages in a conversation (realtime)
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void,
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates (realtime)
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversation: Conversation) => void,
) {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `buyer_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Conversation);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `seller_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Conversation);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
