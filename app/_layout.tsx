import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  return (
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
        </Stack>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
