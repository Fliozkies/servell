import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addTag,
  handleSubmit,
  loadCategories,
  pickImage,
  removeTag,
} from "../../../lib/functions/create_service";
import { CreateServiceProps } from "../../../lib/types/custom.types";
import { Category } from "../../../lib/types/database.types";

export default function CreateService({
  onServiceCreated,
  onCancel,
}: CreateServiceProps) {
  // Form state
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // insets
  const insets = useSafeAreaInsets();

  // Load categories on mount
  useEffect(() => {
    loadCategories({ setLoadingCategories, setCategories });
  }, []);

  if (loadingCategories) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View
          className="bg-white border-b border-slate-200 px-6"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onCancel} className="p-2 -ml-2">
              <AntDesign name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-slate-900">
              Create Service
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <View className="p-6">
          {/* Image Upload Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Service Image
            </Text>
            <TouchableOpacity
              onPress={() => pickImage(setSelectedImage)}
              className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden"
              style={{ height: 200 }}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <AntDesign name="camera" size={48} color="#94a3b8" />
                  <Text className="mt-2 text-slate-500">
                    Tap to upload image
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">Optional</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Title <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Professional Web Development"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Description <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your service..."
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>

          {/* Category Selection */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Category <Text className="text-red-500">*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  className={`mx-1 px-4 py-2 rounded-full border ${
                    selectedCategory === category.id
                      ? "bg-[#1877F2] border-[#1877F2]"
                      : "bg-white border-slate-300"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategory === category.id
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Price */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Price (₱)
            </Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="e.g., 5000"
              keyboardType="numeric"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
            <Text className="text-xs text-slate-500 mt-1">
              Optional - Leave blank for &apos;Contact for price&apos;
            </Text>
          </View>

          {/* Tags */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Tags
            </Text>
            <View className="flex-row items-center mb-2">
              <TextInput
                value={currentTag}
                onChangeText={setCurrentTag}
                placeholder="Add a tag..."
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
                onSubmitEditing={() =>
                  addTag({
                    tags: tags,
                    setTags: setTags,
                    currentTag: currentTag,
                    setCurrentTag: setCurrentTag,
                  })
                }
              />
              <TouchableOpacity
                onPress={() => addTag}
                className="ml-2 bg-[#1877F2] rounded-xl px-4 py-3"
              >
                <Text className="text-white font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
            {tags.length > 0 ? (
              <View className="flex-row flex-wrap">
                {tags.map((tag, index) => (
                  <View
                    key={index}
                    className="bg-slate-100 rounded-full px-3 py-1 flex-row items-center mr-2 mb-2"
                  >
                    <Text className="text-slate-700 text-sm mr-1">{tag}</Text>
                    <TouchableOpacity
                      onPress={() => removeTag(tag, tags, setTags)}
                    >
                      <AntDesign name="close" size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <Text className="text-xs text-slate-500 mt-1">
              Add up to 5 tags to help people find your service
            </Text>
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Location <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Manila, Philippines"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Phone Number */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Phone Number
            </Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g., 09123456789"
              keyboardType="phone-pad"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={() =>
              handleSubmit({
                title,
                description,
                location,
                selectedCategory,
                price,
                setLoading,
                selectedImage,
                tags,
                phoneNumber,
                onServiceCreated,
              })
            }
            disabled={loading}
            className={`rounded-xl py-4 items-center ${
              loading ? "bg-slate-300" : "bg-[#1877F2]"
            }`}
          >
            {loading ? (
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
