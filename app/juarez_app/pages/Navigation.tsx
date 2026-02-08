import {
  BarChart2,
  Home,
  MessageSquare,
  Plus,
  User,
} from "lucide-react-native";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageName } from "../../../lib/types/custom.types";

const BottomNav = ({
  currentTab,
  onTabPress,
}: {
  currentTab: PageName;
  onTabPress: (name: PageName) => void;
}) => {
  const insets = useSafeAreaInsets();
  const responsivePadding = Platform.OS === "ios" ? insets.bottom : 0;

  return (
    <View
      style={{
        paddingBottom: responsivePadding,
        paddingTop: 12,
      }}
    >
      <View className="flex-row items-center justify-between bg-white/95 px-4 py-3 border border-slate-200 border-b-0">
        <NavButton
          name="Services"
          label="Services"
          active={currentTab === "Services"}
          onPress={() => onTabPress("Services")}
          icon={<Home size={22} />}
        />

        <NavButton
          label="Progress"
          name="Progress"
          active={currentTab === "Progress"}
          onPress={() => onTabPress("Progress")}
          icon={<BarChart2 size={22} />}
        />

        {/* Post Button - Central Action */}
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
  name,
}: {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
  name: string;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center justify-center px-2 py-1"
    >
      {React.cloneElement(icon, {
        color: active ? "#1877F2" : "#94a3b8",
        strokeWidth: active ? 2.5 : 2,
      })}
      <Text
        className={`text-[10px] mt-1 font-medium ${active ? "color-[#1877F2]" : "text-slate-400"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default BottomNav;
