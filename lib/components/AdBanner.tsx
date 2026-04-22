// lib/components/AdBanner.tsx
//
// Google AdMob banner ad — shown above the Featured section on the Services home.
//
// ── Setup (do this once) ──────────────────────────────────────────────────────
// 1. Install:
//      npx expo install react-native-google-mobile-ads
//
// 2. Add to app.json under "plugins":
//      ["react-native-google-mobile-ads", {
//        "androidAppId": "ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx",
//        "iosAppId":     "ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx"
//      }]
//
// 3. Add to .env:
//      EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
//      EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
//
// 4. When ready for production, replace TEST_IDs below with your real unit IDs
//    from AdMob dashboard (Apps → your app → Ad units → Create ad unit → Banner).
//
// 5. Rebuild the dev client:
//      npx expo run:android   or   npx expo run:ios
//    (This package requires a native build — Expo Go will not work.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { COLORS } from "../constants/theme";

// ── Ad unit IDs ───────────────────────────────────────────────────────────────
// During development these always resolve to test ads.
// Swap for real IDs (from .env) before publishing.

const PROD_ANDROID_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? "";
const PROD_IOS_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? "";

const IS_DEV = __DEV__;

const AD_UNIT_ID = IS_DEV
  ? Platform.OS === "ios"
    ? "ca-app-pub-3940256099942544/2934735716" // iOS test banner ID
    : "ca-app-pub-3940256099942544/6300978111" // Android test banner ID
  : Platform.OS === "ios"
    ? PROD_IOS_ID
    : PROD_ANDROID_ID;

// ── Component ─────────────────────────────────────────────────────────────────

type AdBannerProps = {
  /** Extra top/bottom margin around the banner. Defaults to 0. */
  marginVertical?: number;
};

export default function AdBanner({ marginVertical = 0 }: AdBannerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Don't render anything if no ad unit ID is configured in production
  if (!IS_DEV && !AD_UNIT_ID) return null;

  // Don't render the container until the ad has loaded successfully
  // to avoid showing an empty gap
  return (
    <View
      collapsable={false}
      style={{
        marginVertical,
        // Hide container until ad loads to prevent layout jump
        minHeight: loaded ? undefined : 0,
        overflow: "hidden",
        alignItems: "center",
        backgroundColor: loaded ? COLORS.slate50 : "transparent",
        borderRadius: loaded ? 12 : 0,
      }}
    >
      {/* Dev label — only visible during development */}
      {IS_DEV && loaded && (
        <View
          style={{
            position: "absolute",
            top: 2,
            right: 6,
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: 4,
            paddingHorizontal: 5,
            paddingVertical: 1,
            zIndex: 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
            TEST AD
          </Text>
        </View>
      )}

      {!failed && (
        // collapsable={false} is required on New Architecture (Fabric / RN 0.71+).
        // Without it, Fabric may collapse the host view and crash with:
        // "IllegalStateException: addViewAt: failed to insert view"
        <View collapsable={false}>
          <BannerAd
            unitId={AD_UNIT_ID}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdLoaded={() => setLoaded(true)}
            onAdFailedToLoad={(error) => {
              // Silently fail — no empty space shown to user
              console.warn("AdMob banner failed to load:", error.message);
              setFailed(true);
            }}
          />
        </View>
      )}
    </View>
  );
}
