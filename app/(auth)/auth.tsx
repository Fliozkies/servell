// app/(auth)/auth.tsx
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/api/supabase";
import LocationPicker, {
  SelectedLocation,
} from "../../lib/components/LocationPicker";
import { COLORS } from "../../lib/constants/theme";

type AuthTab = "login" | "register";
type RegisterStep = 1 | 2;

export default function AuthScreen() {
  const [tab, setTab] = useState<AuthTab>("login");

  // ── Login state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── Register state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<RegisterStep>(1);
  const [regEmail, setRegEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [locationError, setLocationError] = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login Error", error.message);
    } else {
      router.replace("/(main)");
    }
  }

  // ── Register step 1 → 2 ───────────────────────────────────────────────────
  function handleNextStep() {
    if (!regEmail.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    if (!firstName.trim()) {
      Alert.alert("Error", "Please enter your first name.");
      return;
    }
    if (regPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match.");
      return;
    }
    setStep(2);
  }

  // ── Register step 2 → submit ───────────────────────────────────────────────
  async function handleRegister() {
    if (!location) {
      setLocationError(true);
      return;
    }
    setLocationError(false);
    setLoading(true);

    // 1. Sign up with Supabase Auth
    // Pass location in metadata so the handle_new_user trigger can write
    // it into the profile row immediately — avoids a separate upsert that
    // would fail because the session isn't active until email is confirmed.
    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          location_text: location.text,
          location_lat: location.lat,
          location_lng: location.lng,
        },
      },
    });

    if (error || !data.user) {
      setLoading(false);
      Alert.alert("Registration Error", error?.message ?? "Unknown error");
      return;
    }

    setLoading(false);

    Alert.alert(
      "Registration Successful",
      "Check your email to confirm your account.",
      [
        {
          text: "OK",
          onPress: () => {
            setTab("login");
            setStep(1);
          },
        },
      ],
    );
  }

  // ── Reset to login ─────────────────────────────────────────────────────────
  function switchToLogin() {
    setTab("login");
    setStep(1);
  }

  // ── Reset to register ──────────────────────────────────────────────────────
  function switchToRegister() {
    setTab("register");
    setStep(1);
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const INPUT_CLASS =
    "border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 mb-3 text-slate-900 text-[14px]";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-10">
          {/* ── Logo / Title ── */}
          <Text
            className="text-[32px] font-bold text-slate-900 text-center mb-1"
            style={{ letterSpacing: -0.5 }}
          >
            Servell
          </Text>
          <Text className="text-slate-500 text-center text-[14px] mb-8">
            {tab === "login"
              ? "Welcome back"
              : step === 1
                ? "Create your account"
                : "Where are you based?"}
          </Text>

          {/* ── Step indicator for registration ── */}
          {tab === "register" && (
            <View className="flex-row items-center justify-center mb-6 gap-2">
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: step === 1 ? COLORS.primary : COLORS.success,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                >
                  {step === 1 ? "1" : "✓"}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor:
                    step === 2 ? COLORS.primary : COLORS.slate200,
                  maxWidth: 40,
                }}
              />
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    step === 2 ? COLORS.primary : COLORS.slate200,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: step === 2 ? "#fff" : COLORS.slate400,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  2
                </Text>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              LOGIN FORM
          ══════════════════════════════════════════════════════════════ */}
          {tab === "login" && (
            <>
              <TextInput
                className={INPUT_CLASS}
                placeholder="Email"
                placeholderTextColor={COLORS.slate400}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                className={INPUT_CLASS}
                placeholder="Password"
                placeholderTextColor={COLORS.slate400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                className="rounded-xl py-3.5 mb-4 mt-1"
                style={{ backgroundColor: COLORS.primary }}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text className="text-white text-center font-semibold text-[15px]">
                  {loading ? "Logging in…" : "Login"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={switchToRegister}>
                <Text className="text-center text-[13px] text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                    Sign up
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              REGISTER — STEP 1: Credentials
          ══════════════════════════════════════════════════════════════ */}
          {tab === "register" && step === 1 && (
            <>
              <TextInput
                className={INPUT_CLASS}
                placeholder="Email"
                placeholderTextColor={COLORS.slate400}
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View className="flex-row gap-3">
                <TextInput
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="First Name"
                  placeholderTextColor={COLORS.slate400}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="Last Name"
                  placeholderTextColor={COLORS.slate400}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
              <TextInput
                className={INPUT_CLASS}
                placeholder="Password"
                placeholderTextColor={COLORS.slate400}
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
              />
              <TextInput
                className={INPUT_CLASS}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.slate400}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                className="rounded-xl py-3.5 mb-4 mt-1"
                style={{ backgroundColor: COLORS.primary }}
                onPress={handleNextStep}
                activeOpacity={0.85}
              >
                <Text className="text-white text-center font-semibold text-[15px]">
                  Next
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={switchToLogin}>
                <Text className="text-center text-[13px] text-slate-500">
                  Already have an account?{" "}
                  <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                    Login
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              REGISTER — STEP 2: Location
          ══════════════════════════════════════════════════════════════ */}
          {tab === "register" && step === 2 && (
            <>
              <Text className="text-[13px] text-slate-500 mb-3 text-center">
                This helps us show you services near you.{"\n"}You can update
                this anytime in your profile.
              </Text>

              {/* Location picker — zIndex needed so dropdown overlaps other elements */}
              <View style={{ zIndex: 100 }}>
                <LocationPicker
                  onLocationSelect={(loc) => {
                    setLocation(loc);
                    setLocationError(false);
                  }}
                  onClear={() => setLocation(null)}
                  error={locationError}
                  errorMessage="Please select your city or municipality."
                />
              </View>

              {/* Selected location confirmation */}
              {location && (
                <View
                  className="mt-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "#f0fdf4" }}
                >
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: COLORS.success }}
                  >
                    📍 {location.text}
                  </Text>
                </View>
              )}

              <View className="flex-row gap-3 mt-5">
                {/* Back */}
                <TouchableOpacity
                  className="flex-1 rounded-xl py-3.5 border border-slate-200"
                  onPress={() => setStep(1)}
                  activeOpacity={0.85}
                >
                  <Text className="text-center font-semibold text-[15px] text-slate-600">
                    Back
                  </Text>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                  className="flex-1 rounded-xl py-3.5"
                  style={{ backgroundColor: COLORS.primary }}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text className="text-white text-center font-semibold text-[15px]">
                    {loading ? "Creating…" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Skip option — location is helpful but not a hard blocker */}
              <TouchableOpacity
                className="mt-4"
                onPress={async () => {
                  // Allow skipping — location can be set later in profile
                  setLocation(null);
                  await handleRegister();
                }}
                disabled={loading}
              >
                <Text className="text-center text-[12px] text-slate-400">
                  Skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
