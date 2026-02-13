import React from "react";
import { Image, Text, View } from "react-native";
import { Profile } from "../../types/database.types";

interface ProfileAvatarProps {
  profile: Profile | null | undefined;
  size?: number;
  textSize?: number;
}

/**
 * Reusable ProfileAvatar component that displays profile pictures or initials.
 * Used across Comments, Reviews, and Profile screens for consistency.
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 40,
  textSize,
}) => {
  const getInitials = (profile: Profile | null | undefined): string => {
    if (!profile?.first_name) return "?";

    const firstName = profile.first_name.trim();
    const lastName = profile.last_name?.trim() || "";

    if (!lastName) {
      return firstName.charAt(0).toUpperCase();
    }

    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const initials = getInitials(profile);
  const calculatedTextSize = textSize || Math.floor(size * 0.4);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: profile?.profile_image_url ? "transparent" : "#1877F2",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {profile?.profile_image_url ? (
        <Image
          source={{ uri: profile.profile_image_url }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            color: "white",
            fontSize: calculatedTextSize,
            fontWeight: "bold",
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};
