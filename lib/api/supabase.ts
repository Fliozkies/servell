// lib/supabase.ts     ← or src/lib/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage"; // or expo-secure-store for sensitive data
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Required for URL handling in RN

// Use Expo env vars (public keys only!)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Single exported client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
