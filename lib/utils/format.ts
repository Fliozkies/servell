import { Profile } from "../types/database.types";

/**
 * Caps a badge number at 99, returning "" for zero / negative counts.
 * Used by: BottomNav, ConversationItem badge
 */
export function formatBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

/**
 * Produces a display name from a Profile record.
 * Returns a fallback string when the profile is null.
 */
export function formatDisplayName(
  profile: Profile | null,
  fallback = "Unknown",
): string {
  if (!profile) return fallback;
  return (
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || fallback
  );
}

/**
 * Returns the initials (first letter, uppercased) of a display name.
 */
export function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

/**
 * Formats a Philippine price value.
 * Returns "Contact for price" when price is null.
 */
export function formatPrice(price: number | null): string {
  if (price === null) return "Contact for price";
  return `₱${price.toLocaleString()}`;
}
