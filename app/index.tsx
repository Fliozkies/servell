import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { supabase } from "../lib/api/supabase";
import { AuthSuccessModal } from "../lib/components/AuthSuccessModal";
import { COLORS } from "../lib/constants/theme";

/**
 * Auth-gate: redirects to the correct route on cold start.
 * Business logic (session check) is kept minimal — all auth state
 * management lives in the Supabase client.
 *
 * Also handles deep links for email confirmation with proper token verification.
 */
export default function Index() {
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();

  useEffect(() => {
    let authListener: any;

    const initAuth = async () => {
      // Listen for auth state changes (including email confirmation)
      const { data: authData } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth event:", event);

          // Handle email confirmation via deep link
          if (event === "SIGNED_IN" && session) {
            // Check if this is coming from email confirmation
            const isEmailConfirmation = session.user.email_confirmed_at;

            if (isEmailConfirmation) {
              setAuthSuccess(true);
              setAuthMessage(
                "Your email has been confirmed! Welcome to Servell 🎉",
              );
              setShowAuthModal(true);

              // Navigate to main after showing modal
              setTimeout(() => {
                router.replace("/(main)");
              }, 300);
            } else {
              router.replace("/(main)");
            }
          } else if (event === "SIGNED_OUT") {
            router.replace("/(auth)/auth");
          } else if (event === "TOKEN_REFRESHED") {
            // Silent token refresh, no action needed
          } else if (event === "USER_UPDATED") {
            // User data updated, check if we should show feedback
          }
        },
      );

      authListener = authData.subscription;

      // Check initial session
      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session) {
        router.replace("/(main)");
      } else {
        router.replace("/(auth)/auth");
      }

      setLoading(false);
    };

    // Update the handleDeepLink function in index.tsx
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log("Deep link received:", url);

      // Parse URL to check for errors or tokens
      if (url.includes("error=")) {
        // Email confirmation failed
        setAuthSuccess(false);
        setAuthMessage(
          "Email confirmation failed. Please try again or contact support.",
        );
        setShowAuthModal(true);
      } else if (url.includes("token_hash=") && url.includes("type=")) {
        // Extract token and type from URL
        const urlObj = new URL(url.replace("servell://", "https://temp.com"));
        const tokenHash = urlObj.searchParams.get("token_hash");
        const type = urlObj.searchParams.get("type");

        if (tokenHash && type) {
          try {
            // Verify the token with Supabase
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any,
            });

            if (error) throw error;

            // Success! Show modal
            setAuthSuccess(true);
            setAuthMessage(
              "Your email has been confirmed! Welcome to Servell 🎉",
            );
            setShowAuthModal(true);

            // Navigate after modal
            setTimeout(() => {
              router.replace("/(main)");
            }, 300);
          } catch (error: any) {
            console.error("Token verification error:", error);
            setAuthSuccess(false);
            setAuthMessage(error.message || "Verification failed");
            setShowAuthModal(true);
          }
        }
      }
    };

    // Listen for deep link events (app is already open)
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL:", url);
        handleDeepLink({ url });
      }
    });

    initAuth();

    return () => {
      authListener?.unsubscribe();
      subscription?.remove();
    };
  }, []);

  const handleModalClose = () => {
    setShowAuthModal(false);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <AuthSuccessModal
        visible={showAuthModal}
        success={authSuccess}
        onClose={handleModalClose}
        message={authMessage}
      />
    </>
  );
}
