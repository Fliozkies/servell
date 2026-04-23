# DB Context — Service Marketplace App (Supabase/PostgreSQL)

## Extensions
- `uuid-ossp` enabled

---

## TABLES

### `profiles` (extends `auth.users`)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | → auth.users(id) CASCADE |
| first_name | TEXT | from raw_user_meta_data |
| last_name | TEXT | from raw_user_meta_data |
| physis_verified | BOOL | default false |
| profile_image_url | TEXT | stored in `profile-images` bucket |
| location_text | TEXT | display string |
| location_lat | DOUBLE PRECISION | for distance queries |
| location_lng | DOUBLE PRECISION | for distance queries |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto via trigger |

RLS: public SELECT; authenticated INSERT/UPDATE own row only.

---

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT UNIQUE NOT NULL | |
| description | TEXT | |
| icon_name | TEXT | e.g. "wrench", "code" |
| created_at | TIMESTAMPTZ | |

RLS: public SELECT only. No INSERT/UPDATE/DELETE via client.

Seeded values: Software Development, Home Repair, Cleaning, Tutoring, Photography, Writing, Graphic Design, Fitness Training, Beauty Services, Transportation, **Others**

---

### `services`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| title | TEXT NOT NULL | |
| description | TEXT NOT NULL | |
| price | DECIMAL(10,2) | nullable |
| image_url | TEXT | `service-images` bucket |
| category_id | UUID | → categories(id) |
| tags | TEXT[] | |
| location | TEXT NOT NULL | |
| phone_number | TEXT | nullable |
| rating | DECIMAL(3,2) | auto-updated via trigger, default 0.00 |
| review_count | INT | auto-updated via trigger, default 0 |
| status | TEXT | `'active'` \| `'inactive'` \| `'deleted'` |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| boosted_until | TIMESTAMPTZ | null = not boosted |
| boost_tier | TEXT | `'standard'` \| `'premium'` \| null |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto via trigger |

Indexes: user_id, category_id, status, created_at DESC, boosted partial index.

RLS: public SELECT active only; authenticated SELECT own (all statuses); authenticated INSERT/UPDATE own; no client DELETE (soft-delete via status).

---

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | → services(id) CASCADE |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| rating | INT NOT NULL | 1–5 |
| comment | TEXT | |
| helpful_count | INT | auto-updated via trigger |
| unhelpful_count | INT | auto-updated via trigger |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto via trigger |

Unique: (service_id, user_id) — one review per user per service.

RLS: public SELECT; authenticated INSERT/UPDATE/DELETE own.

---

### `review_reactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| review_id | UUID NOT NULL | → reviews(id) CASCADE |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| reaction_type | TEXT NOT NULL | `'helpful'` \| `'unhelpful'` |
| created_at | TIMESTAMPTZ | |

Unique: (review_id, user_id) — one reaction per user per review.

RLS: public SELECT; authenticated INSERT; authenticated DELETE own.

---

### `review_replies`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| review_id | UUID NOT NULL UNIQUE | → reviews(id) CASCADE — one reply per review |
| service_id | UUID NOT NULL | → services(id) CASCADE |
| provider_id | UUID NOT NULL | → profiles(id) CASCADE |
| content | TEXT NOT NULL | max 1000 chars |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto via trigger |

RLS: public SELECT; provider INSERT/UPDATE/DELETE own (must own the service).

---

### `service_comments`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | → services(id) CASCADE |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| parent_comment_id | UUID | → service_comments(id) CASCADE (for replies) |
| content | TEXT NOT NULL | max 500 chars |
| like_count | INT | auto-updated via trigger |
| is_deleted | BOOL | soft-delete flag, default false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto via trigger |

RLS: SELECT where is_deleted = false; authenticated INSERT/UPDATE/DELETE own.

Soft-delete via `soft_delete_comment(p_comment_id, p_user_id)` function (SECURITY DEFINER).

---

### `comment_likes`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| comment_id | UUID NOT NULL | → service_comments(id) CASCADE |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| created_at | TIMESTAMPTZ | |

Unique: (comment_id, user_id) — one like per user per comment.

RLS: public SELECT; authenticated INSERT/DELETE own.

---

### `conversations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service_id | UUID NOT NULL | → services(id) CASCADE |
| buyer_id | UUID NOT NULL | → profiles(id) CASCADE |
| seller_id | UUID NOT NULL | → profiles(id) CASCADE |
| last_message_at | TIMESTAMPTZ | auto-updated via trigger |
| created_at | TIMESTAMPTZ | |

Unique: (service_id, buyer_id) — one conversation per buyer per service.

Realtime enabled.

RLS: participants SELECT/UPDATE; buyer INSERT.

---

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID NOT NULL | → conversations(id) CASCADE |
| sender_id | UUID NOT NULL | → profiles(id) CASCADE |
| content | TEXT NOT NULL | must not be blank |
| is_read | BOOL | default false |
| created_at | TIMESTAMPTZ | |

Realtime enabled.

RLS: conversation participants SELECT/UPDATE; sender INSERT.

---

### `service_subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| subscriber_id | UUID NOT NULL | → profiles(id) CASCADE |
| provider_id | UUID NOT NULL | → profiles(id) CASCADE |
| created_at | TIMESTAMPTZ | |

Unique: (subscriber_id, provider_id). Check: subscriber ≠ provider.

RLS: public SELECT; authenticated INSERT own; authenticated DELETE own.

---

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | → profiles(id) CASCADE |
| type | TEXT NOT NULL | see enum below |
| title | TEXT NOT NULL | |
| body | TEXT NOT NULL | |
| data | JSONB | deep-link payload (service_id, review_id, etc.) |
| is_read | BOOL | default false |
| created_at | TIMESTAMPTZ | |

Allowed `type` values: `new_message`, `new_review`, `review_reply`, `review_reaction`, `new_subscriber`, `service_discount`, `new_service_from_subscription`, `price_drop`, `broadcast`, `account_verified`

Realtime enabled.

RLS: authenticated SELECT/UPDATE/DELETE own; authenticated INSERT (system).

---

## STORAGE BUCKETS

| Bucket | Public | Size Limit | Allowed Types | Path Pattern |
|---|---|---|---|---|
| `service-images` | yes | — | any image | `{user_id}/...` |
| `profile-images` | yes | 5 MB | jpeg/jpg/png/webp/gif | `{user_id}/...` |
| `chat-images` | yes | — | any image | `{user_id}/...` |

Storage cleanup: triggers on `profiles` BEFORE DELETE and `services` BEFORE DELETE auto-delete files from all three buckets. Manual orphan cleanup via `cleanup_orphaned_storage_files()`.

---

## FUNCTIONS (key ones)

| Function | Purpose |
|---|---|
| `handle_new_user()` | Trigger on auth.users INSERT → inserts profile row with first_name, last_name, location_text/lat/lng from raw_user_meta_data |
| `update_service_rating()` | Trigger on reviews INSERT/UPDATE/DELETE → recalculates `rating` + `review_count` on services |
| `update_review_reaction_counts()` | Trigger on review_reactions INSERT/UPDATE/DELETE → recalculates `helpful_count` + `unhelpful_count` on reviews |
| `update_comment_like_count()` | Trigger on comment_likes INSERT/DELETE → recalculates `like_count` on service_comments |
| `update_conversation_timestamp()` | Trigger on messages INSERT → updates `last_message_at` on conversations |
| `update_updated_at_column()` | Generic BEFORE UPDATE trigger → sets `updated_at = NOW()` on profiles, services, reviews, review_replies, service_comments |
| `apply_service_boost(service_id, tier, days)` | Sets boost_tier + boosted_until on a service |
| `cancel_service_boost(service_id)` | Clears boost fields |
| `soft_delete_comment(comment_id, user_id)` | Sets is_deleted = true (ownership-checked, SECURITY DEFINER) |
| `can_user_review_service(user_id, service_id)` | Returns bool — user must have a conversation as buyer |
| `get_user_review_reaction(user_id, review_id)` | Returns reaction_type or null |
| `has_user_liked_comment(user_id, comment_id)` | Returns bool |
| `get_unread_count(user_uuid)` | Returns table of (conversation_id, unread_count) |
| `get_subscriber_count(provider_id)` | Returns BIGINT |
| `is_subscribed(subscriber_id, provider_id)` | Returns bool |
| `get_unread_notification_count(user_id)` | Returns BIGINT |
| `cleanup_user_storage()` | Trigger fn — deletes all user files from all buckets on profile DELETE |
| `cleanup_service_images()` | Trigger fn — deletes specific image from service-images on service DELETE |
| `cleanup_orphaned_storage_files()` | Manual — removes storage objects with no matching profile |
| `delete_user_storage_folder(bucket, folder)` | Helper — deletes all files under a folder path in a bucket |

---

## VIEWS

| View | Purpose |
|---|---|
| `active_boosts` | Lists currently active boosted services (status=active, boosted_until > now()) |

---

## REALTIME TABLES
`conversations`, `messages`, `notifications`
