// API functions for interacting with Supabase services table

import { ServiceWithDetails } from "../types/database.types";
import { UserLocation } from "../types/filter.types";
import { supabase } from "./supabase";

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
export async function fetchServices(): Promise<ServiceWithDetails[]> {
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
}

/**
 * Fetch services by category
 */
export async function fetchServicesByCategory(
  categoryId: string,
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
 * Advanced search and filter services
 * Supports search query, category, price range, rating, location, and sorting.
 * When sortBy is "nearest", results are sorted client-side by distance from userLocation.
 */
export async function searchAndFilterServices(params: {
  searchQuery?: string;
  categoryId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  location?: string;
  sortBy?: "newest" | "price_low" | "price_high" | "rating_high" | "nearest";
  userLocation?: UserLocation;
}): Promise<ServiceWithDetails[]> {
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
          query = query.order("price", { ascending: true, nullsFirst: false });
          break;
        case "price_high":
          query = query.order("price", { ascending: false, nullsFirst: false });
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

    return results;
  } catch (error) {
    console.error("Failed to search and filter services:", error);
    throw error;
  }
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
    return data;
  } catch (error) {
    console.error("Failed to update service status via RPC:", error);
    throw error;
  }
}
