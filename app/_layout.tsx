import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { initRealtimeAuth } from "../lib/api/messaging.api";
import { supabase } from "../lib/api/supabase";
import { ErrorBoundary } from "../lib/components/ErrorBoundary";

export default function RootLayout() {
  useEffect(() => {
    void initRealtimeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <KeyboardProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            {/* Service detail is a full-screen push route */}
            <Stack.Screen name="service/[id]" />
            {/* Chat is a full-screen push route */}
            <Stack.Screen name="chat/[conversationId]" />
            {/* Full service list — Top Rated, Nearest, by Category */}
            <Stack.Screen name="services-list/index" />
          </Stack>
        </KeyboardProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
