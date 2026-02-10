import { fetchUserServices } from "@/lib/api/services.api";
import {
  getSubscriberCount,
  getSubscriptions,
  unsubscribeFromProvider,
} from "@/lib/api/subscriptions.api";
import { supabase } from "@/lib/api/supabase";
import {
  addTag,
  loadCategories,
  pickImage,
  removeTag,
  uploadImage,
} from "@/lib/functions/create_service";
import {
  Category,
  Profile,
  Service,
  ServiceSubscriptionWithProfile,
} from "@/lib/types/database.types";
import { AntDesign } from "@expo/vector-icons";
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

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileTab = "posts" | "subscriptions" | "reviews";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleLogout() {
  await supabase.auth.signOut();
  router.replace("../../(auth)/auth");
}

function formatDisplayName(profile: Profile | null): string {
  if (!profile) return "My Profile";
  return (
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    "My Profile"
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  // User data
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Services tab
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Subscriptions tab
  const [subscriptions, setSubscriptions] = useState<
    ServiceSubscriptionWithProfile[]
  >([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Reviews tab
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Cache flags — only load each lazy tab once; pull-to-refresh bypasses them
  const subscriptionsLoadedRef = useRef(false);
  const reviewsLoadedRef = useRef(false);

  // Global refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [isEditServiceVisible, setIsEditServiceVisible] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  // ── Data Loaders ───────────────────────────────────────────────────────────

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

    const count = await getSubscriberCount(user.id);
    setSubscriberCount(count);
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
      const data = await getSubscriptions();
      setSubscriptions(data);
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
        .select(`*, service:services(title, image_url)`)
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

  // ── Effects ────────────────────────────────────────────────────────────────

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

  // FIX: All used variables are listed as dependencies. This is correct because
  // onRefresh reads activeTab and calls load* functions that may change identity.
  // The load* functions themselves are stable (memoized with useCallback), so
  // adding them here does NOT cause infinite loops — it just keeps the closure fresh.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    if (activeTab === "posts") {
      await loadServices();
    } else if (activeTab === "subscriptions") {
      subscriptionsLoadedRef.current = true;
      await loadSubscriptions();
    } else if (activeTab === "reviews") {
      reviewsLoadedRef.current = true;
      await loadReviews();
    }
    setRefreshing(false);
  }, [activeTab, loadProfile, loadServices, loadSubscriptions, loadReviews]);

  // ── Service Actions ────────────────────────────────────────────────────────

  const openActionMenu = useCallback((service: Service) => {
    setServiceToEdit(service);
    setIsActionSheetVisible(true);
  }, []);

  const handleToggleStatus = useCallback((service: Service) => {
    const newStatus = service.status === "active" ? "inactive" : "active";
    const label = newStatus === "active" ? "Activate" : "Deactivate";

    Alert.alert(
      `${label} Service`,
      `Are you sure you want to ${label.toLowerCase()} "${service.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          onPress: async () => {
            const { error } = await supabase
              .from("services")
              .update({ status: newStatus })
              .eq("id", service.id);

            if (!error) {
              setServices((prev) =>
                prev.map((s) =>
                  s.id === service.id ? { ...s, status: newStatus } : s,
                ),
              );
            }
          },
        },
      ],
    );
  }, []);

  const handleDeleteService = useCallback(async () => {
    const captured = serviceToEdit;
    if (!captured) return;
    setIsActionSheetVisible(false);
    setTimeout(() => {
      Alert.alert(
        "Delete Service",
        `"${captured.title}" will be permanently removed. This cannot be undone.`,
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

              if (!error) {
                setServices((prev) => prev.filter((s) => s.id !== captured.id));
              }
            },
          },
        ],
      );
    }, 300);
  }, [serviceToEdit]);

  // ── Subscription Actions ───────────────────────────────────────────────────

  const handleUnsubscribe = useCallback(
    (providerId: string, providerName: string) => {
      Alert.alert("Unsubscribe", `Stop following ${providerName}?`, [
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
            } catch (e) {
              Alert.alert("Error", "Could not unsubscribe. Please try again.");
              console.error("Unsubscribe error:", e);
            }
          },
        },
      ]);
    },
    [],
  );

  // ── Derived Values ─────────────────────────────────────────────────────────

  const displayName = formatDisplayName(profile);
  const activeServiceCount = services.filter(
    (s) => s.status === "active",
  ).length;
  const avgRating =
    services.length > 0
      ? (
          services.reduce((sum, s) => sum + s.rating, 0) / services.length
        ).toFixed(1)
      : "—";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-900">Profile</Text>
        <TouchableOpacity
          onPress={() => setIsSettingsVisible(true)}
          className="p-2 bg-slate-50 rounded-full"
        >
          <Settings size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1877F2"
          />
        }
      >
        {/* Profile Header Card */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-2xl bg-slate-200 items-center justify-center">
              <Text className="text-3xl font-bold text-slate-500">
                {displayName[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>

            <View className="ml-4 flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-xl font-bold text-slate-900 mr-2">
                  {displayName}
                </Text>
                {profile?.physis_verified && (
                  <BadgeCheck size={18} color="#1877F2" fill="#dbeafe" />
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

          {/* Stats Row */}
          <View className="flex-row mt-5 bg-slate-50 rounded-2xl p-4">
            <StatPill label="Subscribers" value={subscriberCount} />
            <View className="w-[1px] bg-slate-200 mx-4" />
            <StatPill label="Active Services" value={activeServiceCount} />
            <View className="w-[1px] bg-slate-200 mx-4" />
            <StatPill label="Avg Rating" value={avgRating} />
          </View>
        </View>

        {/* Tab Bar */}
        <View className="flex-row px-5 border-b border-slate-100">
          <ProfileTabButton
            active={activeTab === "posts"}
            onPress={() => setActiveTab("posts")}
            label="Services"
            Icon={List}
          />
          <ProfileTabButton
            active={activeTab === "subscriptions"}
            onPress={() => setActiveTab("subscriptions")}
            label="Following"
            Icon={Users}
          />
          <ProfileTabButton
            active={activeTab === "reviews"}
            onPress={() => setActiveTab("reviews")}
            label="My Reviews"
            Icon={Star}
          />
        </View>

        {/* Tab Content */}
        <View className="px-5 pb-10 pt-4">
          {/* ── SERVICES TAB ─────────────────────────────────────────── */}
          {activeTab === "posts" && (
            <>
              {loadingServices ? (
                <LoadingSpinner />
              ) : services.length === 0 ? (
                <EmptyState
                  icon={<List size={32} color="#94a3b8" />}
                  title="No services yet"
                  subtitle="Tap the + button to post your first service listing."
                />
              ) : (
                services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onMorePress={() => openActionMenu(service)}
                    onToggleStatus={() => handleToggleStatus(service)}
                  />
                ))
              )}
            </>
          )}

          {/* ── SUBSCRIPTIONS TAB ────────────────────────────────────── */}
          {activeTab === "subscriptions" && (
            <>
              {loadingSubscriptions ? (
                <LoadingSpinner />
              ) : subscriptions.length === 0 ? (
                <EmptyState
                  icon={<Users size={32} color="#94a3b8" />}
                  title="Not following anyone"
                  subtitle="Subscribe to service providers on their profile to stay updated."
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

          {/* ── REVIEWS TAB ──────────────────────────────────────────── */}
          {activeTab === "reviews" && (
            <>
              {loadingReviews ? (
                <LoadingSpinner />
              ) : reviews.length === 0 ? (
                <EmptyState
                  icon={<Star size={32} color="#94a3b8" />}
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

      {/* ── Action Sheet ── */}
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
              icon={<Edit3 size={20} color="#1877F2" />}
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
                  <BarChart3 size={20} color="#10b981" />
                )
              }
              label={
                serviceToEdit?.status === "active"
                  ? "Deactivate (hide)"
                  : "Activate (show)"
              }
              onPress={() => {
                const captured = serviceToEdit;
                setIsActionSheetVisible(false);
                if (captured) handleToggleStatus(captured);
              }}
            />
            <MenuOption
              icon={<Trash2 size={20} color="#ef4444" />}
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

      {/* ── Edit Service Modal ── */}
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

      {/* ── Settings Modal ── */}
      <SettingsModal
        visible={isSettingsVisible}
        profile={profile}
        onClose={() => setIsSettingsVisible(false)}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </SafeAreaView>
  );
};

// ── Shared UI Primitives ──────────────────────────────────────────────────────

const LoadingSpinner = () => (
  <View className="py-16 items-center">
    <ActivityIndicator color="#1877F2" />
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

const ProfileTabButton = ({
  active,
  onPress,
  label,
  Icon,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center py-3.5 mr-5 border-b-2 ${
      active ? "border-[#1877F2]" : "border-transparent"
    }`}
  >
    <Icon size={16} color={active ? "#1877F2" : "#94a3b8"} />
    <Text
      className={`ml-1.5 text-sm font-semibold ${
        active ? "text-[#1877F2]" : "text-slate-400"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const EmptyState = ({
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

const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <Text className="text-sm font-semibold text-slate-700 mb-2">
      {label} {required && <Text className="text-red-500">*</Text>}
    </Text>
    {children}
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
      className={`ml-4 text-base ${
        destructive ? "text-red-500 font-bold" : "text-slate-900 font-medium"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ── Tab-specific Sub-components ───────────────────────────────────────────────

const ServiceCard = ({
  service,
  onMorePress,
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
            className={`px-2 py-0.5 rounded-full mr-2 ${
              service.status === "active" ? "bg-green-100" : "bg-slate-100"
            }`}
          >
            <Text
              className={`text-[10px] font-bold uppercase ${
                service.status === "active"
                  ? "text-green-700"
                  : "text-slate-500"
              }`}
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
            <MapPin size={12} color="#94a3b8" />
            <Text className="ml-1 text-xs text-slate-500" numberOfLines={1}>
              {service.location}
            </Text>
          </View>
          <Text className="text-xs font-semibold text-[#1877F2]">
            {service.price != null
              ? `₱${service.price.toLocaleString()}`
              : "Contact for price"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onMorePress}
        className="p-2 bg-slate-50 rounded-xl"
      >
        <MoreVertical size={18} color="#64748b" />
      </TouchableOpacity>
    </View>
  </View>
);

const SubscriptionRow = ({
  subscription: sub,
  onUnsubscribe,
}: {
  subscription: ServiceSubscriptionWithProfile;
  onUnsubscribe: (providerId: string, name: string) => void;
}) => {
  const p = sub.provider_profile;
  const name = p
    ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Provider"
    : "Provider";

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
            <BadgeCheck size={14} color="#1877F2" className="ml-1" />
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
        <UserMinus size={14} color="#64748b" />
        <Text className="text-xs font-medium text-slate-600 ml-1">
          Unfollow
        </Text>
      </TouchableOpacity>
    </View>
  );
};

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

// ── Edit Service Modal ────────────────────────────────────────────────────────

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
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [price, setPrice] = useState(
    service.price != null ? String(service.price) : "",
  );
  const [location, setLocation] = useState(service.location);
  const [phoneNumber, setPhoneNumber] = useState(service.phone_number ?? "");
  const [tags, setTags] = useState<string[]>(service.tags ?? []);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    service.category_id,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadCategories({ setLoadingCategories: () => {}, setCategories });
    setTitle(service.title);
    setDescription(service.description);
    setPrice(service.price != null ? String(service.price) : "");
    setLocation(service.location);
    setPhoneNumber(service.phone_number ?? "");
    setTags(service.tags ?? []);
    setSelectedCategory(service.category_id);
    setSelectedImage(null);
  }, [visible, service]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please enter a description.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = service.image_url;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage, "service-images");
      }

      const updates = {
        title: title.trim(),
        description: description.trim(),
        price: price.trim() ? parseFloat(price) : null,
        location: location.trim(),
        phone_number: phoneNumber.trim() || null,
        tags: tags.length > 0 ? tags : null,
        category_id: selectedCategory,
        image_url: imageUrl,
      };

      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", service.id)
        .select()
        .single();

      if (error) throw error;
      onSaved(data);
      Alert.alert("Saved!", "Your service has been updated.");
    } catch (e) {
      console.error(e);
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
            <X size={24} color="#0f172a" />
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
          {/* Image Picker */}
          <TouchableOpacity
            onPress={() => pickImage(setSelectedImage)}
            className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden mb-4"
            style={{ height: 160 }}
          >
            {selectedImage || service.image_url ? (
              <Image
                source={{
                  uri: selectedImage ?? service.image_url ?? undefined,
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <AntDesign name="camera" size={32} color="#94a3b8" />
                <Text className="text-slate-400 text-sm mt-2">
                  Change image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <FormField label="Title" required>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </FormField>

          <FormField label="Description" required>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
              style={{ minHeight: 90 }}
            />
          </FormField>

          <FormField label="Category">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  className={`mx-1 px-4 py-2 rounded-full border ${
                    selectedCategory === cat.id
                      ? "bg-[#1877F2] border-[#1877F2]"
                      : "bg-white border-slate-300"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategory === cat.id
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
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="Leave blank for 'Contact for price'"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </FormField>

          <FormField label="Tags">
            <View className="flex-row items-center mb-2">
              <TextInput
                value={currentTag}
                onChangeText={setCurrentTag}
                placeholder="Add a tag..."
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
                onSubmitEditing={() =>
                  addTag({ currentTag, tags, setTags, setCurrentTag })
                }
              />
              <TouchableOpacity
                onPress={() =>
                  addTag({ currentTag, tags, setTags, setCurrentTag })
                }
                className="ml-2 bg-[#1877F2] rounded-xl px-4 py-3"
              >
                <Text className="text-white font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View className="flex-row flex-wrap">
                {tags.map((tag, i) => (
                  <View
                    key={i}
                    className="bg-slate-100 rounded-full px-3 py-1 flex-row items-center mr-2 mb-2"
                  >
                    <Text className="text-slate-700 text-sm mr-1">{tag}</Text>
                    <TouchableOpacity
                      onPress={() => removeTag(tag, tags, setTags)}
                    >
                      <AntDesign name="close" size={12} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </FormField>

          <FormField label="Location" required>
            <TextInput
              value={location}
              onChangeText={setLocation}
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </FormField>

          <FormField label="Phone Number">
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </FormField>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ── Settings Modal ────────────────────────────────────────────────────────────

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
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSection("main");
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [visible, profile]);

  const saveProfileDetails = async () => {
    if (!profile) return;
    setSavingProfile(true);
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
      setSavingProfile(false);
    }
  };

  const requestVerification = async () => {
    if (!profile) return;
    Alert.alert(
      "Submit for Verification",
      "Our team will review your PhilSys ID. For now this will mark your account as verified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            const { data, error } = await supabase
              .from("profiles")
              .update({ physis_verified: true })
              .eq("id", profile.id)
              .select()
              .single();
            if (!error && data) {
              onProfileUpdated(data);
              Alert.alert(
                "Submitted!",
                "Your account is now marked as verified.",
              );
              setSection("main");
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-slate-100">
          {section !== "main" && (
            <TouchableOpacity
              onPress={() => setSection("main")}
              className="p-1 mr-3"
            >
              <AntDesign name="arrow-left" size={22} color="#0f172a" />
            </TouchableOpacity>
          )}
          <Text className="text-xl font-bold text-slate-900 flex-1">
            {SECTION_TITLES[section]}
          </Text>
          {section === "main" && (
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={22} color="#0f172a" />
            </TouchableOpacity>
          )}
          {section === "account" && (
            <TouchableOpacity
              onPress={saveProfileDetails}
              disabled={savingProfile}
              className="bg-[#1877F2] px-4 py-2 rounded-full"
            >
              {savingProfile ? (
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
                  icon={<Edit3 size={20} color="#1877F2" />}
                  label="Account Details"
                  subtitle="Edit your name"
                  onPress={() => setSection("account")}
                />
                <SettingsRow
                  icon={
                    <Shield
                      size={20}
                      color={profile?.physis_verified ? "#10b981" : "#f97316"}
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
                  icon={<Bell size={20} color="#8b5cf6" />}
                  label="Notification Preferences"
                  subtitle="Control what alerts you receive"
                  onPress={() => setSection("notifPrefs")}
                />
              </SectionGroup>

              <SectionGroup label="Legal & Support">
                <SettingsRow
                  icon={<FileText size={20} color="#64748b" />}
                  label="Terms & Services"
                  onPress={() => setSection("terms")}
                />
                <SettingsRow
                  icon={<HelpCircle size={20} color="#64748b" />}
                  label="Help & Support"
                  onPress={() => setSection("help")}
                />
              </SectionGroup>

              <SectionGroup label="">
                <SettingsRow
                  icon={<LogOut size={20} color="#ef4444" />}
                  label="Logout"
                  destructive
                  onPress={() =>
                    Alert.alert("Logout", "Are you sure you want to log out?", [
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
                  placeholderTextColor="#94a3b8"
                />
              </FormField>
              <FormField label="Last Name">
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  className="border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </FormField>
              <View className="bg-blue-50 rounded-xl p-4 mt-2">
                <Text className="text-xs text-blue-600">
                  Your display name is shown to other users across the app.
                  Email and password changes are managed through your account
                  settings on the login page.
                </Text>
              </View>
            </View>
          )}

          {section === "verify" && (
            <View className="p-5">
              {profile?.physis_verified ? (
                <View className="items-center py-8">
                  <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
                    <BadgeCheck size={40} color="#10b981" />
                  </View>
                  <Text className="text-xl font-bold text-slate-900 mb-2">
                    You&#x2019;re Verified!
                  </Text>
                  <Text className="text-slate-500 text-center">
                    Your PhilSys ID has been verified. A verification badge is
                    shown on your public profile.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text className="text-slate-700 mb-4">
                    Verifying your account builds trust with clients.
                    You&#x2019;ll receive a blue checkmark badge on your profile
                    after verification.
                  </Text>
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <Text className="text-sm font-semibold text-amber-800 mb-1">
                      📋 What you&#x2019;ll need
                    </Text>
                    <Text className="text-sm text-amber-700">
                      A valid PhilSys National ID card. Make sure the details on
                      your profile match your ID.
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400 mb-6">
                    Note: Automated verification is coming soon. This will mark
                    your account as verified for demonstration purposes.
                  </Text>
                  <TouchableOpacity
                    onPress={requestVerification}
                    className="bg-[#1877F2] py-4 rounded-2xl items-center"
                  >
                    <Text className="text-white font-bold text-base">
                      Submit for Verification
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {section === "notifPrefs" && (
            <View className="p-5">
              <Text className="text-slate-500 text-sm mb-4">
                Choose which notifications you receive. (Full preference
                management coming in a future update.)
              </Text>
              {NOTIFICATION_PREFS.map((item) => (
                <View
                  key={item.label}
                  className="flex-row items-center justify-between py-4 border-b border-slate-50"
                >
                  <View>
                    <Text className="font-semibold text-slate-800">
                      {item.label}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {item.subtitle}
                    </Text>
                  </View>
                  <View className="w-12 h-7 bg-[#1877F2] rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">ON</Text>
                  </View>
                </View>
              ))}
              <Text className="text-xs text-slate-300 mt-4 text-center">
                Toggle controls are coming soon.
              </Text>
            </View>
          )}

          {section === "terms" && (
            <View className="p-5">
              <Text className="text-lg font-bold text-slate-900 mb-3">
                Terms of Service
              </Text>
              {TERMS_SECTIONS.map((t) => (
                <View key={t.heading}>
                  {t.heading ? (
                    <Text className="text-sm font-semibold text-slate-800 mb-2">
                      {t.heading}
                    </Text>
                  ) : null}
                  <Text className="text-sm text-slate-600 leading-6 mb-4">
                    {t.body}
                  </Text>
                </View>
              ))}
              <Text className="text-xs text-slate-400 mt-4">
                Last updated: February 2026
              </Text>
            </View>
          )}

          {section === "help" && (
            <View className="p-5">
              <Text className="text-lg font-bold text-slate-900 mb-4">
                Help & Support
              </Text>
              {HELP_FAQS.map((item) => (
                <View key={item.q} className="mb-5">
                  <Text className="font-semibold text-slate-800 mb-1">
                    {item.q}
                  </Text>
                  <Text className="text-sm text-slate-500 leading-5">
                    {item.a}
                  </Text>
                </View>
              ))}
              <View className="bg-blue-50 rounded-xl p-4 mt-2">
                <Text className="text-sm font-semibold text-blue-800 mb-1">
                  Still need help?
                </Text>
                <Text className="text-sm text-blue-600">
                  Email us at support@servell.ph and we&#x2019;ll get back to
                  you within 24 hours.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ── Settings Sub-components ───────────────────────────────────────────────────

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
    className="flex-row items-center px-4 py-4 border-b border-slate-50 last:border-0 active:bg-slate-50"
  >
    <View className="w-8 items-center mr-3">{icon}</View>
    <View className="flex-1">
      <Text
        className={`font-medium text-base ${
          destructive ? "text-red-500" : "text-slate-900"
        }`}
      >
        {label}
      </Text>
      {subtitle && (
        <Text className="text-xs text-slate-400 mt-0.5">{subtitle}</Text>
      )}
    </View>
    {!destructive && <ChevronRight size={18} color="#cbd5e1" />}
  </TouchableOpacity>
);

// ── Static Data ───────────────────────────────────────────────────────────────

const NOTIFICATION_PREFS = [
  { label: "Messages", subtitle: "New chat messages" },
  { label: "Reviews & Replies", subtitle: "Reviews on your services" },
  { label: "Subscriber alerts", subtitle: "When someone follows you" },
  { label: "Discount alerts", subtitle: "From providers you follow" },
  { label: "Platform announcements", subtitle: "Holiday deals & news" },
];

const TERMS_SECTIONS = [
  {
    heading: "",
    body: "By using Servell, you agree to use the platform responsibly and in accordance with applicable laws in the Philippines.",
  },
  {
    heading: "Service Listings",
    body: "You are responsible for the accuracy and legality of any services you post. Servell reserves the right to remove listings that violate our community guidelines.",
  },
  {
    heading: "Payments",
    body: "Servell does not process payments between buyers and sellers. All financial arrangements are made directly between users.",
  },
  {
    heading: "Privacy",
    body: "Your data is stored securely on Supabase infrastructure. We do not sell your personal data to third parties. See our full Privacy Policy for more details.",
  },
];

const HELP_FAQS = [
  {
    q: "How do I post a service?",
    a: 'Tap the + button in the bottom navigation bar. Fill in your service details and tap "Post Service".',
  },
  {
    q: "How do I message a provider?",
    a: 'Open a service listing and tap "Contact Provider". This will start a private conversation.',
  },
  {
    q: "How do I leave a review?",
    a: 'You must first start a conversation with the provider. After that, a "Write a Review" option will be available on the service page.',
  },
  {
    q: "How do I subscribe to a provider?",
    a: "Visit a service provider's profile and tap the Subscribe button. You'll then receive updates when they post discounts or new services.",
  },
  {
    q: "How do I verify my account?",
    a: "Go to Settings → Verify Account and follow the instructions to submit your PhilSys ID.",
  },
];

export default ProfilePage;
