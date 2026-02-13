import { Camera, X } from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../constants/theme";
import { Profile } from "../types/database.types";
import { uploadImage } from "../utils/imageUtils";
import { ProfileAvatar } from "./ui/ProfileAvatar";

interface ProfileImageModalProps {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  onImageUpdate: (newUrl: string) => Promise<void>;
}

const { width } = Dimensions.get("window");

export const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  visible,
  onClose,
  profile,
  onImageUpdate,
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImagePick = async () => {
    try {
      // Use the existing pickImage utility from imageUtils
      const { pickImage: pickImageUtil } = await import("../utils/imageUtils");

      await pickImageUtil(setSelectedImage);

      // If image was selected, upload it
      if (selectedImage) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadImage(
            selectedImage,
            "profile-images",
          );
          await onImageUpdate(uploadedUrl);
          Alert.alert("Success", "Profile picture updated successfully!");
          setSelectedImage(null);
          onClose();
        } catch (error: any) {
          console.error("Upload error:", error);
          Alert.alert(
            "Upload Failed",
            error?.message || "Could not upload image. Please try again.",
          );
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Could not open image picker. Please try again.");
    }
  };

  // Use the uploaded image if available, otherwise use selectedImage for preview
  const displayImageUrl = selectedImage || profile?.profile_image_url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Close button - top right */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.8}
        >
          <X size={28} color="white" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Profile image viewer - large and centered */}
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
            <ProfileAvatar
              profile={
                displayImageUrl && profile
                  ? { ...profile, profile_image_url: displayImageUrl }
                  : profile
              }
              size={Math.min(width * 0.85, 340)}
              textSize={120}
            />
          </View>

          {/* Upload button */}
          <TouchableOpacity
            onPress={handleImagePick}
            disabled={uploading}
            style={styles.uploadButton}
            activeOpacity={0.8}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Camera size={22} color="white" strokeWidth={2.5} />
                <Text style={styles.uploadButtonText}>
                  {profile?.profile_image_url ? "Change Photo" : "Upload Photo"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Choose a photo that represents you.{"\n"}Square images work best.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  imageContainer: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#1877F2",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  uploadButton: {
    marginTop: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 17,
    marginLeft: 10,
  },
  helperText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
    lineHeight: 20,
  },
});
