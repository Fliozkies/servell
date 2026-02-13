import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/api/supabase";
import { COLORS } from "../../lib/constants/theme";

type AuthTab = "login" | "register";

export default function AuthScreen() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login Error", error.message);
    } else {
      router.replace("/(main)");
    }
  }

  async function handleRegister() {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    } else if (password.length < 6) {
      Alert.alert("Error", "Password is too short");
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    setLoading(false);
    if (error || !data.user) {
      Alert.alert("Registration Error", error?.message ?? "Unknown error");
      return;
    }
    Alert.alert("Registration Successful", "Check your email to confirm.", [
      { text: "OK", onPress: () => setTab("login") },
    ]);
  }

  const INPUT_CLASS =
    "border border-slate-300 rounded-xl px-4 py-3 mb-4 text-slate-900";

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold mb-8 text-center text-slate-900">
        {tab === "login" ? "Welcome Back!" : "Create Account"}
      </Text>

      <TextInput
        className={INPUT_CLASS}
        placeholder="Email"
        placeholderTextColor={COLORS.slate400}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {tab === "register" && (
        <>
          <TextInput
            className={INPUT_CLASS}
            placeholder="First Name"
            placeholderTextColor={COLORS.slate400}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            className={INPUT_CLASS}
            placeholder="Last Name"
            placeholderTextColor={COLORS.slate400}
            value={lastName}
            onChangeText={setLastName}
          />
        </>
      )}

      <TextInput
        className={INPUT_CLASS}
        placeholder="Password"
        placeholderTextColor={COLORS.slate400}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {tab === "register" && (
        <TextInput
          className={INPUT_CLASS}
          placeholder="Confirm Password"
          placeholderTextColor={COLORS.slate400}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      )}

      <TouchableOpacity
        className="bg-[#1877F2] rounded-xl py-3 mb-4"
        onPress={tab === "login" ? handleLogin : handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {loading
            ? tab === "login"
              ? "Logging in…"
              : "Signing up…"
            : tab === "login"
              ? "Login"
              : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setTab(tab === "login" ? "register" : "login")}
      >
        <Text className="text-[#1877F2] text-center">
          {tab === "login"
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
