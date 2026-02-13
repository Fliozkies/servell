// app/screens/CreateServiceScreen.tsx
import { AntDesign } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

export default function CreateServiceScreen({
  onServiceCreated,
  onCancel,
}: CreateServiceProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useServiceForm();

  if (form.loadingCategories) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-slate-600">Loading...</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
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
        tags: form.tags.length > 0 ? form.tags : null,
        location: form.location.trim(),
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
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
          {/* Image Upload */}
          <FormField label="Service Image">
            <TouchableOpacity
              onPress={form.handlePickImage}
              className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden"
              style={{ height: 200 }}
            >
              {form.selectedImage ? (
                <Image
                  source={{ uri: form.selectedImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <AntDesign name="camera" size={48} color={COLORS.slate400} />
                  <Text className="mt-2 text-slate-500">
                    Tap to upload image
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">Optional</Text>
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
              placeholder="e.g., Manila, Philippines"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
            />
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
              <Text className="text-white font-bold text-lg">Post Service</Text>
            )}
          </TouchableOpacity>

          <Text className="text-center text-xs text-slate-500 mt-4">
            By posting, you agree to our terms of service
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
