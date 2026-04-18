// Filter-related type definitions

export type SortOption = "newest" | "price_low" | "price_high" | "rating_high" | "nearest";

export type PriceRange = {
  min: number | null;
  max: number | null;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
} | null;

export type FilterOptions = {
  categoryId: string | null;
  priceRange: PriceRange;
  minRating: number | null;
  location: string;
  sortBy: SortOption;
  userLocation: UserLocation;
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating_high", label: "Highest Rated" },
  { value: "nearest", label: "Nearest to Me" },
];

export const RATING_OPTIONS = [
  { value: null, label: "Any Rating" },
  { value: 3, label: "3+ Stars" },      // ← Fixed: was `valie` (typo)
  { value: 4, label: "4+ Stars" },
  { value: 4.5, label: "4.5+ Stars" },
];
