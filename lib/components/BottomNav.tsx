// lib/components/BottomNav.tsx
import {
  Home,
  LucideProps,
  Map,
  MessageSquare,
  Plus,
  User,
} from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/theme";
import { PageName } from "../types/custom.types";
import { formatBadge } from "../utils/format";

interface BottomNavProps {
  currentTab: PageName;
  onTabPress: (name: PageName) => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}

const BottomNav = memo(function BottomNav({
  currentTab,
  onTabPress,
  unreadMessages = 0,
  unreadNotifications = 0,
}: BottomNavProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between px-2 py-2">
        <NavButton
          name="Services"
          label="Services"
          active={currentTab === "Services"}
          onPress={() => onTabPress("Services")}
          icon={<Home size={22} />}
        />

        <NavButton
          name="Map"
          label="Map"
          active={currentTab === "Map"}
          onPress={() => onTabPress("Map")}
          icon={<Map size={22} />}
        />

        {/* Central FAB */}
        <TouchableOpacity
          onPress={() => onTabPress("Post")}
          activeOpacity={0.8}
          className="bg-[#1877F2] w-10 h-10 rounded-full justify-center items-center"
          style={{
            shadowColor: "#818cf8",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
          }}
        >
          <Plus size={30} color="white" strokeWidth={3} />
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
});

// ── NavButton ─────────────────────────────────────────────────────────────────

const NavButton = memo(function NavButton({
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
}) {
  const badge = formatBadge(badgeCount);
  const isWide = badge.length > 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center justify-center px-2 py-1"
    >
      <View className="relative">
        {React.cloneElement(icon, {
          color: active ? COLORS.primary : COLORS.slate400,
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
        className={`text-[10px] mt-1 font-medium ${
          active ? "color-[#1877F2]" : "text-slate-400"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

export default BottomNav;
