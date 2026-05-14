// app/(auth)/auth.tsx
import { router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
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
type RegisterStep = 1 | 2 | 3;

const LOGO_IMAGE = require("../../assets/images/logoV2_2.png");
const FIELD_FOCUS_OFFSET = 110;
const FIELD_FOCUS_DELAY = 140;

export default function AuthScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const [tab, setTab] = useState<AuthTab>("login");

  // ── Login state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ── Register state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<RegisterStep>(1);
  const [regEmail, setRegEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  function goToRegisterStep(nextStep: RegisterStep) {
    setStep(nextStep);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  }

  // ── Register step 1 → create auth account ─────────────────────────────────
  async function handleCreateAuthAccount() {
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

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
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

    if (data.session) {
      goToRegisterStep(3);
      return;
    }

    goToRegisterStep(2);
  }

  // ── Register step 2 → confirm email ───────────────────────────────────────
  async function handleConfirmEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: regEmail.trim(),
      password: regPassword,
    });
    setLoading(false);

    if (error) {
      Alert.alert(
        "Email Not Confirmed",
        "Please open the confirmation link in your email before continuing.",
      );
      return;
    }

    goToRegisterStep(3);
  }

  async function handleResendConfirmation() {
    if (!regEmail.trim()) {
      Alert.alert("Error", "Please enter your email first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: regEmail.trim(),
    });
    setLoading(false);

    if (error) {
      Alert.alert("Resend Error", error.message);
      return;
    }

    Alert.alert("Email Sent", "We sent another confirmation email.");
  }

  // ── Register step 3 → finish ───────────────────────────────────────────────
  async function handleRegister() {
    if (!location) {
      setLocationError(true);
      return;
    }

    await finishRegistration(location);
  }

  async function finishRegistration(selectedLocation: SelectedLocation | null) {
    setLocationError(false);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      Alert.alert(
        "Session Expired",
        "Please confirm your email again before finishing your account.",
      );
      goToRegisterStep(2);
      return;
    }

    if (selectedLocation) {
      const { error } = await supabase
        .from("profiles")
        .update({
          location_text: selectedLocation.text,
          location_lat: selectedLocation.lat,
          location_lng: selectedLocation.lng,
        })
        .eq("id", user.id);

      if (error) {
        setLoading(false);
        Alert.alert("Location Error", error.message);
        return;
      }
    }

    setLoading(false);

    Alert.alert(
      "Account Ready",
      selectedLocation
        ? "Success! You can now login and start exploring nearby services."
        : "Success! You can add your location later in your profile.",
      [
        {
          text: "OK",
          onPress: () => {
            router.replace("/(main)");
          },
        },
      ],
    );
  }

  // ── Reset to login ─────────────────────────────────────────────────────────
  function switchToLogin() {
    setTab("login");
    goToRegisterStep(1);
  }

  // ── Reset to register ──────────────────────────────────────────────────────
  function switchToRegister() {
    setTab("register");
    goToRegisterStep(1);
  }

  function handleFieldLayout(field: string, event: LayoutChangeEvent) {
    fieldPositions.current[field] = event.nativeEvent.layout.y;
  }

  function focusField(field: string) {
    setTimeout(() => {
      const fieldY = fieldPositions.current[field] ?? 0;
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, fieldY - FIELD_FOCUS_OFFSET),
        animated: true,
      });
    }, FIELD_FOCUS_DELAY);
  }

  function getStepBackground(stepNumber: RegisterStep) {
    if (step > stepNumber) return COLORS.success;
    if (step === stepNumber) return COLORS.primary;
    return COLORS.slate200;
  }

  function getStepTextColor(stepNumber: RegisterStep) {
    return step >= stepNumber ? "#fff" : COLORS.slate400;
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const INPUT_CLASS =
    "border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 mb-3 text-slate-900 text-[14px]";
  const PASSWORD_INPUT_CONTAINER_CLASS =
    "flex-row items-center border border-slate-200 bg-slate-50 rounded-xl mb-3";
  const PASSWORD_INPUT_CLASS = "flex-1 px-4 py-3 text-slate-900 text-[14px]";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingTop: Platform.OS === "ios" ? 40 : 24,
          paddingBottom: 180,
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="px-6 py-10"
          style={{ paddingTop: tab === "login" ? 100 : 40 }}
        >
          {/* ── Logo / Title ── */}
          <Image
            source={LOGO_IMAGE}
            className="self-center"
            style={{ width: 164, height: 164, marginBottom: -2 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
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
                : step === 2
                  ? "Confirm your email"
                  : "Where are you based?"}
          </Text>

          {/* ── Step indicator for registration ── */}
          {tab === "register" && (
            <View className="flex-row items-center justify-center mb-6 gap-2">
              {([1, 2, 3] as RegisterStep[]).map((stepNumber, index) => (
                <View key={stepNumber} className="flex-row items-center">
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: getStepBackground(stepNumber),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: getStepTextColor(stepNumber),
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {step > stepNumber ? "✓" : stepNumber}
                    </Text>
                  </View>
                  {index < 2 && (
                    <View
                      style={{
                        width: 40,
                        height: 2,
                        marginHorizontal: 8,
                        backgroundColor:
                          step > stepNumber ? COLORS.primary : COLORS.slate200,
                      }}
                    />
                  )}
                </View>
              ))}
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
                onLayout={(event) => handleFieldLayout("loginEmail", event)}
                onFocus={() => focusField("loginEmail")}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View
                className={PASSWORD_INPUT_CONTAINER_CLASS}
                onLayout={(event) => handleFieldLayout("loginPassword", event)}
              >
                <TextInput
                  className={PASSWORD_INPUT_CLASS}
                  placeholder="Password"
                  placeholderTextColor={COLORS.slate400}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => focusField("loginPassword")}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={() => setShowLoginPassword((current) => !current)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showLoginPassword ? "Hide password" : "Show password"
                  }
                  hitSlop={8}
                >
                  {showLoginPassword ? (
                    <EyeOff size={20} color={COLORS.slate400} />
                  ) : (
                    <Eye size={20} color={COLORS.slate400} />
                  )}
                </TouchableOpacity>
              </View>

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
                onLayout={(event) => handleFieldLayout("regEmail", event)}
                onFocus={() => focusField("regEmail")}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View
                className="flex-row gap-3"
                onLayout={(event) => handleFieldLayout("regNames", event)}
              >
                <TextInput
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="First Name"
                  placeholderTextColor={COLORS.slate400}
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => focusField("regNames")}
                />
                <TextInput
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="Last Name"
                  placeholderTextColor={COLORS.slate400}
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => focusField("regNames")}
                />
              </View>
              <View
                className={PASSWORD_INPUT_CONTAINER_CLASS}
                onLayout={(event) => handleFieldLayout("regPassword", event)}
              >
                <TextInput
                  className={PASSWORD_INPUT_CLASS}
                  placeholder="Password"
                  placeholderTextColor={COLORS.slate400}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  onFocus={() => focusField("regPassword")}
                  secureTextEntry={!showRegPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={() => setShowRegPassword((current) => !current)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showRegPassword ? "Hide password" : "Show password"
                  }
                  hitSlop={8}
                >
                  {showRegPassword ? (
                    <EyeOff size={20} color={COLORS.slate400} />
                  ) : (
                    <Eye size={20} color={COLORS.slate400} />
                  )}
                </TouchableOpacity>
              </View>
              <View
                className={PASSWORD_INPUT_CONTAINER_CLASS}
                onLayout={(event) =>
                  handleFieldLayout("confirmPassword", event)
                }
              >
                <TextInput
                  className={PASSWORD_INPUT_CLASS}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.slate400}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => focusField("confirmPassword")}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  className="px-4 py-3"
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  hitSlop={8}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={COLORS.slate400} />
                  ) : (
                    <Eye size={20} color={COLORS.slate400} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="rounded-xl py-3.5 mb-4 mt-1"
                style={{ backgroundColor: COLORS.primary }}
                onPress={handleCreateAuthAccount}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text className="text-white text-center font-semibold text-[15px]">
                  {loading ? "Creating..." : "Create Account"}
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
              REGISTER — STEP 2: Confirm Email
          ══════════════════════════════════════════════════════════════ */}
          {tab === "register" && step === 2 && (
            <>
              <View
                className="rounded-xl px-4 py-4 mb-5"
                style={{ backgroundColor: "#eff6ff" }}
              >
                <Text
                  className="text-center text-[14px] font-semibold mb-2"
                  style={{ color: COLORS.primary }}
                >
                  Check your inbox
                </Text>
                <Text className="text-center text-[13px] text-slate-600 leading-5">
                  We sent a confirmation link to {regEmail.trim()}. Open that
                  link first, then come back here to continue.
                </Text>
              </View>

              <TouchableOpacity
                className="rounded-xl py-3.5 mb-3"
                style={{ backgroundColor: COLORS.primary }}
                onPress={handleConfirmEmail}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text className="text-white text-center font-semibold text-[15px]">
                  {loading ? "Checking..." : "I've Confirmed My Email"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl py-3.5 mb-4 border border-slate-200"
                onPress={handleResendConfirmation}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text className="text-center font-semibold text-[15px] text-slate-600">
                  Resend Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => goToRegisterStep(1)}>
                <Text className="text-center text-[13px] text-slate-500">
                  Use a different email
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              REGISTER — STEP 3: Location
          ══════════════════════════════════════════════════════════════ */}
          {tab === "register" && step === 3 && (
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
                  onPress={() => goToRegisterStep(2)}
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
                    {loading ? "Finishing..." : "Finish"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Skip option — location is helpful but not a hard blocker */}
              <TouchableOpacity
                className="mt-4"
                onPress={async () => {
                  // Allow skipping — location can be set later in profile
                  setLocation(null);
                  await finishRegistration(null);
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
