import { Stack } from "expo-router";
import "../../global.css";
import { PushNotificationProvider } from "../../lib/components/PushNotificationProvider";
import { ScrollDirectionProvider } from "../../lib/context/ScrollDirectionContext";
/**
 * Layout for the authenticated part of the app.
 * Renamed from `juarez_app` to `(main)` to follow Expo Router conventions
 * and remove the project-specific developer alias from route paths.
 */
export default function MainLayout() {
  return (
    <ScrollDirectionProvider>
      <PushNotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </PushNotificationProvider>
    </ScrollDirectionProvider>
  );
}
