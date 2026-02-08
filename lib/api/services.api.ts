// API functions for interacting with Supabase services table

import { ServiceWithDetails } from "../types/database.types";
import { supabase } from "./supabase";

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
