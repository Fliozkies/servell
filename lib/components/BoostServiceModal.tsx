// lib/components/BoostServiceModal.tsx
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Crown,
  Image as ImageIcon,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  boostService,
  cancelServiceBoost,
  fetchUserServices,
} from "../api/services.api";
import { COLORS } from "../constants/theme";
import { Service } from "../types/database.types";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type BoostTier = "standard" | "premium";
type Step = "pick" | "configure";

const TIERS = [
  {
    key: "standard" as BoostTier,
    label: "Standard",
    tagline: "Get seen more often",
    color: COLORS.primary,
    bgColor: "#EEF4FF",
    perks: [
      "Featured in the Services feed",
      "⚡ FEATURED badge on your listing",
      "Priority over non-boosted services",
    ],
  },
  {
    key: "premium" as BoostTier,
    label: "Premium",
    tagline: "Maximum visibility",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    perks: [
      "Everything in Standard",
      "Ranked above Standard boosts",
      "Highlighted in search results",
    ],
  },
];

const DURATIONS = [
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days", popular: true },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

function isActiveBoosted(s: Service) {
  return !!s.boosted_until && new Date(s.boosted_until) > new Date();
}

function boostExpiryLabel(s: Service) {
  if (!s.boosted_until) return "";
  return new Date(s.boosted_until).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Service picker (shown when no service is pre-selected) ────────────────────

function ServicePickerStep({
  services,
  loading,
  onSelect,
}: {
  services: Service[];
  loading: boolean;
  onSelect: (s: Service) => void;
}) {
  if (loading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={{ color: COLORS.slate400, fontSize: 13, marginTop: 10 }}>
          Loading your services…
        </Text>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View
        style={{
          paddingVertical: 48,
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Zap size={36} color={COLORS.slate300} />
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#0f172a",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          No services yet
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.slate400,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Create a service listing first, then boost it to get more visibility.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {services.map((service) => {
        const boosted = isActiveBoosted(service);
        return (
          <TouchableOpacity
            key={service.id}
            onPress={() => onSelect(service)}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fafafa",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              padding: 12,
              gap: 12,
            }}
          >
            {service.image_url ? (
              <Image
                source={{ uri: service.image_url }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={20} color={COLORS.slate400} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}
                numberOfLines={1}
              >
                {service.title}
              </Text>
              {boosted ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 3,
                  }}
                >
                  <Zap
                    size={10}
                    color={
                      service.boost_tier === "premium"
                        ? "#7c3aed"
                        : COLORS.primary
                    }
                    fill={
                      service.boost_tier === "premium"
                        ? "#7c3aed"
                        : COLORS.primary
                    }
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color:
                        service.boost_tier === "premium"
                          ? "#7c3aed"
                          : COLORS.primary,
                    }}
                  >
                    {service.boost_tier === "premium" ? "Premium" : "Standard"}{" "}
                    · until {boostExpiryLabel(service)}
                  </Text>
                </View>
              ) : (
                <Text
                  style={{ fontSize: 11, color: COLORS.slate400, marginTop: 2 }}
                >
                  Not boosted
                </Text>
              )}
            </View>

            <ChevronRight size={16} color={COLORS.slate300} />
          </TouchableOpacity>
        );
      })}

      {/* End-of-list marker */}
      {services.length > 0 && (
        <View
          style={{
            marginTop: 8,
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              height: 1,
              backgroundColor: "#e2e8f0",
              alignSelf: "stretch",
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: COLORS.slate400,
              fontStyle: "italic",
            }}
          >
            You&apos;ve reached the end of your services
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export interface BoostServiceModalProps {
  visible: boolean;
  /** Pre-selected service (from ProfileScreen action sheet). If omitted, shows picker first. */
  service?: Service | null;
  /** Required when no service is pre-selected — used to fetch the user's services. */
  userId?: string | null;
  onClose: () => void;
  onBoosted?: (updated: Service) => void;
}

export function BoostServiceModal({
  visible,
  service: preselected,
  userId,
  onClose,
  onBoosted,
}: BoostServiceModalProps) {
  const [step, setStep] = useState<Step>(preselected ? "configure" : "pick");
  const [selectedService, setSelectedService] = useState<Service | null>(
    preselected ?? null,
  );
  const [selectedTier, setSelectedTier] = useState<BoostTier>("standard");
  const [selectedDays, setSelectedDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // ── Service cache: fetch once, invalidate only after an edit ──────────────
  const [cachedServices, setCachedServices] = useState<Service[] | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  const loadServices = useCallback(
    (force = false) => {
      if (!userId || (cachedServices !== null && !force)) return;
      setServicesLoading(true);
      fetchUserServices(userId)
        .then((data) =>
          setCachedServices(data.filter((s) => s.status !== "deleted")),
        )
        .catch(() => setCachedServices([]))
        .finally(() => setServicesLoading(false));
    },
    [userId, cachedServices],
  );

  // Fetch once on mount (or when userId changes)
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (visible) {
      setStep(preselected ? "configure" : "pick");
      setSelectedService(preselected ?? null);
      setSelectedTier("standard");
      setSelectedDays(7);
      setModalVisible(true);
      backdropOpacity.setValue(0);
      slideAnim.setValue(300);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible, preselected, backdropOpacity, slideAnim]);

  const tierColor =
    TIERS.find((t) => t.key === selectedTier)?.color ?? COLORS.primary;
  const boosted = selectedService ? isActiveBoosted(selectedService) : false;

  const handleBoost = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      await boostService(selectedService.id, selectedTier, selectedDays);
      const boostedUntil = new Date();
      boostedUntil.setDate(boostedUntil.getDate() + selectedDays);
      const updated: Service = {
        ...selectedService,
        boost_tier: selectedTier,
        boosted_until: boostedUntil.toISOString(),
      };
      onBoosted?.(updated);
      // Keep cache in sync after a successful boost
      setCachedServices((prev) =>
        prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev,
      );
      Alert.alert(
        "🚀 Boost Applied!",
        `"${selectedService.title}" is now boosted for ${selectedDays} days.`,
        [{ text: "Great!", onPress: onClose }],
      );
    } catch {
      Alert.alert("Error", "Failed to apply boost. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBoost = () => {
    if (!selectedService) return;
    Alert.alert(
      "Cancel Boost",
      `Remove the active boost on "${selectedService.title}"?`,
      [
        { text: "Keep Boost", style: "cancel" },
        {
          text: "Cancel Boost",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await cancelServiceBoost(selectedService.id);
              const updated: Service = {
                ...selectedService,
                boost_tier: null,
                boosted_until: null,
              };
              onBoosted?.(updated);
              Alert.alert("Boost Cancelled", "Your boost has been removed.", [
                { text: "OK", onPress: onClose },
              ]);
            } catch {
              Alert.alert("Error", "Failed to cancel boost.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none">
      {/* Backdrop — fades in/out independently, never slides */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            height: SCREEN_HEIGHT * 0.75,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: "#e2e8f0",
              borderRadius: 2,
              alignSelf: "center",
              marginTop: 12,
              marginBottom: 4,
            }}
          />

          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                {step === "configure" && !preselected && (
                  <TouchableOpacity
                    onPress={() => {
                      setStep("pick");
                      setSelectedService(null);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#f1f5f9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronRight
                      size={16}
                      color={COLORS.slate500}
                      style={{ transform: [{ scaleX: -1 }] }}
                    />
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {step === "pick" ? "Boost a Service" : "Boost Service"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.slate400,
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {step === "pick"
                      ? "Select which service to promote"
                      : selectedService?.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color={COLORS.slate500} />
              </TouchableOpacity>
            </View>

            {/* Divider under header */}
            <View
              style={{
                height: 1,
                backgroundColor: "#e2e8f0",
                marginHorizontal: -24,
                marginBottom: 16,
              }}
            />

            {/* ── STEP 1: Pick ── */}
            {step === "pick" && (
              <ServicePickerStep
                services={cachedServices ?? []}
                loading={servicesLoading}
                onSelect={(s) => {
                  setSelectedService(s);
                  setStep("configure");
                }}
              />
            )}

            {/* ── STEP 2: Configure ── */}
            {step === "configure" && selectedService && (
              <>
                {/* Active boost notice */}
                {boosted && (
                  <View
                    style={{
                      backgroundColor: "#ecfdf5",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: 1,
                      borderColor: "#6ee7b7",
                    }}
                  >
                    <CheckCircle size={18} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#065f46",
                        }}
                      >
                        Currently{" "}
                        {selectedService.boost_tier === "premium"
                          ? "Premium"
                          : "Standard"}{" "}
                        Boosted
                      </Text>
                      <Text
                        style={{ fontSize: 11, color: "#047857", marginTop: 1 }}
                      >
                        Active until {boostExpiryLabel(selectedService)} ·
                        Re-boosting extends it
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleCancelBoost}
                      style={{
                        backgroundColor: "#fef2f2",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#dc2626",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Tier */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#94a3b8",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  Choose Tier
                </Text>
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {TIERS.map((tier) => {
                    const sel = selectedTier === tier.key;
                    return (
                      <TouchableOpacity
                        key={tier.key}
                        onPress={() => setSelectedTier(tier.key)}
                        activeOpacity={0.8}
                        style={{
                          borderRadius: 16,
                          borderWidth: 2,
                          borderColor: sel ? tier.color : "#e2e8f0",
                          backgroundColor: sel ? tier.bgColor : "#fafafa",
                          padding: 14,
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: sel ? "#fff" : "#f1f5f9",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {tier.key === "premium" ? (
                            <Crown size={20} color={tier.color} />
                          ) : (
                            <Zap size={20} color={tier.color} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: sel ? tier.color : "#1e293b",
                              }}
                            >
                              {tier.label}
                            </Text>
                            {sel && (
                              <View
                                style={{
                                  backgroundColor: tier.color,
                                  borderRadius: 6,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#fff",
                                    fontSize: 9,
                                    fontWeight: "800",
                                  }}
                                >
                                  SELECTED
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: sel ? tier.color : COLORS.slate400,
                              marginBottom: 8,
                            }}
                          >
                            {tier.tagline}
                          </Text>
                          {tier.perks.map((perk) => (
                            <View
                              key={perk}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 3,
                              }}
                            >
                              <View
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: sel ? tier.color : "#cbd5e1",
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: sel ? "#334155" : COLORS.slate400,
                                }}
                              >
                                {perk}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Duration */}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#94a3b8",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  Duration
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}
                >
                  {DURATIONS.map((d) => {
                    const sel = selectedDays === d.days;
                    return (
                      <TouchableOpacity
                        key={d.days}
                        onPress={() => setSelectedDays(d.days)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: sel ? tierColor : "#e2e8f0",
                          backgroundColor: sel ? tierColor : "#fafafa",
                          paddingVertical: 10,
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        {d.popular && !sel && (
                          <View
                            style={{
                              position: "absolute",
                              top: -8,
                              backgroundColor: "#fbbf24",
                              borderRadius: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: "800",
                                color: "#78350f",
                              }}
                            >
                              POPULAR
                            </Text>
                          </View>
                        )}
                        <Clock
                          size={14}
                          color={sel ? "#fff" : COLORS.slate400}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: sel ? "#fff" : "#1e293b",
                            marginTop: 4,
                          }}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Summary */}
                <View
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.slate500,
                      lineHeight: 18,
                    }}
                  >
                    Your service will appear in the{" "}
                    <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                      Featured
                    </Text>{" "}
                    section for{" "}
                    <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                      {selectedDays} days
                    </Text>{" "}
                    as a{" "}
                    <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                      {selectedTier === "premium" ? "Premium" : "Standard"}
                    </Text>{" "}
                    boost.
                    {boosted ? " This will replace your existing boost." : ""}
                  </Text>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  onPress={handleBoost}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 16,
                    backgroundColor: tierColor,
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      {selectedTier === "premium" ? (
                        <Crown size={18} color="#fff" />
                      ) : (
                        <Zap size={18} color="#fff" />
                      )}
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "800",
                          fontSize: 15,
                        }}
                      >
                        {boosted ? "Re-Boost Service" : "Boost Now"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}
