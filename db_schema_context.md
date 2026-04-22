# Database Schema Context — Service Marketplace App (Supabase)
# Last updated: reflects all fixes applied through current session

## Tables

### `profiles` (extends `auth.users`)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | FK → auth.users(id) CASCADE |
| first_name | TEXT | |
| last_name | TEXT | |
| physis_verified | BOOLEAN | default false |
| profile_image_url | TEXT | URL in `profile-images` bucket |
| location_text | TEXT | display text from Google Places |
| location_lat | DOUBLE PRECISION | used for "nearest to you" fallback |
| location_lng | DOUBLE PRECISION | used for "nearest to you" fallback |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |

RLS: public SELECT; authenticated INSERT/UPDATE own row only.
Trigger: `on_auth_user_created` → auto-inserts profile row on `auth.users` INSERT.
Reads `first_name`, `last_name`, `location_text`, `location_lat`, `location_lng` from `raw_user_meta_data`.
**Note:** All five fields must be passed in `options.data` during `supabase.auth.signUp()` — a separate upsert after sign-up will fail because the session is not established until email confirmation.
Trigger: `on_profile_deleted_cleanup_storage` (BEFORE DELETE) → deletes all files in `profile-images/{id}`, `service-images/{id}`, `chat-images/{id}`.

---

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT UNIQUE NOT NULL | |
| description | TEXT | |
| icon_name | TEXT | e.g. "wrench", "code" |
| created_at | TIMESTAMPTZ | |

RLS: public SELECT only.
Seeded with 11 rows: Software Development, Home Repair, Cleaning, Tutoring, Photography, Writing, Graphic Design, Fitness Training, Beauty Services, Transportation, Others.

---

### `services`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| title | TEXT NOT NULL | |
| description | TEXT NOT NULL | |
| price | DECIMAL(10,2) | nullable |
| image_url | TEXT | URL in `service-images` bucket |
| category_id | UUID | FK → categories(id) |
| tags | TEXT[] | |
| location | TEXT NOT NULL | |
| phone_number | TEXT | nullable |
| rating | DECIMAL(3,2) | auto-maintained by trigger, default 0 |
| review_count | INTEGER | auto-maintained by trigger, default 0 |
| status | TEXT | `active` \| `inactive` \| `deleted`, default `active` |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| boosted_until | TIMESTAMPTZ | NULL = not boosted |
| boost_tier | TEXT | `standard` \| `premium` \| NULL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |

RLS: public SELECT active; authenticated SELECT own (any status); authenticated INSERT/UPDATE own.
Trigger: `on_service_deleted_cleanup_image` (BEFORE DELETE) → deletes specific image from `service-images`.

---

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | FK → services(id) CASCADE |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| rating | INTEGER | 1–5, NOT NULL |
| comment | TEXT | |
| helpful_count | INTEGER | auto-maintained by trigger, default 0 |
| unhelpful_count | INTEGER | auto-maintained by trigger, default 0 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |
| UNIQUE | (service_id, user_id) | one review per user per service |

RLS: public SELECT; authenticated INSERT/UPDATE/DELETE own.
Constraint: user must have a conversation with the service (enforced via `can_user_review_service()`).

**Notifications sent by app:**
- `new_review` → service owner, on `createReview()`
- `review_reply` → reviewer, on `createReviewReply()`
- `review_reaction` → review author, on `toggleReviewReaction()` (only on add, not remove)

---

### `review_reactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| review_id | UUID NOT NULL | FK → reviews(id) CASCADE |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| reaction_type | TEXT | `helpful` \| `unhelpful` |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (review_id, user_id) | one reaction per user per review |

RLS: public SELECT; authenticated INSERT; authenticated DELETE own.
Trigger: updates `helpful_count`/`unhelpful_count` on `reviews` after INSERT/UPDATE/DELETE.

---

### `review_replies`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| review_id | UUID NOT NULL | FK → reviews(id) CASCADE, UNIQUE |
| service_id | UUID NOT NULL | FK → services(id) CASCADE |
| provider_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| content | TEXT | 1–1000 chars |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |
| UNIQUE | (review_id) | one reply per review |

RLS: public SELECT; provider INSERT (must own the service); provider UPDATE/DELETE own reply.

---

### `service_comments`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | FK → services(id) CASCADE |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| parent_comment_id | UUID | self-ref FK (nested replies) |
| content | TEXT | 1–500 chars |
| like_count | INTEGER | auto-maintained by trigger, default 0 |
| is_deleted | BOOLEAN | soft-delete flag, default false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated via trigger |

RLS: SELECT where not deleted; authenticated INSERT/UPDATE own; DELETE own.
Soft-delete via `soft_delete_comment(p_comment_id, p_user_id)` SECURITY DEFINER function.

**Notifications sent by app:**
- `new_comment` → service owner, when top-level comment posted via `createComment()`
- `comment_reply` → parent comment author, when reply posted via `createComment()`
- `comment_like` → comment author, when liked via `toggleCommentLike()` (only on like, not unlike)

---

### `comment_likes`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| comment_id | UUID NOT NULL | FK → service_comments(id) CASCADE |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (comment_id, user_id) | one like per user per comment |

RLS: public SELECT; authenticated INSERT; DELETE own.
Trigger: updates `like_count` on `service_comments` after INSERT/DELETE.

---

### `conversations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | FK → services(id) CASCADE |
| buyer_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| seller_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| last_message_at | TIMESTAMPTZ | auto-updated by trigger |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (service_id, buyer_id) | one convo per buyer per service |

RLS: SELECT/UPDATE for participants; INSERT for buyer only.
Realtime enabled.

---

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID NOT NULL | FK → conversations(id) CASCADE |
| sender_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| content | TEXT NOT NULL | trimmed length > 0. Image messages use prefix `[image]:https://...` |
| image_url | TEXT | nullable, URL in `chat-images` bucket |
| is_read | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |

RLS: SELECT/INSERT/UPDATE for conversation participants only.
Trigger: updates `last_message_at` on `conversations` after INSERT.
Realtime enabled.

**Notifications sent by app:**
- `new_message` → recipient (other conversation participant), on every `sendMessage()` call. Non-fatal — message delivery is not blocked if notification fails.

**Image messages:** stored in `content` as `[image]:{publicUrl}`. Use `isImageMessage(content)` and `getImageUrl(content)` helpers from `messaging.api.ts`. Images are uploaded to the `chat-images` bucket as a `PickedImage` object (must include `uri`, `base64`, `mimeType`).

---

### `service_subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| subscriber_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| provider_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (subscriber_id, provider_id) | |
| CHECK | subscriber_id <> provider_id | no self-subscribe |

RLS: public SELECT; authenticated INSERT own subscriber_id; DELETE own.

**Notifications sent by app:**
- `new_subscriber` → provider, when someone subscribes via `subscribeToProvider()`

---

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | FK → profiles(id) CASCADE |
| type | TEXT | see NotificationType below |
| title | TEXT NOT NULL | |
| body | TEXT NOT NULL | |
| data | JSONB | optional deep-link payload (see per-type keys below) |
| is_read | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |

RLS: authenticated SELECT/UPDATE/DELETE own; authenticated INSERT (system).
Realtime enabled.

**NotificationType values and their `data` payload keys:**

| type | data keys | Sent from |
|---|---|---|
| `new_message` | `conversation_id` | `sendMessage()` in messaging.api.ts |
| `new_review` | `service_id`, `review_id` | `createReview()` in reviews.api.ts |
| `review_reply` | `service_id`, `review_id`, `reply_id` | `createReviewReply()` |
| `review_reaction` | `service_id`, `review_id`, `reaction_type` | `toggleReviewReaction()` |
| `new_comment` | `service_id`, `comment_id` | `createComment()` (top-level) |
| `comment_reply` | `service_id`, `comment_id`, `parent_comment_id` | `createComment()` (reply) |
| `comment_like` | `service_id`, `comment_id` | `toggleCommentLike()` |
| `new_subscriber` | `subscriber_id` | `subscribeToProvider()` |
| `service_discount` | `service_id`, `provider_id` | `sendDiscountNotificationToSubscribers()` |
| `new_service_from_subscription` | `service_id`, `provider_id` | (reserved, not yet implemented) |
| `price_drop` | `service_id` | (reserved, not yet implemented) |
| `broadcast` | — | `sendBroadcastNotification()` |
| `account_verified` | — | (reserved) |

**Realtime subscription:** `subscribeToNotifications(userId, callback)` in `notifications.api.ts`.
Each call creates a uniquely named channel (`notifications:{userId}:{Date.now()}`) to prevent the "cannot add postgres_changes callbacks after subscribe()" error.

---

## Storage Buckets

| Bucket | Public | Max Size | MIME Types | Path Pattern |
|---|---|---|---|---|
| `service-images` | Yes | — | any image | `{user_id}/{filename}` |
| `profile-images` | Yes | 5 MB | jpeg/png/webp/gif | `{user_id}/{filename}` |
| `chat-images` | Yes | — | any image | `{user_id}/{filename}` |

All buckets: authenticated upload to own folder; public read; authenticated delete own folder.

**Image upload:** Always use the `uploadImage(pickedImage: PickedImage, bucket: string)` helper from `imageUtils.ts`. Never pass a raw URI string — Supabase Storage on React Native requires ArrayBuffer decoded from base64.

---

## Key Functions

| Function | Returns | Purpose |
|---|---|---|
| `update_service_rating()` | TRIGGER | Recalculates `rating` + `review_count` on services after review INSERT/UPDATE/DELETE |
| `update_updated_at_column()` | TRIGGER | Sets `updated_at = NOW()` on profiles, services, reviews, review_replies, service_comments |
| `update_conversation_timestamp()` | TRIGGER | Sets `last_message_at` on conversation after message INSERT |
| `update_review_reaction_counts()` | TRIGGER | Recalculates `helpful_count`/`unhelpful_count` on reviews after reaction INSERT/UPDATE/DELETE |
| `update_comment_like_count()` | TRIGGER | Recalculates `like_count` on service_comments after like INSERT/DELETE |
| `cleanup_user_storage()` | TRIGGER | Deletes all 3 bucket folders for a user on profile BEFORE DELETE |
| `cleanup_service_images()` | TRIGGER | Deletes service image on service BEFORE DELETE |
| `handle_new_user()` | TRIGGER | Creates profile row when new auth.users row inserted. Reads: `first_name`, `last_name`, `location_text`, `location_lat` (cast to float8), `location_lng` (cast to float8) from `raw_user_meta_data`. |
| `soft_delete_comment(comment_id, user_id)` | VOID | Sets `is_deleted = true` with ownership check (SECURITY DEFINER) |
| `apply_service_boost(service_id, tier, days)` | VOID | Sets `boost_tier` + `boosted_until` on a service |
| `cancel_service_boost(service_id)` | VOID | Clears boost columns |
| `get_unread_count(user_uuid)` | TABLE | Returns unread message count per conversation |
| `get_subscriber_count(provider_id)` | BIGINT | Count of subscribers for a provider |
| `is_subscribed(subscriber_id, provider_id)` | BOOLEAN | Check subscription existence |
| `get_unread_notification_count(user_id)` | BIGINT | Count of unread notifications |
| `can_user_review_service(user_id, service_id)` | BOOLEAN | True if buyer has a conversation for that service |
| `get_user_review_reaction(user_id, review_id)` | TEXT | Returns reaction_type or NULL |
| `has_user_liked_comment(user_id, comment_id)` | BOOLEAN | Check if user liked a comment |
| `cleanup_orphaned_storage_files()` | TABLE | Manually removes files whose user_id folder no longer exists in profiles |
| `delete_user_storage_folder(bucket, folder)` | VOID | Deletes all files matching `folder/%` in a bucket |

---

## Realtime Subscriptions (app-side)

| Channel pattern | Table | Events | Used in |
|---|---|---|---|
| `messages:{conversationId}` | messages | INSERT | `subscribeToMessages()` — chat screen |
| `conversations:{userId}:{ts}` | conversations | INSERT, UPDATE, DELETE | `subscribeToConversations()` — ConversationsScreen, useUnreadCounts |
| `messages:user:{userId}` | messages | INSERT, UPDATE | useUnreadCounts — badge counter |
| `conv_screen_msgs:{userId}` | messages | INSERT, UPDATE | ConversationsScreen — list refresh |
| `notifications:{userId}:{ts}` | notifications | INSERT | `subscribeToNotifications()` — useUnreadCounts, NotificationScreen |

**Key rule:** Never reuse a channel name across two `.subscribe()` calls. Supabase throws "cannot add postgres_changes callbacks after subscribe()" if you try. Always append `Date.now()` or a unique suffix when the same logical subscription might be created more than once.

---

## Entity Relationships (summary)

```
auth.users
  └─ profiles (1:1)
       ├─ services (1:N)
       │    ├─ reviews (1:N)
       │    │    ├─ review_reactions (1:N)
       │    │    └─ review_replies (1:1)
       │    ├─ service_comments (1:N, self-referencing for replies)
       │    │    └─ comment_likes (1:N)
       │    └─ conversations (1:N, buyer+seller)
       │         └─ messages (1:N)
       ├─ service_subscriptions (M:N profiles via subscriber/provider)
       └─ notifications (1:N)
```

---

## File Placement Reference

| Output file | Project path |
|---|---|
| `auth.tsx` | `app/(auth)/auth.tsx` |
| `main_index.tsx` | `app/(main)/index.tsx` |
| `[conversationId].tsx` | `app/chat/[conversationId].tsx` |
| `services-list_index.tsx` | `app/services-list/index.tsx` |
| `ProfileScreen.tsx` | `app/screens/ProfileScreen.tsx` |
| `NotificationScreen.tsx` | `app/screens/NotificationScreen.tsx` |
| `ConversationsScreen.tsx` | `app/screens/ConversationsScreen.tsx` |
| `ProfileImageModal.tsx` | `lib/components/ProfileImageModal.tsx` |
| `messaging.api.ts` | `lib/api/messaging.api.ts` |
| `notifications.api.ts` | `lib/api/notifications.api.ts` |
| `useUnreadCounts.ts` | `lib/hooks/useUnreadCounts.ts` |
| `fix_handle_new_user_trigger.sql` | Run in Supabase SQL Editor |
