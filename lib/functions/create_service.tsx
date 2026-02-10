import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { fetchCategories } from "../api/services.api";
import { supabase } from "../api/supabase";
import { Category } from "../types/database.types";

export const loadCategories = async ({
  setLoadingCategories,
  setCategories,
}: {
  setLoadingCategories: (loadingCategories: boolean) => void;
  setCategories: (setCategory: Category[]) => void;
}) => {
  try {
    const data = await fetchCategories();
    setCategories(data);
  } catch (error) {
    console.error("Error loading categories:", error);
    Alert.alert("Error", "Failed to load categories");
  } finally {
    setLoadingCategories(false);
  }
};

// Image picker
export const pickImage = async (
  setSelectedImage: (uri: string | null) => void,
) => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "We need camera roll permissions to upload images.",
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, // Compress to reduce file size
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image");
  }
};

// Add tag
export const addTag = ({
  currentTag,
  tags,
  setTags,
  setCurrentTag,
}: {
  currentTag: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  setCurrentTag: (currentTag: string) => void;
}) => {
  const trimmedTag = currentTag.trim().toLowerCase();

  if (!trimmedTag) return;

  if (tags.includes(trimmedTag)) {
    Alert.alert("Duplicate Tag", "This tag already exists");
    return;
  }

  if (tags.length >= 5) {
    Alert.alert("Limit Reached", "You can only add up to 5 tags");
    return;
  }

  setTags([...tags, trimmedTag]);
  setCurrentTag("");
};

// Remove tag
export const removeTag = (
  tagToRemove: string,
  tags: string[],
  setTags: (tags: string[]) => void,
) => {
  setTags(tags.filter((tag) => tag !== tagToRemove));
};

// Upload image to Supabase Storage
export const uploadImage = async (
  imageUri: string,
  bucket: string,
): Promise<string | null> => {
  try {
    console.log("Starting upload for:", imageUri);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const fileExt = imageUri.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Use ArrayBuffer instead of Blob - more reliable in React Native
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    console.log("ArrayBuffer size:", arrayBuffer.byteLength);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Upload error details:", error);
    throw error;
  }
};

export // Validate form
const validateForm = ({
  title,
  description,
  location,
  selectedCategory,
  price,
}: {
  title: string;
  description: string;
  location: string;
  selectedCategory: string | null;
  price: string;
}): boolean => {
  if (!title.trim()) {
    Alert.alert("Required Field", "Please enter a service title");
    return false;
  }

  if (!description.trim()) {
    Alert.alert("Required Field", "Please enter a description");
    return false;
  }

  if (!location.trim()) {
    Alert.alert("Required Field", "Please enter a location");
    return false;
  }

  if (!selectedCategory) {
    Alert.alert("Required Field", "Please select a category");
    return false;
  }

  // Validate price if provided
  if (price.trim() && isNaN(Number(price))) {
    Alert.alert("Invalid Price", "Please enter a valid number for price");
    return false;
  }

  return true;
};

// Submit form
export const handleSubmit = async ({
  title,
  description,
  location,
  selectedCategory,
  price,
  setLoading,
  selectedImage,
  tags,
  phoneNumber,
  onServiceCreated,
}: {
  title: string;
  description: string;
  location: string;
  selectedCategory: string | null;
  price: string;
  selectedImage: string | null;
  setLoading: (loading: boolean) => void;
  tags: string[];
  phoneNumber: string;
  onServiceCreated: () => void;
}) => {
  if (!validateForm({ title, description, location, selectedCategory, price }))
    return;

  setLoading(true);

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a service");
      setLoading(false);
      return;
    }

    // Upload image if selected
    let imageUrl: string | null = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage, "service-images");
    }

    // Prepare service data
    const serviceData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      price: price.trim() ? parseFloat(price) : null,
      image_url: imageUrl,
      category_id: selectedCategory,
      tags: tags.length > 0 ? tags : null,
      location: location.trim(),
      phone_number: phoneNumber.trim() || null,
      status: "active" as const,
    };

    // Insert into database
    const { error } = await supabase.from("services").insert(serviceData);

    if (error) throw error;

    Alert.alert("Success!", "Your service has been posted successfully", [
      {
        text: "OK",
        onPress: () => {
          onServiceCreated(); // Refresh the services list
        },
      },
    ]);
  } catch (error) {
    console.error("Error creating service:", error);
    Alert.alert("Error", "Failed to create service. Please try again.");
  } finally {
    setLoading(false);
  }
};
