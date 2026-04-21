-- ============================================
-- DATABASE SCHEMA CONTEXT — SERVICE APP
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- profiles: extends auth.users with user info
CREATE TABLE profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name        TEXT,
    last_name         TEXT,
    profile_image_url TEXT,
    physis_verified   BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- categories: predefined service categories
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories: Software Development, Home Repair, Cleaning, Tutoring,
-- Photography, Writing, Graphic Design, Fitness Training, Beauty Services,
-- Transportation, Others

-- services: listings posted by providers
CREATE TABLE services (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id  UUID REFERENCES categories(id),
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    price        DECIMAL(10, 2),
    image_url    TEXT,
    tags         TEXT[],
    location     TEXT NOT NULL,
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    phone_number TEXT,
    rating       DECIMAL(3, 2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- reviews: user reviews on services (one per user per service)
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    helpful_count   INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, user_id)
);

-- review_reactions: helpful/unhelpful reactions on reviews (one per user per review)
CREATE TABLE review_reactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id     UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'unhelpful')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- review_replies: service provider replies to reviews (one per review)
CREATE TABLE review_replies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 1000),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id)
);

-- service_comments: threaded comments/discussions on services
CREATE TABLE service_comments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id        UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES service_comments(id) ON DELETE CASCADE,
    content           TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 500),
    like_count        INTEGER DEFAULT 0,
    is_deleted        BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- comment_likes: likes on service comments (one per user per comment)
CREATE TABLE comment_likes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES service_comments(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- conversations: one-to-one messaging thread tied to a service (one per buyer-service pair)
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    buyer_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, buyer_id)
);

-- messages: individual messages within a conversation
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0),
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- service_subscriptions: users following service providers
CREATE TABLE service_subscriptions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subscription UNIQUE(subscriber_id, provider_id),
    CONSTRAINT chk_no_self_subscribe CHECK (subscriber_id <> provider_id)
);

-- notifications: in-app notifications per user
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN (
                 'new_message', 'new_review', 'review_reply', 'review_reaction',
                 'new_subscriber', 'service_discount', 'new_service_from_subscription',
                 'price_drop', 'broadcast', 'account_verified'
               )),
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    data       JSONB,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- KEY FUNCTIONS
-- ============================================

-- Auto-creates a profile row when a new auth user signs up
-- (pulls first_name / last_name from raw_user_meta_data)
FUNCTION handle_new_user() → TRIGGER on AFTER INSERT ON auth.users

-- Recalculates services.rating and services.review_count from reviews
FUNCTION update_service_rating() → TRIGGER on INSERT/UPDATE/DELETE ON reviews

-- Recalculates reviews.helpful_count and reviews.unhelpful_count from review_reactions
FUNCTION update_review_reaction_counts() → TRIGGER on INSERT/UPDATE/DELETE ON review_reactions

-- Recalculates service_comments.like_count from comment_likes
FUNCTION update_comment_like_count() → TRIGGER on INSERT/UPDATE/DELETE ON comment_likes

-- Updates conversations.last_message_at when a new message is sent
FUNCTION update_conversation_timestamp() → TRIGGER on AFTER INSERT ON messages

-- Keeps updated_at current on profiles, services, reviews, review_replies, service_comments
FUNCTION update_updated_at_column() → TRIGGER on BEFORE UPDATE (all above tables)

-- Soft-deletes a comment after verifying ownership
FUNCTION soft_delete_comment(p_comment_id UUID, p_user_id UUID) → VOID

-- Returns unread message counts per conversation for a given user
FUNCTION get_unread_count(user_uuid UUID) → TABLE(conversation_id UUID, unread_count BIGINT)

-- Returns total subscriber count for a provider
FUNCTION get_subscriber_count(p_provider_id UUID) → BIGINT

-- Returns whether a subscriber follows a provider
FUNCTION is_subscribed(p_subscriber_id UUID, p_provider_id UUID) → BOOLEAN

-- Returns unread notification count for a user
FUNCTION get_unread_notification_count(p_user_id UUID) → BIGINT

-- Checks whether a user has had a conversation with a service (prerequisite to review)
FUNCTION can_user_review_service(p_user_id UUID, p_service_id UUID) → BOOLEAN

-- Deletes all storage files in a user folder from a given bucket
FUNCTION delete_user_storage_folder(bucket_name TEXT, user_folder TEXT) → VOID

-- Trigger: cleans up profile-images, service-images, chat-images on profile DELETE
FUNCTION cleanup_user_storage() → TRIGGER on BEFORE DELETE ON profiles

-- Trigger: deletes a service's image from storage on service DELETE
FUNCTION cleanup_service_images() → TRIGGER on BEFORE DELETE ON services

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- profile-images  → public, 5 MB limit, JPEG/PNG/WebP/GIF
--   Path: {user_id}/{filename}
-- service-images  → public
--   Path: {user_id}/{filename}
-- chat-images     → public
--   Path: {user_id}/{filename}

-- ============================================
-- REALTIME PUBLICATIONS
-- ============================================
-- conversations, messages, notifications
