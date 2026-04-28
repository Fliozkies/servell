import { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

// ── Single shimmer block ──────────────────────────────────────────────────────

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export const SkeletonBox = ({
  width = "100%",
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#e2e8f0",
          opacity,
        },
        style,
      ]}
    />
  );
};

// ── ServicesScreen skeleton ───────────────────────────────────────────────────

const COLUMN_WIDTH = "48%";

const FeaturedCardSkeleton = () => (
  <SkeletonBox height={220} borderRadius={20} style={{ marginBottom: 16 }} />
);

const GridCardSkeleton = () => (
  <View
    style={{
      width: COLUMN_WIDTH,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 10,
      backgroundColor: "#f8fafc",
      borderWidth: 0.5,
      borderColor: "#e2e8f0",
    }}
  >
    <SkeletonBox width="100%" height={110} borderRadius={0} />
    <View style={{ padding: 10, gap: 6 }}>
      <SkeletonBox height={13} width="80%" />
      <SkeletonBox height={11} width="50%" />
      <SkeletonBox height={11} width="60%" />
    </View>
  </View>
);

export const ServicesScreenSkeleton = ({
  listHeader,
}: {
  listHeader?: React.ReactNode;
}) => (
  <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
    {listHeader}
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {/* Featured section title */}
      <SkeletonBox height={18} width="40%" style={{ marginBottom: 12 }} />
      {/* Featured card */}
      <FeaturedCardSkeleton />
      {/* Grid section title */}
      <SkeletonBox height={18} width="30%" style={{ marginBottom: 12 }} />
      {/* Grid rows */}
      {[0, 1, 2].map((row) => (
        <View
          key={row}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <GridCardSkeleton />
          <GridCardSkeleton />
        </View>
      ))}
    </View>
  </View>
);

// ── ProfileScreen skeleton ────────────────────────────────────────────────────

export const ProfileScreenSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>
    {/* Header */}
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
      }}
    >
      {/* Avatar + name/bio row */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <SkeletonBox width={96} height={96} borderRadius={48} />
        <View style={{ marginLeft: 16, flex: 1, gap: 8 }}>
          <SkeletonBox height={22} width="60%" />
          <SkeletonBox height={14} width="85%" />
          <SkeletonBox height={14} width="50%" />
        </View>
      </View>
      {/* Stats row */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 20,
          backgroundColor: "#f8fafc",
          borderRadius: 16,
          padding: 16,
          gap: 8,
        }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <SkeletonBox height={20} width="50%" />
            <SkeletonBox height={12} width="70%" />
          </View>
        ))}
      </View>
    </View>
    {/* Tabs */}
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingHorizontal: 20,
        gap: 24,
      }}
    >
      {[0, 1, 2].map((i) => (
        <SkeletonBox
          key={i}
          height={14}
          width={60}
          style={{ marginBottom: 12 }}
        />
      ))}
    </View>
    {/* Service cards */}
    <View style={{ padding: 16, gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: "#e2e8f0",
            overflow: "hidden",
          }}
        >
          <SkeletonBox height={110} borderRadius={0} />
          <View style={{ padding: 12, gap: 6 }}>
            <SkeletonBox height={14} width="70%" />
            <SkeletonBox height={12} width="40%" />
          </View>
        </View>
      ))}
    </View>
  </View>
);

// ── NotificationScreen skeleton ───────────────────────────────────────────────

const NotificationItemSkeleton = () => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      gap: 12,
    }}
  >
    <SkeletonBox width={44} height={44} borderRadius={22} />
    <View style={{ flex: 1, gap: 6 }}>
      <SkeletonBox height={13} width="80%" />
      <SkeletonBox height={11} width="50%" />
    </View>
  </View>
);

export const NotificationScreenSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <NotificationItemSkeleton key={i} />
    ))}
  </View>
);

// ── ConversationsScreen skeleton ──────────────────────────────────────────────

const ConversationItemSkeleton = () => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      gap: 12,
    }}
  >
    <SkeletonBox width={48} height={48} borderRadius={24} />
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <SkeletonBox height={14} width="45%" />
        <SkeletonBox height={11} width="20%" />
      </View>
      <SkeletonBox height={12} width="70%" />
    </View>
  </View>
);

export const ConversationsScreenSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <ConversationItemSkeleton key={i} />
    ))}
  </View>
);

// ── CommentsTab skeleton ──────────────────────────────────────────────────────

const CommentItemSkeleton = () => (
  <View
    style={{
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      padding: 16,
      gap: 8,
    }}
  >
    {/* Avatar + name row */}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <SkeletonBox width={36} height={36} borderRadius={18} />
      <View style={{ flex: 1, gap: 5 }}>
        <SkeletonBox height={13} width="40%" />
        <SkeletonBox height={11} width="25%" />
      </View>
    </View>
    {/* Comment text lines */}
    <SkeletonBox height={12} width="95%" />
    <SkeletonBox height={12} width="75%" />
  </View>
);

export const CommentsTabSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <CommentItemSkeleton key={i} />
    ))}
  </View>
);

// ── ReviewsTab skeleton ───────────────────────────────────────────────────────

const ReviewItemSkeleton = () => (
  <View
    style={{
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      padding: 16,
      gap: 8,
    }}
  >
    {/* Avatar + name + stars row */}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 5 }}>
        <SkeletonBox height={13} width="45%" />
        <SkeletonBox height={11} width="30%" />
      </View>
      <SkeletonBox width={72} height={14} borderRadius={6} />
    </View>
    {/* Review text lines */}
    <SkeletonBox height={12} width="95%" />
    <SkeletonBox height={12} width="80%" />
    <SkeletonBox height={12} width="55%" />
  </View>
);

export const ReviewsTabSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <ReviewItemSkeleton key={i} />
    ))}
  </View>
);
