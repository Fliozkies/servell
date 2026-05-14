// app/screens/CreateServiceScreen.tsx

import { AntDesign, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { invalidateServicesCache } from "../../lib/api/services.api";
import { supabase } from "../../lib/api/supabase";
import LocationPicker, {
  SelectedLocation,
} from "../../lib/components/LocationPicker";
import { CachedImage } from "../../lib/components/ui/CachedImage";
import { FormField } from "../../lib/components/ui/FormField";
import { TagInput } from "../../lib/components/ui/TagInput";
import { COLORS } from "../../lib/constants/theme";
import {
  ServiceType,
  useServiceForm,
  validateServiceForm,
} from "../../lib/hooks/useServiceForm";
import { CreateServiceProps } from "../../lib/types/custom.types";
import { uploadImage } from "../../lib/utils/imageUtils";

// ── Service type option definition ────────────────────────────────────────────

type ServiceTypeOption = {
  type: ServiceType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  examples: string;
  accentColor: string;
  bgColor: string;
};

const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  {
    type: "digital",
    icon: "laptop-outline",
    label: "Digital Service",
    description:
      "Services delivered online or remotely. No physical presence required.",
    examples: "e.g. Web development, graphic design, tutoring, writing",
    accentColor: "#6366f1",
    bgColor: "#eef2ff",
  },
  {
    type: "physical",
    icon: "location-outline",
    label: "Physical Service",
    description:
      "Services that require you to be physically present at a location.",
    examples: "e.g. Home repair, cleaning, fitness training, photography",
    accentColor: "#0ea5e9",
    bgColor: "#f0f9ff",
  },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CreateServiceScreen({
  onServiceCreated,
  onCancel,
}: CreateServiceProps) {
  const insets = useSafeAreaInsets();
  const [typeModalVisible, setTypeModalVisible] = useState(true);
  const [selectedTypeTemp, setSelectedTypeTemp] = useState<ServiceType | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const form = useServiceForm();

  // Intercept Android hardware back — no navigation stack behind this screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (typeModalVisible) {
          onCancel();
        } else {
          setTypeModalVisible(true);
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [onCancel, typeModalVisible]);

  const handleConfirmType = () => {
    if (!selectedTypeTemp) return;
    form.setServiceType(selectedTypeTemp);
    setTypeModalVisible(false);
  };

  const handleLocationSelect = (loc: SelectedLocation) => {
    form.setLocation(loc.text);
    form.setCoordinates(loc.lat, loc.lng);
  };

  const handleLocationClear = () => {
    form.setLocation("");
    form.setCoordinates(null, null);
  };

  const handleSubmit = async () => {
    const selectedCategoryName = form.categories.find(
      (c) => c.id === form.selectedCategory,
    )?.name;

    if (selectedCategoryName === "Others" && !form.customCategory.trim()) {
      Alert.alert("Error", "Please specify your service category");
      return;
    }

    if (
      !validateServiceForm({
        serviceType: form.serviceType,
        title: form.title,
        description: form.description,
        location: form.location,
        selectedCategory: form.selectedCategory,
        price: form.price,
      })
    )
      return;

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to create a service");
        return;
      }

      let imageUrl: string | null = null;
      if (form.selectedImage) {
        imageUrl = await uploadImage(form.selectedImage, "service-images");
      }

      const finalTags =
        selectedCategoryName === "Others" && form.customCategory.trim()
          ? [form.customCategory.trim(), ...form.tags]
          : form.tags.length > 0
            ? form.tags
            : null;

      const { error } = await supabase.from("services").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.price.trim() ? parseFloat(form.price) : null,
        image_url: imageUrl,
        category_id: form.selectedCategory,
        tags: finalTags,
        service_type: form.serviceType,
        location:
          form.serviceType === "physical"
            ? form.location.trim()
            : form.location.trim() || "Online",
        latitude: form.latitude,
        longitude: form.longitude,
        phone_number: form.phoneNumber.trim() || null,
        status: "active" as const,
      });

      if (error) throw error;

      invalidateServicesCache();
      Alert.alert("Success!", "Your service has been posted.", [
        { text: "OK", onPress: onServiceCreated },
      ]);
    } catch (err) {
      console.error("[CreateServiceScreen] submit error:", err);
      Alert.alert("Error", "Failed to create service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPhysical = form.serviceType === "physical";
  const selectedCategoryName = form.categories.find(
    (c) => c.id === form.selectedCategory,
  )?.name;

  return (
    <>
      {/* ── Service type picker modal ── */}
      <Modal
        visible={typeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onCancel}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: insets.top + 12,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f1f5f9",
            }}
          >
            <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
              <AntDesign name="close" size={22} color={COLORS.slate500} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>
              What are you offering?
            </Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 14,
                color: COLORS.slate500,
                marginBottom: 4,
                lineHeight: 20,
              }}
            >
              Choose the type of service you want to post. This helps customers
              find and understand your offering.
            </Text>

            {SERVICE_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedTypeTemp === option.type;
              return (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => setSelectedTypeTemp(option.type)}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isSelected ? option.accentColor : "#e2e8f0",
                    backgroundColor: isSelected ? option.bgColor : "#fafafa",
                    padding: 20,
                    gap: 12,
                  }}
                >
                  {/* Icon + label row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: isSelected
                          ? option.accentColor
                          : "#e2e8f0",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={isSelected ? "#fff" : COLORS.slate500}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: isSelected ? option.accentColor : "#0f172a",
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {/* Selection indicator */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected
                          ? option.accentColor
                          : "#cbd5e1",
                        backgroundColor: isSelected
                          ? option.accentColor
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )}
                    </View>
                  </View>

                  {/* Description */}
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.slate600,
                      lineHeight: 20,
                    }}
                  >
                    {option.description}
                  </Text>

                  {/* Examples pill */}
                  <View
                    style={{
                      backgroundColor: isSelected
                        ? option.accentColor + "18"
                        : "#f1f5f9",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: isSelected
                          ? option.accentColor
                          : COLORS.slate500,
                        fontStyle: "italic",
                      }}
                    >
                      {option.examples}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CTA */}
          <View
            style={{
              padding: 20,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: "#f1f5f9",
            }}
          >
            <TouchableOpacity
              onPress={handleConfirmType}
              disabled={!selectedTypeTemp}
              style={{
                backgroundColor: selectedTypeTemp ? "#1877F2" : "#e2e8f0",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: selectedTypeTemp ? "#fff" : COLORS.slate400,
                }}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Main form ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#f1f5f9",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={() => setTypeModalVisible(true)}
            style={{ padding: 4 }}
          >
            <AntDesign name="arrow-left" size={22} color={COLORS.slate900} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>
              Post a Service
            </Text>
            {/* Service type badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <Ionicons
                name={isPhysical ? "location-outline" : "laptop-outline"}
                size={11}
                color={isPhysical ? "#0ea5e9" : "#6366f1"}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isPhysical ? "#0ea5e9" : "#6366f1",
                }}
              >
                {isPhysical ? "Physical Service" : "Digital Service"}
              </Text>
            </View>
          </View>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Image */}
          <FormField label="Service Image">
            <TouchableOpacity
              onPress={form.handlePickImage}
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: "#cbd5e1",
                borderRadius: 16,
                overflow: "hidden",
                height: 180,
              }}
            >
              {form.selectedImage ? (
                <CachedImage
                  uri={form.selectedImage.uri}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={40}
                    color={COLORS.slate400}
                  />
                  <Text style={{ fontSize: 14, color: COLORS.slate500 }}>
                    Tap to upload a photo
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.slate400 }}>
                    Optional
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </FormField>

          {/* Title */}
          <FormField label="Title" required>
            <TextInput
              value={form.title}
              onChangeText={form.setTitle}
              placeholder={
                isPhysical
                  ? "e.g., Professional House Cleaning"
                  : "e.g., Professional Web Development"
              }
              style={{
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: "#0f172a",
                backgroundColor: "#fafafa",
              }}
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description" required>
            <TextInput
              value={form.description}
              onChangeText={form.setDescription}
              placeholder="Describe what you offer, your experience, and what clients can expect..."
              style={{
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: "#0f172a",
                backgroundColor: "#fafafa",
                minHeight: 110,
                textAlignVertical: "top",
              }}
              placeholderTextColor={COLORS.slate400}
              multiline
              numberOfLines={4}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category" required>
            {form.loadingCategories ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginVertical: 8, alignSelf: "flex-start" }}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -2 }}
                keyboardShouldPersistTaps="handled"
              >
                {form.categories.map((cat) => {
                  const isSelected = form.selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => form.setSelectedCategory(cat.id)}
                      style={{
                        marginHorizontal: 3,
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 50,
                        borderWidth: 1.5,
                        borderColor: isSelected ? "#1877F2" : "#e2e8f0",
                        backgroundColor: isSelected ? "#1877F2" : "#fff",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: isSelected ? "#fff" : COLORS.slate600,
                        }}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Custom category input when "Others" is selected */}
            {selectedCategoryName === "Others" && (
              <View style={{ marginTop: 12 }}>
                <TextInput
                  value={form.customCategory}
                  onChangeText={form.setCustomCategory}
                  placeholder="e.g., Pet Care, Event Planning, Landscaping"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    fontSize: 15,
                    color: "#0f172a",
                    backgroundColor: "#fafafa",
                  }}
                  placeholderTextColor={COLORS.slate400}
                  maxLength={50}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.slate500,
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  Specify what type of service you&apos;re offering
                </Text>
              </View>
            )}
          </FormField>

          {/* Price */}
          <FormField label="Price (₱)">
            <TextInput
              value={form.price}
              onChangeText={form.setPrice}
              placeholder="e.g., 5000"
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: "#0f172a",
                backgroundColor: "#fafafa",
              }}
              placeholderTextColor={COLORS.slate400}
            />
            <Text
              style={{
                fontSize: 12,
                color: COLORS.slate500,
                marginTop: 4,
                marginLeft: 4,
              }}
            >
              Leave blank to show &quot;Contact for price&quot;
            </Text>
          </FormField>

          {/* Tags */}
          <FormField label="Tags">
            <TagInput
              tags={form.tags}
              currentTag={form.currentTag}
              onChangeTag={form.setCurrentTag}
              onAdd={form.handleAddTag}
              onRemove={form.handleRemoveTag}
            />
            <Text
              style={{
                fontSize: 12,
                color: COLORS.slate500,
                marginTop: 4,
                marginLeft: 4,
              }}
            >
              Add up to 5 tags to help people find your service
            </Text>
          </FormField>

          {/* Location — physical only, using LocationPicker with map pin */}
          {isPhysical ? (
            <FormField label="Location" required>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                onClear={handleLocationClear}
                placeholder="Search or pin your service area..."
                initialValue={form.location || undefined}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.slate500,
                  marginTop: 6,
                  marginLeft: 4,
                }}
              >
                Pin your exact location on the map, or search for your city.
              </Text>
            </FormField>
          ) : (
            // Digital: location is optional free text
            <FormField label="Service Area">
              <TextInput
                value={form.location}
                onChangeText={form.setLocation}
                placeholder="e.g., Nationwide, Metro Manila, Worldwide"
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  color: "#0f172a",
                  backgroundColor: "#fafafa",
                }}
                placeholderTextColor={COLORS.slate400}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.slate500,
                  marginTop: 4,
                  marginLeft: 4,
                }}
              >
                Optional — where do you serve clients?
              </Text>
            </FormField>
          )}

          {/* Phone Number */}
          <FormField label="Phone Number">
            <TextInput
              value={form.phoneNumber}
              onChangeText={form.setPhoneNumber}
              placeholder="e.g., 09123456789"
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: "#0f172a",
                backgroundColor: "#fafafa",
              }}
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              marginTop: 8,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              backgroundColor: submitting ? "#cbd5e1" : "#1877F2",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                Post Service
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: COLORS.slate400,
              marginTop: 16,
            }}
          >
            By posting, you agree to our terms of service
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
