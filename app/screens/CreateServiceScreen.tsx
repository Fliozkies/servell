import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { supabase } from "../../lib/api/supabase";
import { FormField } from "../../lib/components/ui/FormField";
import { TagInput } from "../../lib/components/ui/TagInput";
import { COLORS } from "../../lib/constants/theme";
import {
  useServiceForm,
  validateServiceForm,
} from "../../lib/hooks/useServiceForm";
import { CreateServiceProps } from "../../lib/types/custom.types";
import { uploadImage } from "../../lib/utils/imageUtils";

const CLEAN_MAP_STYLE = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

const DIGOS_REGION: Region = {
  latitude: 6.7494,
  longitude: 125.3573,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function CreateServiceScreen({
  onServiceCreated,
  onCancel,
}: CreateServiceProps) {
  const [submitting, setSubmitting] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  const form = useServiceForm();

  // Intercept Android hardware back button and OS back gesture —
  // without this, the OS has no navigation stack to go back to and exits the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onCancel();
        return true; // prevent default (app exit)
      },
    );
    return () => subscription.remove();
  }, [onCancel]);

  const handleOpenMapPicker = async () => {
    setMapModalVisible(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600,
        );
      }, 400);
    } catch {
      // fall back to default region
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    setPendingCoords(e.nativeEvent.coordinate);
  };

  const handleConfirmPin = () => {
    if (!pendingCoords) return;
    form.setCoordinates(pendingCoords.latitude, pendingCoords.longitude);
    setMapModalVisible(false);
  };

  const handleClearPin = () => {
    form.setCoordinates(null, null);
    setPendingCoords(null);
  };

  const handleSubmit = async () => {
    const selectedCategoryName = form.categories.find(
      (c) => c.id === form.selectedCategory,
    )?.name;

    if (selectedCategoryName === "Others" && !customCategory.trim()) {
      Alert.alert("Error", "Please specify your service category");
      return;
    }

    if (
      !validateServiceForm({
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

      const { error } = await supabase.from("services").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.price.trim() ? parseFloat(form.price) : null,
        image_url: imageUrl,
        category_id: form.selectedCategory,
        tags:
          selectedCategoryName === "Others" && customCategory.trim()
            ? [customCategory.trim(), ...form.tags]
            : form.tags.length > 0
              ? form.tags
              : null,
        location: form.location.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        phone_number: form.phoneNumber.trim() || null,
        status: "active" as const,
      });

      if (error) throw error;

      Alert.alert("Success!", "Your service has been posted.", [
        { text: "OK", onPress: onServiceCreated },
      ]);
    } catch {
      Alert.alert("Error", "Failed to create service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmedPin =
    form.latitude != null
      ? { latitude: form.latitude, longitude: form.longitude! }
      : null;

  const activePin = mapModalVisible ? pendingCoords : confirmedPin;

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="bg-white border-b border-slate-200 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onCancel} className="p-2 -ml-2">
                <AntDesign name="close" size={24} color={COLORS.slate900} />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-slate-900">
                Create Service
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          <View className="px-6 pb-6 pt-3">
            <FormField label="Service Image">
              <TouchableOpacity
                onPress={form.handlePickImage}
                className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden"
                style={{ height: 200 }}
              >
                {form.selectedImage ? (
                  <Image
                    source={{ uri: form.selectedImage.uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <AntDesign
                      name="camera"
                      size={48}
                      color={COLORS.slate400}
                    />
                    <Text className="mt-2 text-slate-500">
                      Tap to upload image
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">
                      Optional
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </FormField>

            <FormField label="Title" required>
              <TextInput
                value={form.title}
                onChangeText={form.setTitle}
                placeholder="e.g., Professional Web Development"
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor={COLORS.slate400}
              />
            </FormField>

            <FormField label="Description" required>
              <TextInput
                value={form.description}
                onChangeText={form.setDescription}
                placeholder="Describe your service..."
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor={COLORS.slate400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
              />
            </FormField>

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
                  className="-mx-1"
                >
                  {form.categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => form.setSelectedCategory(cat.id)}
                      className={`mx-1 px-4 py-2 rounded-full border ${
                        form.selectedCategory === cat.id
                          ? "bg-[#1877F2] border-[#1877F2]"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          form.selectedCategory === cat.id
                            ? "text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {form.categories.find((c) => c.id === form.selectedCategory)
                ?.name === "Others" && (
                <FormField label="Specify Your Category" required>
                  <TextInput
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="e.g., Pet Care, Event Planning, Landscaping"
                    className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                    placeholderTextColor={COLORS.slate400}
                    maxLength={50}
                  />
                  <Text className="text-xs text-slate-500 mt-2">
                    Please specify what type of service you&apos;re offering
                  </Text>
                </FormField>
              )}
            </FormField>

            <FormField label="Price (₱)">
              <TextInput
                value={form.price}
                onChangeText={form.setPrice}
                placeholder="e.g., 5000"
                keyboardType="numeric"
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor={COLORS.slate400}
              />
              <Text className="text-xs text-slate-500 mt-1">
                Optional — leave blank for &apos;Contact for price&apos;
              </Text>
            </FormField>

            <FormField label="Tags">
              <TagInput
                tags={form.tags}
                currentTag={form.currentTag}
                onChangeTag={form.setCurrentTag}
                onAdd={form.handleAddTag}
                onRemove={form.handleRemoveTag}
              />
              <Text className="text-xs text-slate-500 mt-1">
                Add up to 5 tags to help people find your service
              </Text>
            </FormField>

            <FormField label="Location" required>
              <TextInput
                value={form.location}
                onChangeText={form.setLocation}
                placeholder="e.g., Digos City, Davao del Sur"
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor={COLORS.slate400}
              />
            </FormField>

            <FormField label="Pin Location on Map">
              <TouchableOpacity
                onPress={handleOpenMapPicker}
                className="border border-slate-300 rounded-xl overflow-hidden"
                style={{ height: 160 }}
                activeOpacity={0.8}
              >
                {confirmedPin ? (
                  <>
                    <MapView
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: confirmedPin.latitude,
                        longitude: confirmedPin.longitude,
                        latitudeDelta: 0.008,
                        longitudeDelta: 0.008,
                      }}
                      customMapStyle={CLEAN_MAP_STYLE}
                      showsPointsOfInterests={false}
                      showsBuildings={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      <Marker coordinate={confirmedPin} />
                    </MapView>
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleClearPin}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        borderRadius: 16,
                        padding: 6,
                      }}
                    >
                      <AntDesign name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View className="flex-1 items-center justify-center bg-slate-50">
                    <Ionicons
                      name="location-outline"
                      size={36}
                      color={COLORS.slate400}
                    />
                    <Text className="mt-2 text-slate-500 text-sm">
                      Tap to pin your service location
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">
                      Optional — helps customers find you
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </FormField>

            <FormField label="Phone Number">
              <TextInput
                value={form.phoneNumber}
                onChangeText={form.setPhoneNumber}
                placeholder="e.g., 09123456789"
                keyboardType="phone-pad"
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor={COLORS.slate400}
              />
            </FormField>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className={`rounded-xl py-4 items-center ${
                submitting ? "bg-slate-300" : "bg-[#1877F2]"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Post Service
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-center text-xs text-slate-500 mt-4">
              By posting, you agree to our terms of service
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 56 : 16,
              paddingBottom: 12,
              backgroundColor: "#fff",
              borderBottomWidth: 1,
              borderBottomColor: "#e2e8f0",
            }}
          >
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <AntDesign name="close" size={22} color={COLORS.slate900} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>
              Pin Your Location
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <View
            style={{
              paddingVertical: 8,
              backgroundColor: "#f8fafc",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, color: "#64748b" }}>
              Tap anywhere on the map to place your pin
            </Text>
          </View>

          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={
              confirmedPin
                ? {
                    latitude: confirmedPin.latitude,
                    longitude: confirmedPin.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : DIGOS_REGION
            }
            customMapStyle={CLEAN_MAP_STYLE}
            showsPointsOfInterests={false}
            showsBuildings={false}
            onPress={handleMapPress}
          >
            {activePin && <Marker coordinate={activePin} pinColor="#1877F2" />}
          </MapView>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              padding: 16,
              paddingBottom: Platform.OS === "ios" ? 32 : 16,
              backgroundColor: "#fff",
              borderTopWidth: 1,
              borderTopColor: "#e2e8f0",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setPendingCoords(null);
                setMapModalVisible(false);
              }}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "#e2e8f0",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#64748b" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmPin}
              disabled={!pendingCoords}
              style={{
                flex: 2,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: pendingCoords ? "#1877F2" : "#cbd5e1",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                {pendingCoords ? "Confirm Pin" : "Tap map to place pin"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
