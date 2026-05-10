I ran these SQLs in order.

1.  -- ============================================================
    -- Service Marketplace App — Full Schema
    -- Supabase / PostgreSQL
    -- ============================================================
    -- Changes from previous version:
    -- • bio TEXT added to profiles
    -- • messages RLS: only recipient can mark is_read (not sender)
    -- • messages: added indexes for chat pagination + unread queries
    -- • conversations: last_message_at defaults to NOW() (not NULL)
    -- • Realtime policies simplified — no subquery joins in USING clause
    -- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles (extends auth.users)
CREATE TABLE public.profiles (
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
first_name TEXT,
last_name TEXT,
bio TEXT,
physis_verified BOOLEAN NOT NULL DEFAULT FALSE,
profile_image_url TEXT,
location_text TEXT,
location_lat DOUBLE PRECISION,
location_lng DOUBLE PRECISION,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE public.categories (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name TEXT UNIQUE NOT NULL,
description TEXT,
icon_name TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- services
CREATE TABLE public.services (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
title TEXT NOT NULL,
description TEXT NOT NULL,
price DECIMAL(10,2),
image_url TEXT,
category_id UUID REFERENCES public.categories(id),
tags TEXT[],
location TEXT NOT NULL,
phone_number TEXT,
rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
review_count INT NOT NULL DEFAULT 0,
status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'inactive', 'deleted')),
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,
boosted_until TIMESTAMPTZ,
boost_tier TEXT CHECK (boost_tier IN ('standard', 'premium')),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_user_id ON public.services (user_id);
CREATE INDEX idx_services_category_id ON public.services (category_id);
CREATE INDEX idx_services_status ON public.services (status);
CREATE INDEX idx_services_created_at ON public.services (created_at DESC);
CREATE INDEX idx_services_boosted ON public.services (boosted_until)
WHERE boosted_until IS NOT NULL;

-- reviews
CREATE TABLE public.reviews (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
comment TEXT,
helpful_count INT NOT NULL DEFAULT 0,
unhelpful_count INT NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (service_id, user_id)
);

-- review_reactions
CREATE TABLE public.review_reactions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'unhelpful')),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (review_id, user_id)
);

-- review_replies
CREATE TABLE public.review_replies (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
review_id UUID NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
content TEXT NOT NULL CHECK (char_length(content) <= 1000),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- service_comments
CREATE TABLE public.service_comments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
parent_comment_id UUID REFERENCES public.service_comments(id) ON DELETE CASCADE,
content TEXT NOT NULL CHECK (char_length(content) <= 500),
like_count INT NOT NULL DEFAULT 0,
is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- comment_likes
CREATE TABLE public.comment_likes (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
comment_id UUID NOT NULL REFERENCES public.service_comments(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (comment_id, user_id)
);

-- conversations
-- FIX: last_message_at defaults to NOW() so ordering never breaks
-- on a fresh conversation before the first message arrives.
CREATE TABLE public.conversations (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (service_id, buyer_id)
);

-- messages
-- FIX: (conversation_id, created_at) index — essential for chat pagination
-- FIX: partial index on is_read=FALSE — used by unread count queries
CREATE TABLE public.messages (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
content TEXT NOT NULL CHECK (trim(content) <> ''),
is_read BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_created
ON public.messages (conversation_id, created_at ASC);

CREATE INDEX idx_messages_unread
ON public.messages (conversation_id, sender_id)
WHERE is_read = FALSE;

-- service_subscriptions
-- This is the canonical subscriptions table.
-- "Following" / "Unfollow" labels in the UI should be replaced with
-- "Subscriptions" / "Unsubscribe" to match this schema's terminology.
CREATE TABLE public.service_subscriptions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
subscriber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (subscriber_id, provider_id),
CHECK (subscriber_id <> provider_id)
);

-- notifications
CREATE TABLE public.notifications (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
type TEXT NOT NULL CHECK (type IN (
'new_message',
'new_review',
'review_reply',
'review_reaction',
'new_subscriber',
'service_discount',
'new_service_from_subscription',
'price_drop',
'broadcast',
'account_verified'
)),
title TEXT NOT NULL,
body TEXT NOT NULL,
data JSONB,
is_read BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- ── Generic updated_at ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;

$$
;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_review_replies_updated_at
  BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_service_comments_updated_at
  BEFORE UPDATE ON public.service_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── handle_new_user ──────────────────────────────────────────
-- Creates a profile row when a new auth.users row is inserted.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$

BEGIN
INSERT INTO public.profiles (
id,
first_name,
last_name,
location_text,
location_lat,
location_lng
) VALUES (
NEW.id,
NEW.raw_user_meta_data ->> 'first_name',
NEW.raw_user_meta_data ->> 'last_name',
NEW.raw_user_meta_data ->> 'location_text',
(NEW.raw_user_meta_data ->> 'location_lat')::double precision,
(NEW.raw_user_meta_data ->> 'location_lng')::double precision
);
RETURN NEW;
END;

$$
;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── update_service_rating ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$

DECLARE
v_service_id UUID;
BEGIN
v_service_id := COALESCE(NEW.service_id, OLD.service_id);
UPDATE public.services
SET
rating = COALESCE((
SELECT AVG(rating) FROM public.reviews
WHERE service_id = v_service_id
), 0),
review_count = (
SELECT COUNT(\*) FROM public.reviews
WHERE service_id = v_service_id
)
WHERE id = v_service_id;
RETURN NULL;
END;

$$
;

CREATE TRIGGER trg_update_service_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_service_rating();


-- ── update_review_reaction_counts ────────────────────────────

CREATE OR REPLACE FUNCTION public.update_review_reaction_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$

DECLARE
v_review_id UUID;
BEGIN
v_review_id := COALESCE(NEW.review_id, OLD.review_id);
UPDATE public.reviews
SET
helpful_count = (SELECT COUNT(_) FROM public.review_reactions
WHERE review_id = v_review_id AND reaction_type = 'helpful'),
unhelpful_count = (SELECT COUNT(_) FROM public.review_reactions
WHERE review_id = v_review_id AND reaction_type = 'unhelpful')
WHERE id = v_review_id;
RETURN NULL;
END;

$$
;

CREATE TRIGGER trg_update_review_reaction_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.review_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_review_reaction_counts();


-- ── update_comment_like_count ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$

DECLARE
v_comment_id UUID;
BEGIN
v_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);
UPDATE public.service_comments
SET like_count = (SELECT COUNT(\*) FROM public.comment_likes
WHERE comment_id = v_comment_id)
WHERE id = v_comment_id;
RETURN NULL;
END;

$$
;

CREATE TRIGGER trg_update_comment_like_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_like_count();


-- ── update_conversation_timestamp ────────────────────────────

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$

BEGIN
UPDATE public.conversations
SET last_message_at = NOW()
WHERE id = NEW.conversation_id;
RETURN NULL;
END;

$$
;

CREATE TRIGGER trg_update_conversation_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


-- ── apply_service_boost / cancel_service_boost ───────────────

CREATE OR REPLACE FUNCTION public.apply_service_boost(
  p_service_id UUID,
  p_tier       TEXT,
  p_days       INT
)
RETURNS VOID LANGUAGE plpgsql AS
$$

BEGIN
UPDATE public.services
SET
boost_tier = p_tier,
boosted_until = NOW() + (p_days || ' days')::INTERVAL
WHERE id = p_service_id;
END;

$$
;

CREATE OR REPLACE FUNCTION public.cancel_service_boost(p_service_id UUID)
RETURNS VOID LANGUAGE plpgsql AS
$$

BEGIN
UPDATE public.services
SET boost_tier = NULL, boosted_until = NULL
WHERE id = p_service_id;
END;

$$
;


-- ── soft_delete_comment ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_comment(
  p_comment_id UUID,
  p_user_id    UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS
$$

BEGIN
UPDATE public.service_comments
SET is_deleted = TRUE
WHERE id = p_comment_id AND user_id = p_user_id;
END;

$$
;


-- ── can_user_review_service ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_user_review_service(
  p_user_id    UUID,
  p_service_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS
$$

BEGIN
RETURN EXISTS (
SELECT 1 FROM public.conversations
WHERE service_id = p_service_id AND buyer_id = p_user_id
);
END;

$$
;


-- ── get_user_review_reaction ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_review_reaction(
  p_user_id   UUID,
  p_review_id UUID
)
RETURNS TEXT LANGUAGE plpgsql AS
$$

DECLARE
v_reaction TEXT;
BEGIN
SELECT reaction_type INTO v_reaction
FROM public.review_reactions
WHERE review_id = p_review_id AND user_id = p_user_id;
RETURN v_reaction;
END;

$$
;


-- ── has_user_liked_comment ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_user_liked_comment(
  p_user_id    UUID,
  p_comment_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS
$$

BEGIN
RETURN EXISTS (
SELECT 1 FROM public.comment_likes
WHERE comment_id = p_comment_id AND user_id = p_user_id
);
END;

$$
;


-- ── get_unread_count ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_uuid UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) LANGUAGE plpgsql AS
$$

BEGIN
RETURN QUERY
SELECT m.conversation_id, COUNT(\*) AS unread_count
FROM public.messages m
JOIN public.conversations c ON c.id = m.conversation_id
WHERE (c.buyer_id = p_user_uuid OR c.seller_id = p_user_uuid)
AND m.sender_id <> p_user_uuid
AND m.is_read = FALSE
GROUP BY m.conversation_id;
END;

$$
;


-- ── get_subscriber_count ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_subscriber_count(p_provider_id UUID)
RETURNS BIGINT LANGUAGE plpgsql AS
$$

BEGIN
RETURN (
SELECT COUNT(\*) FROM public.service_subscriptions
WHERE provider_id = p_provider_id
);
END;

$$
;


-- ── is_subscribed ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_subscribed(
  p_subscriber_id UUID,
  p_provider_id   UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS
$$

BEGIN
RETURN EXISTS (
SELECT 1 FROM public.service_subscriptions
WHERE subscriber_id = p_subscriber_id
AND provider_id = p_provider_id
);
END;

$$
;


-- ── get_unread_notification_count ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS BIGINT LANGUAGE plpgsql AS
$$

BEGIN
RETURN (
SELECT COUNT(\*) FROM public.notifications
WHERE user_id = p_user_id AND is_read = FALSE
);
END;

$$
;


-- ── Storage helpers ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_storage_folder(
  p_bucket TEXT,
  p_folder TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS
$$

BEGIN
DELETE FROM storage.objects
WHERE bucket_id = p_bucket
AND name LIKE p_folder || '/%';
END;

$$
;

CREATE OR REPLACE FUNCTION public.cleanup_user_storage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS
$$

BEGIN
PERFORM public.delete_user_storage_folder('service-images', OLD.id::text);
PERFORM public.delete_user_storage_folder('profile-images', OLD.id::text);
PERFORM public.delete_user_storage_folder('chat-images', OLD.id::text);
RETURN OLD;
END;

$$
;

CREATE TRIGGER trg_cleanup_user_storage
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_storage();

CREATE OR REPLACE FUNCTION public.cleanup_service_images()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS
$$

BEGIN
IF OLD.image_url IS NOT NULL THEN
DELETE FROM storage.objects
WHERE bucket_id = 'service-images'
AND name = substring(OLD.image_url FROM '/service-images/(.+)$');
END IF;
RETURN OLD;
END;

$$
;

CREATE TRIGGER trg_cleanup_service_images
  BEFORE DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_service_images();

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_storage_files()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS
$$

BEGIN
DELETE FROM storage.objects o
WHERE o.bucket_id IN ('service-images', 'profile-images', 'chat-images')
AND NOT EXISTS (
SELECT 1 FROM public.profiles p
WHERE o.name LIKE p.id::text || '/%'
);
END;

$$
;


-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.active_boosts AS
  SELECT *
  FROM public.services
  WHERE status = 'active'
    AND boosted_until > NOW();


-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;


-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- ── categories ───────────────────────────────────────────────
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT USING (true);


-- ── services ─────────────────────────────────────────────────
CREATE POLICY "services_select_public_or_own"
  ON public.services FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "services_insert_own"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "services_update_own"
  ON public.services FOR UPDATE
  USING (auth.uid() = user_id);


-- ── reviews ──────────────────────────────────────────────────
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE USING (auth.uid() = user_id);


-- ── review_reactions ─────────────────────────────────────────
CREATE POLICY "review_reactions_select_public"
  ON public.review_reactions FOR SELECT USING (true);

CREATE POLICY "review_reactions_insert_own"
  ON public.review_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "review_reactions_delete_own"
  ON public.review_reactions FOR DELETE USING (auth.uid() = user_id);


-- ── review_replies ───────────────────────────────────────────
CREATE POLICY "review_replies_select_public"
  ON public.review_replies FOR SELECT USING (true);

CREATE POLICY "review_replies_insert_provider"
  ON public.review_replies FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.services
      WHERE id = service_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "review_replies_update_provider"
  ON public.review_replies FOR UPDATE
  USING (auth.uid() = provider_id);

CREATE POLICY "review_replies_delete_provider"
  ON public.review_replies FOR DELETE
  USING (auth.uid() = provider_id);


-- ── service_comments ─────────────────────────────────────────
CREATE POLICY "service_comments_select_not_deleted"
  ON public.service_comments FOR SELECT
  USING (is_deleted = FALSE);

CREATE POLICY "service_comments_insert_own"
  ON public.service_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_comments_update_own"
  ON public.service_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "service_comments_delete_own"
  ON public.service_comments FOR DELETE
  USING (auth.uid() = user_id);


-- ── comment_likes ────────────────────────────────────────────
CREATE POLICY "comment_likes_select_public"
  ON public.comment_likes FOR SELECT USING (true);

CREATE POLICY "comment_likes_insert_own"
  ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete_own"
  ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);


-- ── conversations ────────────────────────────────────────────
-- Direct column check (no subquery) keeps Realtime broadcast reliable.
CREATE POLICY "conversations_select_participants"
  ON public.conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "conversations_insert_buyer"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "conversations_update_participants"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- ── messages ─────────────────────────────────────────────────
-- SELECT: subquery join is acceptable here (not a broadcast path).
CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_sender"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- FIX: Sender cannot touch is_read.
-- Only the recipient (auth.uid() <> sender_id) may flip is_read to TRUE.
-- This matches markMessagesAsRead() which filters .neq("sender_id", user.id).
CREATE POLICY "messages_update_recipient_read"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  )
  WITH CHECK (is_read = TRUE);


-- ── service_subscriptions ────────────────────────────────────
CREATE POLICY "subscriptions_select_public"
  ON public.service_subscriptions FOR SELECT USING (true);

CREATE POLICY "subscriptions_insert_own"
  ON public.service_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "subscriptions_delete_own"
  ON public.service_subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id);


-- ── notifications ────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- SEED DATA — categories
-- ============================================================

INSERT INTO public.categories (name, icon_name) VALUES
  ('Software Development', 'code'),
  ('Home Repair',          'wrench'),
  ('Cleaning',             'sparkles'),
  ('Tutoring',             'book'),
  ('Photography',          'camera'),
  ('Writing',              'pencil'),
  ('Graphic Design',       'palette'),
  ('Fitness Training',     'dumbbell'),
  ('Beauty Services',      'scissors'),
  ('Transportation',       'car'),
  ('Others',               'ellipsis')
ON CONFLICT (name) DO NOTHING;

2.
-- ============================================================
-- Migration: add service_type to services
-- ============================================================
-- Adds an explicit 'digital' | 'physical' column.
-- Existing rows are backfilled: if latitude is set → physical,
-- otherwise → digital. This matches the inference logic used
-- in ProfileScreen's edit modal.
-- ============================================================

ALTER TABLE public.services
  ADD COLUMN service_type TEXT NOT NULL DEFAULT 'digital'
  CHECK (service_type IN ('digital', 'physical'));

-- Backfill existing rows
UPDATE public.services
SET service_type = CASE
  WHEN latitude IS NOT NULL THEN 'physical'
  ELSE 'digital'
END;

3.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('service-images', 'service-images', true, NULL,    NULL),
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('chat-images',    'chat-images',    true, NULL,    NULL)
ON CONFLICT (id) DO NOTHING;

4.
-- ============================================================
-- Storage RLS Policies
-- Run in Supabase SQL Editor
-- ============================================================

-- ── service-images ───────────────────────────────────────────
-- Public read, authenticated upload/update/delete own folder only

CREATE POLICY "service-images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

CREATE POLICY "service-images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "service-images_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "service-images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── profile-images ───────────────────────────────────────────

CREATE POLICY "profile-images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "profile-images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-images_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── chat-images ──────────────────────────────────────────────

CREATE POLICY "chat-images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

CREATE POLICY "chat-images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "chat-images_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "chat-images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

5.
-- ============================================================
-- Migration: Realtime Broadcast for messages
-- ============================================================
-- Switches message delivery from postgres_changes (unreliable,
-- doesn't scale) to Broadcast via database triggers, which is
-- the recommended approach per Supabase docs.
-- ============================================================

-- Step 1: RLS policy so authenticated users can receive broadcasts
CREATE POLICY "authenticated can receive broadcasts"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Trigger function — broadcasts a message event to the
-- conversation-scoped topic whenever a new message is inserted.
CREATE OR REPLACE FUNCTION public.broadcast_new_message()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS
$$

BEGIN
PERFORM realtime.broadcast_changes(
'messages:' || NEW.conversation_id::text, -- topic per conversation
TG_OP, -- event (INSERT)
TG_OP, -- operation
TG_TABLE_NAME, -- table (messages)
TG_TABLE_SCHEMA, -- schema (public)
NEW, -- new record
OLD -- old record (NULL on INSERT)
);
RETURN NULL;
END;

$$
;

-- Step 3: Attach trigger to messages table
CREATE TRIGGER trg_broadcast_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_new_message();

6.
-- ============================================================
-- Migration: fix notifications RLS for cross-user inserts
-- ============================================================
-- The current RLS policy blocks authenticated users from inserting
-- notifications for OTHER users (e.g. recipient of a message).
-- Solution: a SECURITY DEFINER function that runs as the DB owner
-- and validates the caller is authenticated before inserting.
-- The client calls this function instead of inserting directly.
-- ============================================================

-- Drop the overly restrictive insert policy
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

-- New function — runs as superuser, validates caller is authenticated,
-- then inserts the notification for any target user_id.
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id   UUID,
  p_type      TEXT,
  p_title     TEXT,
  p_body      TEXT,
  p_data      JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

BEGIN
-- Only authenticated users may trigger notifications
IF auth.uid() IS NULL THEN
RAISE EXCEPTION 'Not authenticated';
END IF;

INSERT INTO public.notifications (user_id, type, title, body, data)
VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;

$$
;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.send_notification(UUID, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

7.
DROP FUNCTION public.apply_service_boost(UUID, TEXT, INT);

CREATE OR REPLACE FUNCTION public.apply_service_boost(
  service_id UUID,
  tier       TEXT,
  days       INT
)
RETURNS VOID LANGUAGE plpgsql AS
$$

BEGIN
UPDATE public.services
SET
boost_tier = tier,
boosted_until = NOW() + (days || ' days')::INTERVAL
WHERE id = service_id;
END;
$$;
