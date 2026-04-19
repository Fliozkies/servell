/**
 * Image picking and uploading helpers.
 *
 * Extracted from lib/functions/create_service.tsx so that image
 * utilities can be imported independently (e.g. by chat.tsx) without
 * pulling in service-specific logic.
 */
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { supabase } from "../api/supabase";

export interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

/**
 * Opens the system image picker.
 * Returns a PickedImage object (uri + base64 + mimeType) instead of
 * just the URI, because Supabase Storage on React Native requires
 * ArrayBuffer decoded from base64 — Blob/File/FormData don't work.
 */
export async function pickImage(
  setSelectedImage: (image: PickedImage | null) => void,
): Promise<void> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      base64: true, // Needed for ArrayBuffer upload
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage({
        uri: result.assets[0].uri,
        base64: result.assets[0].base64,
        mimeType: result.assets[0].mimeType ?? "image/jpeg",
      });
    }
  } catch {
    Alert.alert("Error", "Failed to pick image");
  }
}

/**
 * Uploads a PickedImage to Supabase Storage and returns its public URL.
 * Uses ArrayBuffer decoded from base64 — the only reliable method in RN.
 */
export async function uploadImage(
  image: PickedImage,
  bucket: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const fileExt = image.uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const arrayBuffer = decode(image.base64);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, {
      contentType: image.mimeType,
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return publicUrl;
}
