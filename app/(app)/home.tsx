import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/api/supabase";

export default function Home() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("./(auth)/auth");
  }

  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-3xl font-bold mb-4">Welcome Home! 🎉</Text>
      <Text className="text-gray-600 mb-8 text-center">
        You&apos;re successfully logged in
      </Text>

      <TouchableOpacity
        className="bg-red-500 rounded-lg py-3 px-8"
        onPress={handleLogout}
      >
        <Text className="text-white font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
