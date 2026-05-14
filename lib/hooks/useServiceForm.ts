import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { fetchCategories } from "../api/services.api";
import { Category, Service } from "../types/database.types";
import { PickedImage, pickImage } from "../utils/imageUtils";

export type ServiceType = "digital" | "physical";

export interface ServiceFormState {
  serviceType: ServiceType;
  title: string;
  description: string;
  price: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string;
  tags: string[];
  currentTag: string;
  selectedImage: PickedImage | null; // now holds uri + base64 + mimeType
  selectedCategory: string | null;
  customCategory: string;
}

export interface ServiceFormActions {
  setServiceType: (v: ServiceType) => void;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setPrice: (v: string) => void;
  setLocation: (v: string) => void;
  setCoordinates: (lat: number | null, lng: number | null) => void;
  setPhoneNumber: (v: string) => void;
  setCurrentTag: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
  setCustomCategory: (v: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  handlePickImage: () => Promise<void>;
  categories: Category[];
  loadingCategories: boolean;
}

export function useServiceForm(
  initialService?: Service | null,
): ServiceFormState & ServiceFormActions {
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialService?.service_type ?? "digital",
  );
  const [title, setTitle] = useState(initialService?.title ?? "");
  const [description, setDescription] = useState(
    initialService?.description ?? "",
  );
  const [price, setPrice] = useState(
    initialService?.price != null ? String(initialService.price) : "",
  );
  const [location, setLocation] = useState(initialService?.location ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initialService?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialService?.longitude ?? null,
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialService?.phone_number ?? "",
  );
  const [tags, setTags] = useState<string[]>(initialService?.tags ?? []);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialService?.category_id ?? null,
  );
  const [customCategory, setCustomCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => Alert.alert("Error", "Failed to load categories"))
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    if (!initialService) return;

    setTitle(initialService.title ?? "");
    setDescription(initialService.description ?? "");
    setPrice(initialService.price != null ? String(initialService.price) : "");
    setLocation(initialService.location ?? "");
    setLatitude(initialService.latitude ?? null);
    setLongitude(initialService.longitude ?? null);
    setPhoneNumber(initialService.phone_number ?? "");
    setTags(initialService.tags ?? []);
    setCurrentTag("");
    setSelectedImage(null);
    setSelectedCategory(initialService.category_id ?? null);
    setCustomCategory("");
    setServiceType(initialService.service_type ?? "digital");
  }, [initialService]);

  const setCoordinates = (lat: number | null, lng: number | null) => {
    setLatitude(lat);
    setLongitude(lng);
  };

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
    serviceType,
    title,
    description,
    price,
    location,
    latitude,
    longitude,
    phoneNumber,
    tags,
    currentTag,
    selectedImage,
    selectedCategory,
    customCategory,
    setServiceType,
    setTitle,
    setDescription,
    setPrice,
    setLocation,
    setCoordinates,
    setPhoneNumber,
    setCurrentTag,
    setSelectedCategory,
    setCustomCategory,
    handleAddTag,
    handleRemoveTag,
    handlePickImage,
    categories,
    loadingCategories,
  };
}

export function validateServiceForm(fields: {
  serviceType?: ServiceType;
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
  if (fields.serviceType !== "digital" && !fields.location.trim()) {
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
