import { Bell } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/theme";

type ServicesHeaderProps = {
  onNotificationPress: () => void;
  unreadNotifications?: number;
};

export default function ServicesHeader({
  onNotificationPress,
  unreadNotifications = 0,
}: ServicesHeaderProps) {
  const badgeCount =
    unreadNotifications > 99
      ? "99+"
      : unreadNotifications > 0
        ? String(unreadNotifications)
        : null;
  const isWideBadge = badgeCount !== null && badgeCount.length > 1;

  return (
    <View className="bg-white flex-row items-center justify-between px-4 pt-3 pb-3">
      <Text
        className="text-[28px] font-bold text-slate-900"
        style={{ letterSpacing: -0.5 }}
      >
        Servell
      </Text>

      <TouchableOpacity
        onPress={onNotificationPress}
        activeOpacity={0.7}
        style={{ position: "relative" }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: COLORS.slate200,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell size={20} color={COLORS.slate600} strokeWidth={2} />
        </View>
        {badgeCount && (
          <View
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              backgroundColor: COLORS.danger,
              borderRadius: 10,
              minWidth: isWideBadge ? 20 : 18,
              height: 18,
              paddingHorizontal: isWideBadge ? 4 : 0,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#fff",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: "700",
                lineHeight: 12,
              }}
            >
              {badgeCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
