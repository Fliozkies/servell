// lib/components/BottomNav.tsx
import {
  Home,
  LucideProps,
  Map,
  MessageSquare,
  Plus,
  User,
} from "lucide-react-native";
import React, { memo, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/theme";
import { useScrollDirection } from "../context/ScrollDirectionContext";
import { PageName } from "../types/custom.types";
import { formatBadge } from "../utils/format";

interface BottomNavProps {
  currentTab: PageName;
  onTabPress: (name: PageName) => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}

/**
 * Scale a base value by the ratio of the screen width to a 390-pt baseline
 * (iPhone 14 width), clamped between 0.85× and 1.25× so it never looks
 * absurd on very small or very large screens.
 */
function useResponsiveScale() {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width / 390, 0.85), 1.25);
}

const BottomNav = memo(function BottomNav({
  currentTab,
  onTabPress,
  unreadMessages = 0,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const { subscribe } = useScrollDirection();
  const scale = useResponsiveScale();

  // Responsive spacing values
  const bottomMargin = Math.max(insets.bottom + Math.round(16 * scale), 24);
  const sideMargin = Math.round(16 * scale);
  const borderRadius = Math.round(28 * scale);
  const paddingV = Math.round(10 * scale);

  /** How far to slide down when hidden — nav height + bottom margin */
  const HIDE_DISTANCE = 110 + bottomMargin;

  // Starts visible (translateY = 0), slides down to hide
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = subscribe((dir) => {
      Animated.timing(translateY, {
        toValue: dir === "down" ? HIDE_DISTANCE : 0,
        duration: 280,
        easing: Easing.bezier(0.4, 0, 0.2, 1), // Material Design standard curve
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [subscribe, translateY, HIDE_DISTANCE]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: bottomMargin,
        left: sideMargin,
        right: sideMargin,
        backgroundColor: "#FFFFFF",
        borderRadius,
        paddingVertical: paddingV,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 8,
        }}
      >
        <NavButton
          name="Services"
          active={currentTab === "Services"}
          onPress={() => onTabPress("Services")}
          icon={<Home size={26} />}
        />

        <NavButton
          name="Map"
          active={currentTab === "Map"}
          onPress={() => onTabPress("Map")}
          icon={<Map size={26} />}
        />

        <NavButton
          name="Post"
          active={currentTab === "Post"}
          onPress={() => onTabPress("Post")}
          icon={<Plus size={26} />}
          isPost
        />

        <NavButton
          name="Message"
          active={currentTab === "Message"}
          onPress={() => onTabPress("Message")}
          icon={<MessageSquare size={26} />}
          badgeCount={unreadMessages}
        />

        <NavButton
          name="Profile"
          active={currentTab === "Profile"}
          onPress={() => onTabPress("Profile")}
          icon={<User size={26} />}
        />
      </View>
    </Animated.View>
  );
});

// ── NavButton ─────────────────────────────────────────────────────────────────

const NavButton = memo(function NavButton({
  icon,
  active,
  onPress,
  badgeCount = 0,
  isPost = false,
}: {
  icon: React.ReactElement<LucideProps>;
  active: boolean;
  onPress: () => void;
  name: string;
  badgeCount?: number;
  isPost?: boolean;
}) {
  const badge = formatBadge(badgeCount);
  const isWide = badge.length > 1;

  // Icon scale — shared by all buttons
  const iconScale = useRef(new Animated.Value(active ? 1.15 : 1)).current;

  // Regular tab: animated pill background
  const pillScale = useRef(new Animated.Value(active ? 1 : 0.6)).current;
  const pillOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  // Post button: press-scale + icon rotation
  const postPressScale = useRef(new Animated.Value(1)).current;
  const postRotation = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    // Icon scale spring (all buttons)
    Animated.spring(iconScale, {
      toValue: active ? 1.18 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 7,
    }).start();

    if (isPost) {
      // Rotate + → × when active
      Animated.spring(postRotation, {
        toValue: active ? 1 : 0,
        useNativeDriver: true,
        tension: 70,
        friction: 7,
      }).start();
    } else {
      // Pill pop-in / pop-out
      Animated.parallel([
        Animated.spring(pillScale, {
          toValue: active ? 1 : 0.6,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(pillOpacity, {
          toValue: active ? 1 : 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active, iconScale, isPost, pillOpacity, pillScale, postRotation]);

  const rotate = postRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const handlePressIn = () => {
    Animated.spring(postPressScale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 120,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(postPressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 5,
    }).start();
    onPress();
  };

  // ── Post (FAB-style) button ────────────────────────────────────────────────
  if (isPost) {
    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: COLORS.primary ?? "#2563EB",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: postPressScale }],
            shadowColor: COLORS.primary ?? "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.38,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            {React.cloneElement(icon, {
              color: "#FFFFFF",
              strokeWidth: 2.5,
            })}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // ── Regular tab button ─────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center justify-center py-2.5 px-5"
    >
      {/* Animated pill highlight */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 999,
          backgroundColor: "rgba(24, 119, 242, 0.15)",
          opacity: pillOpacity,
          transform: [{ scale: pillScale }],
        }}
      />

      <View className="relative">
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          {React.cloneElement(icon, {
            color: active ? COLORS.primary : COLORS.slate400,
            strokeWidth: active ? 2.5 : 2,
          })}
        </Animated.View>

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
    </TouchableOpacity>
  );
});

export default BottomNav;
