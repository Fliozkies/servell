import { Stack } from "expo-router";
import "../../global.css";

/**
 * Layout for the authenticated part of the app.
 * Renamed from `juarez_app` to `(main)` to follow Expo Router conventions
 * and remove the project-specific developer alias from route paths.
 */
export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
