import { Camera, Check, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/theme";
import { Profile } from "../types/database.types";
import { PickedImage, pickImage, uploadImage } from "../utils/imageUtils";
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
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [saveButtonAnim] = useState(() => new Animated.Value(0));

  // Reset selected image when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedImage(null);
      saveButtonAnim.setValue(0);
    }
  }, [visible, saveButtonAnim]);

  // Animate save button in when an image is selected
  useEffect(() => {
    if (selectedImage) {
      Animated.spring(saveButtonAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      saveButtonAnim.setValue(0);
    }
  }, [selectedImage, saveButtonAnim]);

  const handleImagePick = useCallback(async () => {
    try {
      await pickImage(setSelectedImage);
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Could not open image picker. Please try again.");
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedImage) return;

    setUploading(true);
    try {
      const uploadedUrl = await uploadImage(selectedImage, "profile-images");
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
  }, [selectedImage, onImageUpdate, onClose]);

  const handleDiscard = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Display the selected image preview, or fall back to existing profile image
  const displayImageUrl = selectedImage?.uri || profile?.profile_image_url;

  const saveScale = saveButtonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

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

          {/* Buttons area */}
          <View style={styles.buttonsContainer}>
            {selectedImage ? (
              /* Image selected — show Save & Discard */
              <>
                <Animated.View
                  style={{
                    opacity: saveButtonAnim,
                    transform: [{ scale: saveScale }],
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={uploading}
                    style={styles.saveButton}
                    activeOpacity={0.8}
                  >
                    {uploading ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.saveButtonText}>Saving...</Text>
                      </>
                    ) : (
                      <>
                        <Check size={22} color="white" strokeWidth={2.5} />
                        <Text style={styles.saveButtonText}>Save Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {!uploading && (
                  <Animated.View style={{ opacity: saveButtonAnim }}>
                    <TouchableOpacity
                      onPress={handleImagePick}
                      style={styles.changeButton}
                      activeOpacity={0.8}
                    >
                      <Camera size={18} color="white" strokeWidth={2.5} />
                      <Text style={styles.changeButtonText}>
                        Choose Different
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {!uploading && (
                  <Animated.View style={{ opacity: saveButtonAnim }}>
                    <TouchableOpacity
                      onPress={handleDiscard}
                      style={styles.discardButton}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.discardButtonText}>Discard</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </>
            ) : (
              /* No image selected — show Upload / Change button */
              <TouchableOpacity
                onPress={handleImagePick}
                disabled={uploading}
                style={styles.uploadButton}
                activeOpacity={0.8}
              >
                <Camera size={22} color="white" strokeWidth={2.5} />
                <Text style={styles.uploadButtonText}>
                  {profile?.profile_image_url ? "Change Photo" : "Upload Photo"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

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
  },
  buttonsContainer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },
  uploadButton: {
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
  saveButton: {
    backgroundColor: "#1877F2",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 17,
    marginLeft: 10,
  },
  changeButton: {
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeButtonText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
    fontSize: 15,
  },
  discardButton: {
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  discardButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "600",
    fontSize: 14,
  },
  helperText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
    lineHeight: 20,
  },
});
