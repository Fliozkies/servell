import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/api/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

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
      router.replace("../juarez_app");
    }
  }

  async function handleRegister() {
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match");
      return;
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

    if (error || !data.user) {
      setLoading(false);
      Alert.alert("Registration Error", error?.message ?? "Unknown error");
      return;
    }

    setLoading(false);

    Alert.alert("Registration Successful", "Check your email", [
      { text: "OK", onPress: () => setActiveTab("login") },
    ]);
  }

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold mb-8 text-center">
        {activeTab === "login" ? "Welcome Back!" : "Create Account"}
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {activeTab === "register" && (
        <>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
        </>
      )}

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {activeTab === "register" && (
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      )}

      <TouchableOpacity
        className="bg-blue-500 rounded-lg py-3 mb-4"
        onPress={activeTab === "login" ? handleLogin : handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {loading
            ? activeTab === "login"
              ? "Logging in..."
              : "Signing up..."
            : activeTab === "login"
              ? "Login"
              : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          setActiveTab(activeTab === "login" ? "register" : "login")
        }
      >
        <Text className="text-blue-500 text-center">
          {activeTab === "login"
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
