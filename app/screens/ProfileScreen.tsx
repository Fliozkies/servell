// app/screens/ProfileScreen.tsx
// Previously: app/juarez_app/pages/Profile_page.tsx
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronRight,
  Edit3,
  FileText,
  HelpCircle,
  List,
  LogOut,
  MapPin,
  MoreVertical,
  Settings,
  Shield,
  Star,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchUserServices,
  updateServiceStatus,
} from "../../lib/api/services.api";
import {
  getSubscriberCount,
  getSubscriptions,
  unsubscribeFromProvider,
} from "../../lib/api/subscriptions.api";
import { supabase } from "../../lib/api/supabase";
import { ProfileImageModal } from "../../lib/components/ProfileImageModal";
import { FormField } from "../../lib/components/ui/FormField";
import { ProfileAvatar } from "../../lib/components/ui/ProfileAvatar";
import { TabBar } from "../../lib/components/ui/TabBar";
import { TagInput } from "../../lib/components/ui/TagInput";
import { COLORS } from "../../lib/constants/theme";
import {
  useServiceForm,
  validateServiceForm,
} from "../../lib/hooks/useServiceForm";
import {
  Profile,
  Service,
  ServiceSubscriptionWithProfile,
} from "../../lib/types/database.types";
import { formatDisplayName, formatPrice } from "../../lib/utils/format";
import { uploadImage } from "../../lib/utils/imageUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileTab = "posts" | "subscriptions" | "reviews";

const PROFILE_TABS = [
  { key: "posts" as const, label: "Services" },
  { key: "subscriptions" as const, label: "Following" },
  { key: "reviews" as const, label: "My Reviews" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleLogout() {
  await supabase.auth.signOut();
  router.replace("/(auth)/auth");
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [subscriptions, setSubscriptions] = useState<
    ServiceSubscriptionWithProfile[]
  >([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [isEditServiceVisible, setIsEditServiceVisible] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [isProfileImageModalVisible, setIsProfileImageModalVisible] =
    useState(false);

  const subscriptionsLoadedRef = useRef(false);
  const reviewsLoadedRef = useRef(false);

  // ── Data loaders ───────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
    setSubscriberCount(await getSubscriberCount(user.id));
  }, []);

  const loadServices = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingServices(true);
    try {
      const data = await fetchUserServices(currentUserId);
      setServices(data.filter((s) => s.status !== "deleted"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServices(false);
    }
  }, [currentUserId]);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    try {
      setSubscriptions(await getSubscriptions());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, service:services(title, image_url)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReviews(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  useEffect(() => {
    if (currentUserId) loadServices();
  }, [currentUserId, loadServices]);
  useEffect(() => {
    if (activeTab === "subscriptions" && !subscriptionsLoadedRef.current) {
      subscriptionsLoadedRef.current = true;
      loadSubscriptions();
    }
    if (activeTab === "reviews" && !reviewsLoadedRef.current) {
      reviewsLoadedRef.current = true;
      loadReviews();
    }
  }, [activeTab, loadReviews, loadSubscriptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    if (activeTab === "posts") await loadServices();
    else if (activeTab === "subscriptions") {
      subscriptionsLoadedRef.current = true;
      await loadSubscriptions();
    } else if (activeTab === "reviews") {
      reviewsLoadedRef.current = true;
      await loadReviews();
    }
    setRefreshing(false);
  }, [activeTab, loadProfile, loadServices, loadSubscriptions, loadReviews]);

  // ── Profile image update ───────────────────────────────────────────────────

  const handleUpdateProfileImage = useCallback(
    async (imageUrl: string) => {
      if (!currentUserId) return;

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ profile_image_url: imageUrl })
          .eq("id", currentUserId);

        if (error) throw error;

        // Update local state
        setProfile((prev) =>
          prev ? { ...prev, profile_image_url: imageUrl } : null,
        );
      } catch (err: any) {
        console.error("Profile image update error:", err);
        throw err;
      }
    },
    [currentUserId],
  );

  // ── Service actions ────────────────────────────────────────────────────────

  const handleToggleStatus = useCallback((service: Service) => {
    const newStatus = service.status === "active" ? "inactive" : "active";
    const label = newStatus === "active" ? "Activate" : "Deactivate";
    Alert.alert(`${label} Service`, `${label} "${service.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        onPress: async () => {
          try {
            const updatedService = await updateServiceStatus(
              service.id,
              newStatus,
            );
            setServices((prev) =>
              prev.map((s) => (s.id === service.id ? updatedService : s)),
            );
            Alert.alert(
              "Success",
              `Service ${label.toLowerCase()}d successfully`,
            );
          } catch (err: any) {
            console.error("Toggle status error:", err);
            Alert.alert(
              "Error",
              err?.message || "An unexpected error occurred. Please try again.",
            );
          }
        },
      },
    ]);
  }, []);

  const handleDeleteService = useCallback(async () => {
    const captured = serviceToEdit;
    if (!captured) return;
    setIsActionSheetVisible(false);
    setTimeout(() => {
      Alert.alert(
        "Delete Service",
        `"${captured.title}" will be permanently removed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const { error } = await supabase
                .from("services")
                .update({ status: "deleted" })
                .eq("id", captured.id);
              if (!error)
                setServices((prev) => prev.filter((s) => s.id !== captured.id));
            },
          },
        ],
      );
    }, 300);
  }, [serviceToEdit]);

  const handleUnsubscribe = useCallback((providerId: string, name: string) => {
    Alert.alert("Unsubscribe", `Stop following ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unsubscribe",
        style: "destructive",
        onPress: async () => {
          try {
            await unsubscribeFromProvider(providerId);
            setSubscriptions((prev) =>
              prev.filter((s) => s.provider_id !== providerId),
            );
          } catch {
            Alert.alert("Error", "Could not unsubscribe. Please try again.");
          }
        },
      },
    ]);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayName = formatDisplayName(profile, "My Profile");
  const activeServiceCount = services.filter(
    (s) => s.status === "active",
  ).length;
  const avgRating =
    services.length > 0
      ? (
          services.reduce((sum, s) => sum + s.rating, 0) / services.length
        ).toFixed(1)
      : "—";

  // text-xl font-bold text-slate-900
  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-5 pb-2 border-b border-slate-100">
        <Text className="text-3xl font-bold text-slate-900">Profile</Text>
        <TouchableOpacity
          onPress={() => setIsSettingsVisible(true)}
          className="p-2 bg-slate-50 rounded-full"
        >
          <Settings size={20} color={COLORS.slate500} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Profile header */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setIsProfileImageModalVisible(true)}
              activeOpacity={0.7}
            >
              <ProfileAvatar profile={profile} size={80} textSize={32} />
            </TouchableOpacity>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-xl font-bold text-slate-900 mr-2">
                  {displayName}
                </Text>
                {profile?.physis_verified && (
                  <BadgeCheck size={18} color={COLORS.primary} fill="#dbeafe" />
                )}
              </View>
              <Text className="text-slate-400 text-sm mt-0.5">
                Member since{" "}
                {profile
                  ? new Date(profile.created_at).toLocaleDateString("en-PH", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </Text>
            </View>
          </View>

          <View className="flex-row mt-5 bg-slate-50 rounded-2xl p-4">
            <StatPill label="Subscribers" value={subscriberCount} />
            <View className="w-[1px] bg-slate-200 mx-4" />
            <StatPill label="Active Services" value={activeServiceCount} />
            <View className="w-[1px] bg-slate-200 mx-4" />
            <StatPill label="Avg Rating" value={avgRating} />
          </View>
        </View>

        {/* Tab Bar — uses shared TabBar component */}
        <TabBar
          tabs={PROFILE_TABS}
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />

        {/* Tab content */}
        <View className="px-5 pb-10 pt-4">
          {activeTab === "posts" && (
            <>
              {loadingServices ? (
                <LoadingSpinner />
              ) : services.length === 0 ? (
                <ProfileEmptyState
                  icon={<List size={32} color={COLORS.slate400} />}
                  title="No services yet"
                  subtitle="Tap the + button to post your first service listing."
                />
              ) : (
                services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onMorePress={() => {
                      setServiceToEdit(service);
                      setIsActionSheetVisible(true);
                    }}
                    onToggleStatus={() => handleToggleStatus(service)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "subscriptions" && (
            <>
              {loadingSubscriptions ? (
                <LoadingSpinner />
              ) : subscriptions.length === 0 ? (
                <ProfileEmptyState
                  icon={<Users size={32} color={COLORS.slate400} />}
                  title="Not following anyone"
                  subtitle="Subscribe to service providers to stay updated."
                />
              ) : (
                subscriptions.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    subscription={sub}
                    onUnsubscribe={handleUnsubscribe}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "reviews" && (
            <>
              {loadingReviews ? (
                <LoadingSpinner />
              ) : reviews.length === 0 ? (
                <ProfileEmptyState
                  icon={<Star size={32} color={COLORS.slate400} />}
                  title="No reviews yet"
                  subtitle="Reviews you write will appear here."
                />
              ) : (
                reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Sheet */}
      <Modal visible={isActionSheetVisible} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setIsActionSheetVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-[32px] p-6 pb-10"
          >
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-6" />
            {serviceToEdit && (
              <Text
                className="text-center font-bold text-slate-900 text-base mb-4"
                numberOfLines={1}
              >
                {serviceToEdit.title}
              </Text>
            )}
            <MenuOption
              icon={<Edit3 size={20} color={COLORS.primary} />}
              label="Edit Service"
              onPress={() => {
                setIsActionSheetVisible(false);
                setTimeout(() => setIsEditServiceVisible(true), 300);
              }}
            />
            <MenuOption
              icon={
                serviceToEdit?.status === "active" ? (
                  <AlertCircle size={20} color="#f97316" />
                ) : (
                  <BarChart3 size={20} color={COLORS.success} />
                )
              }
              label={
                serviceToEdit?.status === "active"
                  ? "Deactivate (hide)"
                  : "Activate (show)"
              }
              onPress={() => {
                const c = serviceToEdit;
                setIsActionSheetVisible(false);
                setTimeout(() => {
                  if (c) handleToggleStatus(c);
                }, 300);
              }}
            />
            <MenuOption
              icon={<Trash2 size={20} color={COLORS.danger} />}
              label="Delete Service"
              destructive
              onPress={handleDeleteService}
            />
            <TouchableOpacity
              onPress={() => setIsActionSheetVisible(false)}
              className="mt-4 bg-slate-100 py-4 rounded-2xl items-center"
            >
              <Text className="font-bold text-slate-700">Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {serviceToEdit && (
        <EditServiceModal
          visible={isEditServiceVisible}
          service={serviceToEdit}
          onClose={() => setIsEditServiceVisible(false)}
          onSaved={(updated) => {
            setServices((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
            setIsEditServiceVisible(false);
          }}
        />
      )}

      <SettingsModal
        visible={isSettingsVisible}
        profile={profile}
        onClose={() => setIsSettingsVisible(false)}
        onProfileUpdated={setProfile}
      />

      <ProfileImageModal
        visible={isProfileImageModalVisible}
        onClose={() => setIsProfileImageModalVisible(false)}
        profile={profile}
        onImageUpdate={handleUpdateProfileImage}
      />
    </View>
  );
}

// ── Shared Primitives ─────────────────────────────────────────────────────────

const LoadingSpinner = () => (
  <View className="py-16 items-center">
    <ActivityIndicator color={COLORS.primary} />
  </View>
);

const StatPill = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <View className="flex-1 items-center">
    <Text className="text-lg font-bold text-slate-900">{value}</Text>
    <Text className="text-xs text-slate-400 mt-0.5 text-center">{label}</Text>
  </View>
);

const ProfileEmptyState = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
}) => (
  <View className="py-16 items-center px-6">
    <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
      {icon}
    </View>
    <Text className="text-base font-bold text-slate-700 text-center">
      {title}
    </Text>
    <Text className="text-sm text-slate-400 text-center mt-1">{subtitle}</Text>
  </View>
);

const MenuOption = ({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center py-4 px-2 rounded-xl active:bg-slate-50"
  >
    {icon}
    <Text
      className={`ml-4 text-base ${destructive ? "text-red-500 font-bold" : "text-slate-900 font-medium"}`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ── ServiceCard ───────────────────────────────────────────────────────────────

const ServiceCard = ({
  service,
  onMorePress,
  onToggleStatus,
}: {
  service: Service;
  onMorePress: () => void;
  onToggleStatus: () => void;
}) => (
  <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        <View className="flex-row items-center mb-1">
          <View
            className={`px-2 py-0.5 rounded-full mr-2 ${service.status === "active" ? "bg-green-100" : "bg-slate-100"}`}
          >
            <Text
              className={`text-[10px] font-bold uppercase ${service.status === "active" ? "text-green-700" : "text-slate-500"}`}
            >
              {service.status}
            </Text>
          </View>
        </View>
        <Text
          className="text-base font-semibold text-slate-900"
          numberOfLines={1}
        >
          {service.title}
        </Text>
        <View className="flex-row items-center mt-1 flex-wrap">
          <View className="flex-row items-center mr-3">
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text className="ml-1 text-xs text-slate-500">
              {service.rating.toFixed(1)} ({service.review_count})
            </Text>
          </View>
          <View className="flex-row items-center mr-3">
            <MapPin size={12} color={COLORS.slate400} />
            <Text className="ml-1 text-xs text-slate-500" numberOfLines={1}>
              {service.location}
            </Text>
          </View>
          <Text className="text-xs font-semibold text-[#1877F2]">
            {formatPrice(service.price)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onMorePress}
        className="p-2 bg-slate-50 rounded-xl"
      >
        <MoreVertical size={18} color={COLORS.slate500} />
      </TouchableOpacity>
    </View>
  </View>
);

// ── SubscriptionRow ───────────────────────────────────────────────────────────

const SubscriptionRow = ({
  subscription: sub,
  onUnsubscribe,
}: {
  subscription: ServiceSubscriptionWithProfile;
  onUnsubscribe: (id: string, name: string) => void;
}) => {
  const p = sub.provider_profile;
  const name = formatDisplayName(p ?? null, "Provider");
  return (
    <View className="flex-row items-center py-3 border-b border-slate-50">
      <View className="w-12 h-12 rounded-xl bg-slate-200 items-center justify-center mr-3">
        <Text className="text-lg font-bold text-slate-500">
          {name[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-slate-900">{name}</Text>
          {p?.physis_verified && (
            <BadgeCheck size={14} color={COLORS.primary} className="ml-1" />
          )}
        </View>
        <Text className="text-xs text-slate-400 mt-0.5">
          Since{" "}
          {new Date(sub.created_at).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onUnsubscribe(sub.provider_id, name)}
        className="bg-slate-100 rounded-full px-3 py-1.5 flex-row items-center"
      >
        <UserMinus size={14} color={COLORS.slate500} />
        <Text className="text-xs font-medium text-slate-600 ml-1">
          Unfollow
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ── ReviewCard ────────────────────────────────────────────────────────────────

const ReviewCard = ({ review }: { review: any }) => (
  <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
    <Text
      className="text-sm font-semibold text-slate-800 mb-1"
      numberOfLines={1}
    >
      {review.service?.title ?? "Service"}
    </Text>
    <View className="flex-row items-center mb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          color="#f59e0b"
          fill={i < review.rating ? "#f59e0b" : "transparent"}
        />
      ))}
      <Text className="text-xs text-slate-400 ml-2">
        {new Date(review.created_at).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </Text>
    </View>
    {review.comment ? (
      <Text className="text-sm text-slate-600">{review.comment}</Text>
    ) : (
      <Text className="text-sm text-slate-300 italic">No comment</Text>
    )}
  </View>
);

// ── EditServiceModal ──────────────────────────────────────────────────────────

const EditServiceModal = ({
  visible,
  service,
  onClose,
  onSaved,
}: {
  visible: boolean;
  service: Service;
  onClose: () => void;
  onSaved: (updated: Service) => void;
}) => {
  const [saving, setSaving] = useState(false);
  const form = useServiceForm(visible ? service : null);

  const handleSave = async () => {
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
    setSaving(true);
    try {
      let imageUrl = service.image_url;
      if (form.selectedImage)
        imageUrl = await uploadImage(form.selectedImage, "service-images");
      const { data, error } = await supabase
        .from("services")
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          price: form.price.trim() ? parseFloat(form.price) : null,
          location: form.location.trim(),
          phone_number: form.phoneNumber.trim() || null,
          tags: form.tags.length > 0 ? form.tags : null,
          category_id: form.selectedCategory,
          image_url: imageUrl,
        })
        .eq("id", service.id)
        .select()
        .single();
      if (error) throw error;
      onSaved(data);
      Alert.alert("Saved!", "Your service has been updated.");
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row justify-between items-center px-5 py-4 border-b border-slate-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color={COLORS.slate900} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">Edit Service</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-[#1877F2] px-4 py-2 rounded-full"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-sm">Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={form.handlePickImage}
            className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden mb-4"
            style={{ height: 160 }}
          >
            {form.selectedImage || service.image_url ? (
              <Image
                source={{
                  uri: form.selectedImage ?? service.image_url ?? undefined,
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <AntDesign name="camera" size={32} color={COLORS.slate400} />
                <Text className="text-slate-400 text-sm mt-2">
                  Change image
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <FormField label="Title" required>
            <TextInput
              value={form.title}
              onChangeText={form.setTitle}
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>
          <FormField label="Description" required>
            <TextInput
              value={form.description}
              onChangeText={form.setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
              style={{ minHeight: 90 }}
            />
          </FormField>
          <FormField label="Category">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              {form.categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => form.setSelectedCategory(cat.id)}
                  className={`mx-1 px-4 py-2 rounded-full border ${form.selectedCategory === cat.id ? "bg-[#1877F2] border-[#1877F2]" : "bg-white border-slate-300"}`}
                >
                  <Text
                    className={`text-sm font-medium ${form.selectedCategory === cat.id ? "text-white" : "text-slate-700"}`}
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
              keyboardType="numeric"
              placeholder="Leave blank for 'Contact for price'"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>
          <FormField label="Tags">
            <TagInput
              tags={form.tags}
              currentTag={form.currentTag}
              onChangeTag={form.setCurrentTag}
              onAdd={form.handleAddTag}
              onRemove={form.handleRemoveTag}
            />
          </FormField>
          <FormField label="Location" required>
            <TextInput
              value={form.location}
              onChangeText={form.setLocation}
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>
          <FormField label="Phone Number">
            <TextInput
              value={form.phoneNumber}
              onChangeText={form.setPhoneNumber}
              keyboardType="phone-pad"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor={COLORS.slate400}
            />
          </FormField>
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ── SettingsModal ─────────────────────────────────────────────────────────────

type SettingsSection =
  | "main"
  | "account"
  | "verify"
  | "terms"
  | "help"
  | "notifPrefs";
const SECTION_TITLES: Record<SettingsSection, string> = {
  main: "Settings",
  account: "Account Details",
  verify: "Verify Account",
  terms: "Terms & Services",
  help: "Help",
  notifPrefs: "Notifications",
};

const SettingsModal = ({
  visible,
  profile,
  onClose,
  onProfileUpdated,
}: {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onProfileUpdated: (p: Profile) => void;
}) => {
  const [section, setSection] = useState<SettingsSection>("main");
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [saving, setSaving] = useState(false);

  // Notification preferences state
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifSubscriptions, setNotifSubscriptions] = useState(true);
  const [notifServiceUpdates, setNotifServiceUpdates] = useState(true);

  // Load notification preferences from AsyncStorage on mount
  useEffect(() => {
    loadNotificationPreferences();
  }, []);
  const saveNotificationPreferences = useCallback(async () => {
    try {
      const prefs = {
        messages: notifMessages,
        reviews: notifReviews,
        comments: notifComments,
        subscriptions: notifSubscriptions,
        serviceUpdates: notifServiceUpdates,
      };
      await AsyncStorage.setItem(
        "notification_preferences",
        JSON.stringify(prefs),
      );
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    }
  }, [
    notifComments,
    notifMessages,
    notifReviews,
    notifServiceUpdates,
    notifSubscriptions,
  ]);

  // Save notification preferences whenever they change
  useEffect(() => {
    saveNotificationPreferences();
  }, [
    notifMessages,
    notifReviews,
    notifComments,
    notifSubscriptions,
    notifServiceUpdates,
    saveNotificationPreferences,
  ]);

  const loadNotificationPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem("notification_preferences");
      if (stored) {
        const prefs = JSON.parse(stored);
        setNotifMessages(prefs.messages ?? true);
        setNotifReviews(prefs.reviews ?? true);
        setNotifComments(prefs.comments ?? true);
        setNotifSubscriptions(prefs.subscriptions ?? true);
        setNotifServiceUpdates(prefs.serviceUpdates ?? true);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSection("main");
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [visible, profile]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ first_name: firstName.trim(), last_name: lastName.trim() })
        .eq("id", profile.id)
        .select()
        .single();
      if (error) throw error;
      onProfileUpdated(data);
      Alert.alert("Saved", "Your profile has been updated.");
      setSection("main");
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
          {section !== "main" && (
            <TouchableOpacity
              onPress={() => setSection("main")}
              className="p-1 mr-3"
            >
              <AntDesign name="arrow-left" size={22} color={COLORS.slate900} />
            </TouchableOpacity>
          )}
          <Text className="text-xl font-bold text-slate-900 flex-1">
            {SECTION_TITLES[section]}
          </Text>
          {section === "main" && (
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={22} color={COLORS.slate900} />
            </TouchableOpacity>
          )}
          {section === "account" && (
            <TouchableOpacity
              onPress={saveProfile}
              disabled={saving}
              className="bg-[#1877F2] px-4 py-2 rounded-full"
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <ScrollView className="flex-1">
          {section === "main" && (
            <View className="p-5">
              <SectionGroup label="Account">
                <SettingsRow
                  icon={<Edit3 size={20} color={COLORS.primary} />}
                  label="Account Details"
                  subtitle="Edit your name"
                  onPress={() => setSection("account")}
                />
                <SettingsRow
                  icon={
                    <Shield
                      size={20}
                      color={
                        profile?.physis_verified ? COLORS.success : "#f97316"
                      }
                    />
                  }
                  label="Verify Account"
                  subtitle={
                    profile?.physis_verified
                      ? "Your account is verified ✅"
                      : "Verify your PhilSys ID"
                  }
                  onPress={() => setSection("verify")}
                />
              </SectionGroup>
              <SectionGroup label="Preferences">
                <SettingsRow
                  icon={<Bell size={20} color={COLORS.info} />}
                  label="Notification Preferences"
                  subtitle="Control what alerts you receive"
                  onPress={() => setSection("notifPrefs")}
                />
              </SectionGroup>
              <SectionGroup label="Legal & Support">
                <SettingsRow
                  icon={<FileText size={20} color={COLORS.slate500} />}
                  label="Terms & Services"
                  onPress={() => setSection("terms")}
                />
                <SettingsRow
                  icon={<HelpCircle size={20} color={COLORS.slate500} />}
                  label="Help & Support"
                  onPress={() => setSection("help")}
                />
              </SectionGroup>
              <SectionGroup label="">
                <SettingsRow
                  icon={<LogOut size={20} color={COLORS.danger} />}
                  label="Logout"
                  destructive
                  onPress={() =>
                    Alert.alert("Logout", "Are you sure?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Logout",
                        style: "destructive",
                        onPress: handleLogout,
                      },
                    ])
                  }
                />
              </SectionGroup>
              <Text className="text-center text-xs text-slate-300 mt-6 mb-2">
                Servell v1.0 · February 2026
              </Text>
            </View>
          )}
          {section === "account" && (
            <View className="p-5">
              <FormField label="First Name">
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                  placeholderTextColor={COLORS.slate400}
                />
              </FormField>
              <FormField label="Last Name">
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                  placeholderTextColor={COLORS.slate400}
                />
              </FormField>
            </View>
          )}
          {section === "notifPrefs" && (
            <View className="p-5">
              <Text className="text-sm text-slate-600 mb-4">
                Choose which notifications you&apos;d like to receive
              </Text>
              <NotificationToggle
                icon={<Bell size={20} color={COLORS.primary} />}
                label="New Messages"
                description="Get notified when you receive new messages"
                value={notifMessages}
                onToggle={setNotifMessages}
              />
              <NotificationToggle
                icon={<Star size={20} color="#f59e0b" />}
                label="Reviews & Ratings"
                description="Alerts when someone reviews your services"
                value={notifReviews}
                onToggle={setNotifReviews}
              />
              <NotificationToggle
                icon={<List size={20} color={COLORS.info} />}
                label="Comments"
                description="Notifications for comments on your services"
                value={notifComments}
                onToggle={setNotifComments}
              />
              <NotificationToggle
                icon={<Users size={20} color={COLORS.success} />}
                label="New Followers"
                description="Know when someone subscribes to your services"
                value={notifSubscriptions}
                onToggle={setNotifSubscriptions}
              />
              <NotificationToggle
                icon={<BarChart3 size={20} color="#8b5cf6" />}
                label="Service Updates"
                description="Updates about services you're following"
                value={notifServiceUpdates}
                onToggle={setNotifServiceUpdates}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const SectionGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View className="mb-5">
    {label ? (
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
        {label}
      </Text>
    ) : null}
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {children}
    </View>
  </View>
);

const SettingsRow = ({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
}: {
  icon: React.ReactElement;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center px-4 py-4 border-b border-slate-50 active:bg-slate-50"
  >
    <View className="w-8 items-center mr-3">{icon}</View>
    <View className="flex-1">
      <Text
        className={`font-medium text-base ${destructive ? "text-red-500" : "text-slate-900"}`}
      >
        {label}
      </Text>
      {subtitle && (
        <Text className="text-xs text-slate-400 mt-0.5">{subtitle}</Text>
      )}
    </View>
    {!destructive && <ChevronRight size={18} color={COLORS.slate300} />}
  </TouchableOpacity>
);

const NotificationToggle = ({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: React.ReactElement;
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <View className="flex-row items-start py-4 border-b border-slate-100">
    <View className="w-8 items-center mr-3 mt-0.5">{icon}</View>
    <View className="flex-1 mr-3">
      <Text className="font-medium text-base text-slate-900">{label}</Text>
      <Text className="text-xs text-slate-500 mt-1">{description}</Text>
    </View>
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      className={`w-12 h-7 rounded-full justify-center ${value ? "bg-[#1877F2]" : "bg-slate-300"}`}
    >
      <View
        className={`w-5 h-5 rounded-full bg-white shadow-sm ${value ? "ml-auto mr-1" : "ml-1"}`}
      />
    </TouchableOpacity>
  </View>
);
