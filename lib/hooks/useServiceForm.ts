import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { fetchCategories } from "../api/services.api";
import { Category, Service } from "../types/database.types";
import { pickImage } from "../utils/imageUtils";

export interface ServiceFormState {
  title: string;
  description: string;
  price: string;
  location: string;
  phoneNumber: string;
  tags: string[];
  currentTag: string;
  selectedImage: string | null;
  selectedCategory: string | null;
}

export interface ServiceFormActions {
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setPrice: (v: string) => void;
  setLocation: (v: string) => void;
  setPhoneNumber: (v: string) => void;
  setCurrentTag: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  handlePickImage: () => Promise<void>;
  categories: Category[];
  loadingCategories: boolean;
}

/**
 * Shared form state and helpers used by both CreateService screen
 * and the EditServiceModal inside Profile_page.
 *
 * Eliminates the near-identical state + tag/image logic that was
 * copy-pasted across both components.
 */
export function useServiceForm(
  initialService?: Service | null,
): ServiceFormState & ServiceFormActions {
  const [title, setTitle] = useState(initialService?.title ?? "");
  const [description, setDescription] = useState(
    initialService?.description ?? "",
  );
  const [price, setPrice] = useState(
    initialService?.price != null ? String(initialService.price) : "",
  );
  const [location, setLocation] = useState(initialService?.location ?? "");
  const [phoneNumber, setPhoneNumber] = useState(
    initialService?.phone_number ?? "",
  );
  const [tags, setTags] = useState<string[]>(initialService?.tags ?? []);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialService?.category_id ?? null,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => Alert.alert("Error", "Failed to load categories"))
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleAddTag = () => {
    const trimmed = currentTag.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      Alert.alert("Duplicate Tag", "This tag already exists");
      return;
    }
    if (tags.length >= 5) {
      Alert.alert("Limit Reached", "You can only add up to 5 tags");
      return;
    }
    setTags([...tags, trimmed]);
    setCurrentTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handlePickImage = async () => {
    await pickImage(setSelectedImage);
  };

  return {
    title,
    description,
    price,
    location,
    phoneNumber,
    tags,
    currentTag,
    selectedImage,
    selectedCategory,
    setTitle,
    setDescription,
    setPrice,
    setLocation,
    setPhoneNumber,
    setCurrentTag,
    setSelectedCategory,
    handleAddTag,
    handleRemoveTag,
    handlePickImage,
    categories,
    loadingCategories,
  };
}

/**
 * Validates the service form fields.
 * Shows an Alert for the first failing rule.
 */
export function validateServiceForm(fields: {
  title: string;
  description: string;
  location: string;
  selectedCategory: string | null;
  price: string;
}): boolean {
  if (!fields.title.trim()) {
    Alert.alert("Required Field", "Please enter a service title");
    return false;
  }
  if (!fields.description.trim()) {
    Alert.alert("Required Field", "Please enter a description");
    return false;
  }
  if (!fields.location.trim()) {
    Alert.alert("Required Field", "Please enter a location");
    return false;
  }
  if (!fields.selectedCategory) {
    Alert.alert("Required Field", "Please select a category");
    return false;
  }
  if (fields.price.trim() && isNaN(Number(fields.price))) {
    Alert.alert("Invalid Price", "Please enter a valid number for price");
    return false;
  }
  return true;
}
