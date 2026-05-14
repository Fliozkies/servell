// app/profile/[userId].tsx
// Viewer route: navigated to when a user taps a provider's name/avatar
// anywhere in the app (service detail, review, comment).
// Passes the userId param down to ProfileScreen which handles both
// "own profile" and "someone else's profile" modes.

import { useLocalSearchParams } from "expo-router";
import { ScrollDirectionProvider } from "../../lib/context/ScrollDirectionContext";
import ProfileScreen from "../screens/ProfileScreen";

export default function PublicProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return (
    <ScrollDirectionProvider>
      <ProfileScreen viewedUserId={userId} />
    </ScrollDirectionProvider>
  );
}
