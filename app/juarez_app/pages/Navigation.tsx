import {
  Bell,
  Home,
  LucideProps,
  MessageSquare,
  Plus,
  User,
} from "lucide-react-native";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageName } from "../../../lib/types/custom.types";

/** Caps a badge count at 99, returning "99+" for anything higher */
function formatBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

const BottomNav = ({
  currentTab,
  onTabPress,
  unreadMessages = 0,
  unreadNotifications = 0,
}: {
  currentTab: PageName;
  onTabPress: (name: PageName) => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}) => {
  const insets = useSafeAreaInsets();
  const responsivePadding = Platform.OS === "ios" ? insets.bottom : 0;

  return (
    <View style={{ paddingBottom: responsivePadding }}>
      <View className="flex-row items-center justify-between bg-white/95 px-4 py-3 border border-slate-200 border-b-0">
        <NavButton
          name="Services"
          label="Services"
          active={currentTab === "Services"}
          onPress={() => onTabPress("Services")}
          icon={<Home size={22} />}
        />

        <NavButton
          label="Alerts"
          name="Notification"
          active={currentTab === "Notification"}
          onPress={() => onTabPress("Notification")}
          icon={<Bell size={22} />}
          badgeCount={unreadNotifications}
        />

        {/* Post Button — Central Action */}
        <TouchableOpacity
          onPress={() => onTabPress("Post")}
          activeOpacity={0.8}
          className="bg-[#1877F2] w-14 h-14 rounded-full items-center justify-center -mt-12 border-4 border-slate-50"
          style={{
            shadowColor: "#818cf8",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
          }}
        >
          <Plus size={28} color="white" strokeWidth={3} />
        </TouchableOpacity>

        <NavButton
          label="Message"
          name="Message"
          active={currentTab === "Message"}
          onPress={() => onTabPress("Message")}
          icon={<MessageSquare size={22} />}
          badgeCount={unreadMessages}
        />

        <NavButton
          name="Profile"
          label="Profile"
          active={currentTab === "Profile"}
          onPress={() => onTabPress("Profile")}
          icon={<User size={22} />}
        />
      </View>
    </View>
  );
};

const NavButton = ({
  icon,
  label,
  active,
  onPress,
  badgeCount = 0,
}: {
  icon: React.ReactElement<LucideProps>;
  label: string;
  active: boolean;
  onPress: () => void;
  name: string;
  badgeCount?: number;
}) => {
  const badge = formatBadge(badgeCount);
  const isWide = badge.length > 1; // "99+" needs more horizontal room

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center justify-center px-2 py-1"
    >
      {/* Icon wrapper with badge */}
      <View className="relative">
        {React.cloneElement(icon, {
          color: active ? "#1877F2" : "#94a3b8",
          strokeWidth: active ? 2.5 : 2,
        })}

        {badge ? (
          <View
            className="absolute -top-1.5 -right-2 bg-red-500 rounded-full items-center justify-center"
            style={{
              minWidth: isWide ? 22 : 16,
              height: 16,
              paddingHorizontal: isWide ? 3 : 0,
            }}
          >
            <Text
              className="text-white font-bold"
              style={{ fontSize: 9, lineHeight: 12 }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        className={`text-[10px] mt-1 font-medium ${active ? "color-[#1877F2]" : "text-slate-400"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default BottomNav;
