/**
 * Image picking and uploading helpers.
 *
 * Extracted from lib/functions/create_service.tsx so that image
 * utilities can be imported independently (e.g. by chat.tsx) without
 * pulling in service-specific logic.
 */
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { supabase } from "../api/supabase";

/** Opens the system image picker and sets the selected URI. */
export async function pickImage(
  setSelectedImage: (uri: string | null) => void,
): Promise<void> {
  try {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "We need camera roll permissions to upload images.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  } catch {
    Alert.alert("Error", "Failed to pick image");
  }
}

/** Uploads a local image URI to a Supabase Storage bucket and returns its public URL. */
export async function uploadImage(
  imageUri: string,
  bucket: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const fileExt = imageUri.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const response = await fetch(imageUri);
  const arrayBuffer = await response.arrayBuffer();

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
}
