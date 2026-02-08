import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../lib/api/supabase";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        router.replace("./(auth)/auth");
      } else if (data.session) {
        router.replace("./juarez_app");
      } else {
        router.replace("./(auth)/auth");
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}
