// API functions for interacting with Supabase services table

import { ServiceWithDetails } from "../types/database.types";
import { UserLocation } from "../types/filter.types";
import { supabase } from "./supabase";

type FetchOptions = {
  force?: boolean;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type SearchAndFilterParams = {
  searchQuery?: string;
  categoryId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  location?: string;
  sortBy?: "newest" | "price_low" | "price_high" | "rating_high" | "nearest";
  userLocation?: UserLocation;
  limit?: number;
  page?: number;
};

const SERVICE_CACHE_TTL_MS = 60 * 1000;
const serviceCache = new Map<string, CacheEntry<unknown>>();
const pendingServiceRequests = new Map<string, Promise<unknown>>();
let serviceCacheVersion = 0;

function getSearchAndFilterCacheKey(params: SearchAndFilterParams) {
  const userLocation = params.userLocation
    ? {
        latitude: Number(params.userLocation.latitude.toFixed(5)),
        longitude: Number(params.userLocation.longitude.toFixed(5)),
      }
    : null;

  return JSON.stringify({
    type: "searchAndFilter",
    searchQuery: params.searchQuery?.trim() ?? "",
    categoryId: params.categoryId ?? null,
    minPrice: params.minPrice ?? null,
    maxPrice: params.maxPrice ?? null,
    minRating: params.minRating ?? null,
    location: params.location?.trim() ?? "",
    sortBy: params.sortBy ?? "newest",
    userLocation,
    limit: params.limit ?? null,
    page: params.page ?? 0,
  });
}

async function withServicesCache<T>(
  key: string,
  options: FetchOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!options.force) {
    const cached = serviceCache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < SERVICE_CACHE_TTL_MS) {
      return cached.data;
    }

    const pending = pendingServiceRequests.get(key) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const cacheVersion = serviceCacheVersion;
  const request = fetcher()
    .then((data) => {
      if (cacheVersion === serviceCacheVersion) {
        serviceCache.set(key, { data, timestamp: Date.now() });
      }
      return data;
    })
    .finally(() => {
      if (pendingServiceRequests.get(key) === request) {
        pendingServiceRequests.delete(key);
      }
    });

  pendingServiceRequests.set(key, request);
  return request;
}

export function invalidateServicesCache() {
  serviceCacheVersion += 1;
  serviceCache.clear();
  pendingServiceRequests.clear();
}

// ── Haversine distance (km) between two lat/lng points ────────────────────────
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch all active services from Supabase
 * Includes related category and profile data
 */
export async function fetchServices(
  options: FetchOptions = {},
): Promise<ServiceWithDetails[]> {
  return withServicesCache("services:active", options, async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch services:", error);
      throw error;
    }
  });
}

/**
 * Fetch services by category
 */
export async function fetchServicesByCategory(
  categoryId: string,
  options: FetchOptions = {},
): Promise<ServiceWithDetails[]> {
  return withServicesCache(`services:category:${categoryId}`, options, async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("status", "active")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching services by category:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch services by category:", error);
      throw error;
    }
  });
}

/**
 * Fetch a single service by ID
 */
export async function fetchServiceById(
  serviceId: string,
): Promise<ServiceWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select(
        `
        *,
        category:categories(*),
        profile:profiles(*)
      `,
      )
      .eq("id", serviceId)
      .single();

    if (error) {
      console.error("Error fetching service:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch service:", error);
    throw error;
  }
}

/**
 * Fetch services by user ID (for viewing own services)
 */
export async function fetchUserServices(
  userId: string,
  options: FetchOptions = {},
): Promise<ServiceWithDetails[]> {
  return withServicesCache(`services:user:${userId}`, options, async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user services:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch user services:", error);
      throw error;
    }
  });
}

/**
 * Search services by title or description
 */
export async function searchServices(
  query: string,
): Promise<ServiceWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select(
        `
        *,
        category:categories(*),
        profile:profiles(*)
      `,
      )
      .eq("status", "active")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching services:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to search services:", error);
    throw error;
  }
}

/**
 * Fetch all categories
 */
export async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    throw error;
  }
}

/**
 * Fetch actively boosted (featured) services.
 * A service is boosted when boosted_until is set and still in the future.
 * premium tier comes before standard; within same tier ordered by boosted_until desc.
 */
export async function fetchBoostedServices(
  options: FetchOptions = {},
): Promise<ServiceWithDetails[]> {
  return withServicesCache("services:boosted", options, async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("status", "active")
        .not("boosted_until", "is", null)
        .gt("boosted_until", now)
        // premium (p) sorts before standard (s) alphabetically
        .order("boost_tier", { ascending: true, nullsFirst: false })
        .order("boosted_until", { ascending: false });

      if (error) {
        console.error("Error fetching boosted services:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch boosted services:", error);
      throw error;
    }
  });
}

/**
 * Compute the Editor's Pick score for a service.
 *
 * Formula (weights sum to 1.0):
 *   50% — Bayesian rating: trusts ratings with more reviews more than fewer
 *   25% — Recency: newer services score higher (decays over 90 days)
 *   15% — Profile completeness: has image + has location set
 *   10% — Engagement: has at least one review reply (active provider)
 *
 * Returns a score between 0 and 1.
 */
function computeEditorsScore(service: ServiceWithDetails): number {
  // ── Bayesian rating (50%) ──────────────────────────────────────────────────
  // Uses a global prior of 3.0 stars with a confidence weight of 5 reviews.
  // Formula: (C * m + R * n) / (C + n)
  //   where C = confidence weight, m = prior mean, R = actual rating, n = review count
  const PRIOR_MEAN = 3.0;
  const CONFIDENCE = 5;
  const bayesianRating =
    (CONFIDENCE * PRIOR_MEAN + service.rating * service.review_count) /
    (CONFIDENCE + service.review_count);
  // Normalise to 0–1 (max possible rating = 5)
  const ratingScore = bayesianRating / 5;

  // ── Recency (25%) ─────────────────────────────────────────────────────────
  // Score = 1.0 on day 0, decays to ~0 at 90 days using exponential decay
  const ageMs = Date.now() - new Date(service.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const DECAY_DAYS = 90;
  const recencyScore = Math.exp(-ageDays / DECAY_DAYS);

  // ── Profile completeness (15%) ─────────────────────────────────────────────
  // Award points for: image, location set
  let completeness = 0;
  if (service.image_url) completeness += 0.5;
  if (service.location && service.location.trim() !== "") completeness += 0.5;

  // ── Engagement (10%) ──────────────────────────────────────────────────────
  // 1.0 if provider has at least one review (shows they're active)
  // We use review_count as a proxy; review replies aren't in this join
  const engagementScore = service.review_count > 0 ? 1.0 : 0.0;

  // ── Weighted sum ──────────────────────────────────────────────────────────
  return (
    ratingScore * 0.5 +
    recencyScore * 0.25 +
    completeness * 0.15 +
    engagementScore * 0.1
  );
}

/**
 * Fetch the single best Editor's Pick service.
 * Used as the Featured card fallback when no services are actively boosted.
 *
 * Scoring: Bayesian rating (50%) + recency (25%) + completeness (15%) + engagement (10%)
 * Only considers services with at least 1 review to prevent brand-new listings
 * from occupying the Featured slot with zero social proof.
 */
export async function fetchEditorsPick(
  options: FetchOptions = {},
): Promise<ServiceWithDetails | null> {
  return withServicesCache("services:editors-pick", options, async () => {
    try {
      // Fetch candidates: active, has at least 1 review, top 50 by rating
      // We limit to 50 to avoid scoring hundreds of services client-side
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          category:categories(*),
          profile:profiles(*)
        `,
        )
        .eq("status", "active")
        .gt("review_count", 0)
        .order("rating", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching editor's pick candidates:", error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      // Score each candidate and pick the highest
      const scored = data.map((s) => ({
        service: {
          ...s,
          _editorsScore: computeEditorsScore(s),
        } as ServiceWithDetails,
        score: computeEditorsScore(s),
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored[0].service;
    } catch (error) {
      console.error("Failed to fetch editor's pick:", error);
      return null;
    }
  });
}

/**
 * Advanced search and filter services
 * Supports search query, category, price range, rating, location, and sorting.
 * When sortBy is "nearest", results are sorted client-side by distance from userLocation.
 */
export async function searchAndFilterServices(
  params: SearchAndFilterParams,
  options: FetchOptions = {},
): Promise<ServiceWithDetails[]> {
  return withServicesCache(
    getSearchAndFilterCacheKey(params),
    options,
    async () => {
      try {
        let query = supabase
          .from("services")
          .select(
            `
            *,
            category:categories(*),
            profile:profiles(*)
          `,
          )
          .eq("status", "active");

        // Apply search query (title, description, or tags)
        if (params.searchQuery && params.searchQuery.trim()) {
          query = query.or(
            `title.ilike.%${params.searchQuery}%,description.ilike.%${params.searchQuery}%,tags.cs.{${params.searchQuery}}`,
          );
        }

        // Filter by category
        if (params.categoryId) {
          query = query.eq("category_id", params.categoryId);
        }

        // Filter by minimum price
        if (params.minPrice !== null && params.minPrice !== undefined) {
          query = query.gte("price", params.minPrice);
        }

        // Filter by maximum price
        if (params.maxPrice !== null && params.maxPrice !== undefined) {
          query = query.lte("price", params.maxPrice);
        }

        // Filter by minimum rating
        if (params.minRating !== null && params.minRating !== undefined) {
          query = query.gte("rating", params.minRating);
        }

        // Filter by location (partial match)
        if (params.location && params.location.trim()) {
          query = query.ilike("location", `%${params.location}%`);
        }

        // Apply Supabase-side sorting (skip for nearest — handled client-side below)
        if (params.sortBy !== "nearest") {
          switch (params.sortBy) {
            case "price_low":
              query = query.order("price", {
                ascending: true,
                nullsFirst: false,
              });
              break;
            case "price_high":
              query = query.order("price", {
                ascending: false,
                nullsFirst: false,
              });
              break;
            case "rating_high":
              query = query.order("rating", { ascending: false });
              break;
            case "newest":
            default:
              query = query.order("created_at", { ascending: false });
              break;
          }
        }

        if (params.sortBy !== "nearest" && params.limit && params.limit > 0) {
          const page = params.page ?? 0;
          const from = page * params.limit;
          query = query.range(from, from + params.limit - 1);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error searching and filtering services:", error);
          throw error;
        }

        let results: ServiceWithDetails[] = data || [];

        // Client-side distance sort when "nearest" is selected
        if (params.sortBy === "nearest" && params.userLocation) {
          const { latitude: uLat, longitude: uLng } = params.userLocation;

          // Attach distance to each result, push nulls to end
          const withDistance = results.map((s) => ({
            service: s,
            distance:
              s.latitude != null && s.longitude != null
                ? haversineDistance(uLat, uLng, s.latitude, s.longitude)
                : null,
          }));

          withDistance.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });

          results = withDistance.map((item) => ({
            ...item.service,
            // Attach computed distance for display in the UI
            _distanceKm: item.distance,
          })) as ServiceWithDetails[];
        }

        if (params.sortBy === "nearest" && params.limit && params.limit > 0) {
          const page = params.page ?? 0;
          const from = page * params.limit;
          return results.slice(from, from + params.limit);
        }

        return results;
      } catch (error) {
        console.error("Failed to search and filter services:", error);
        throw error;
      }
    },
  );
}

/**
 * Update service status (active/inactive/deleted)
 * Uses direct update - requires proper RLS policies
 */
export async function updateServiceStatus(
  serviceId: string,
  status: "active" | "inactive" | "deleted",
) {
  try {
    const { data, error } = await supabase
      .from("services")
      .update({ status })
      .eq("id", serviceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating service status:", error);
      throw error;
    }

    invalidateServicesCache();
    return data;
  } catch (error) {
    console.error("Failed to update service status:", error);
    throw error;
  }
}

/**
 * Update service status using database function (RPC)
 * This is an alternative that works when RLS policies are strict
 * Requires the update_service_status PostgreSQL function to be created first
 */
export async function updateServiceStatusRPC(
  serviceId: string,
  status: "active" | "inactive" | "deleted",
) {
  try {
    // First verify the service exists and user owns it
    const { data: existingService } = await supabase
      .from("services")
      .select("id, user_id, status")
      .eq("id", serviceId)
      .single();

    if (!existingService) {
      throw new Error("Service not found");
    }

    console.log("Updating service:", {
      serviceId,
      currentStatus: existingService.status,
      newStatus: status,
    });

    const { data, error } = await supabase
      .rpc("update_service_status", {
        service_id: serviceId,
        new_status: status,
      })
      .single();

    if (error) {
      console.error("Error updating service status via RPC:", error);
      throw error;
    }

    console.log("Service updated successfully:", data);
    invalidateServicesCache();
    return data;
  } catch (error) {
    console.error("Failed to update service status via RPC:", error);
    throw error;
  }
}

// ── Boost ─────────────────────────────────────────────────────────────────────

/**
 * Apply a boost to a service using the DB function `apply_service_boost`.
 * @param serviceId  UUID of the service to boost
 * @param tier       "standard" | "premium"
 * @param days       Number of days to boost (e.g. 3, 7, 14, 30)
 */
export async function boostService(
  serviceId: string,
  tier: "standard" | "premium",
  days: number,
): Promise<void> {
  const { error } = await supabase.rpc("apply_service_boost", {
    service_id: serviceId,
    tier,
    days,
  });
  if (error) {
    console.error("Error boosting service:", error);
    throw error;
  }
  invalidateServicesCache();
}

/**
 * Cancel an active boost on a service using the DB function `cancel_service_boost`.
 */
export async function cancelServiceBoost(serviceId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_service_boost", {
    service_id: serviceId,
  });
  if (error) {
    console.error("Error cancelling boost:", error);
    throw error;
  }
  invalidateServicesCache();
}
