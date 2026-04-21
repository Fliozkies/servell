import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Linking, StyleSheet } from "react-native";
import { supabase } from "../lib/api/supabase";
import { AuthSuccessModal } from "../lib/components/AuthSuccessModal";

/**
 * Auth-gate with splash video.
 * 1. Plays the 5s splash video on a white background.
 * 2. While video plays, the session check runs in parallel.
 * 3. After the video ends (or 5.5s max), fades out then navigates.
 */
export default function Index() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();

  const pendingRoute = useRef<"/(main)" | "/(auth)/auth" | null>(null);
  const videoFinished = useRef(false);
  const authResolved = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(
    require("../assets/videos/logoV2_3.mp4"),
    (p) => {
      p.loop = false;
      p.muted = true;
      p.play();
    },
  );

  const finishSplash = useCallback(() => {
    if (!pendingRoute.current) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.replace(pendingRoute.current!);
    });
  }, [fadeAnim]);

  useEffect(() => {
    const sub = player.addListener("playingChange", (isPlaying) => {
      if (!isPlaying && !videoFinished.current) {
        videoFinished.current = true;
        if (authResolved.current) finishSplash();
      }
    });

    // Safety fallback: 5.5s max
    const timeout = setTimeout(() => {
      if (!videoFinished.current) {
        videoFinished.current = true;
        if (authResolved.current) finishSplash();
      }
    }, 5500);

    return () => {
      sub.remove();
      clearTimeout(timeout);
    };
  }, [player, finishSplash]);

  useEffect(() => {
    let authListener: any;

    const initAuth = async () => {
      const { data: authData } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            const isEmailConfirmation = session.user.email_confirmed_at;
            if (isEmailConfirmation) {
              setAuthSuccess(true);
              setAuthMessage(
                "Your email has been confirmed! Welcome to Servell 🎉",
              );
              setShowAuthModal(true);
            }
            pendingRoute.current = "/(main)";
          } else if (event === "SIGNED_OUT") {
            pendingRoute.current = "/(auth)/auth";
          }
        },
      );

      authListener = authData.subscription;

      const { data, error } = await supabase.auth.getSession();
      pendingRoute.current =
        !error && data.session ? "/(main)" : "/(auth)/auth";

      authResolved.current = true;
      if (videoFinished.current) finishSplash();
    };

    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url.includes("error=")) {
        setAuthSuccess(false);
        setAuthMessage(
          "Email confirmation failed. Please try again or contact support.",
        );
        setShowAuthModal(true);
      } else if (url.includes("token_hash=") && url.includes("type=")) {
        const urlObj = new URL(url.replace("servell://", "https://temp.com"));
        const tokenHash = urlObj.searchParams.get("token_hash");
        const type = urlObj.searchParams.get("type");
        if (tokenHash && type) {
          try {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any,
            });
            if (error) throw error;
            setAuthSuccess(true);
            setAuthMessage(
              "Your email has been confirmed! Welcome to Servell 🎉",
            );
            setShowAuthModal(true);
            pendingRoute.current = "/(main)";
            setTimeout(() => router.replace("/(main)"), 300);
          } catch (error: any) {
            setAuthSuccess(false);
            setAuthMessage(error.message || "Verification failed");
            setShowAuthModal(true);
          }
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    initAuth();

    return () => {
      authListener?.unsubscribe();
      subscription?.remove();
    };
  }, [finishSplash]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <AuthSuccessModal
        visible={showAuthModal}
        success={authSuccess}
        onClose={() => setShowAuthModal(false)}
        message={authMessage}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
