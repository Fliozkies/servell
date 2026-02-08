import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchServices } from "../../../lib/api/services.api";
import { ItemProps } from "../../../lib/types/custom.types";
import { ServiceWithDetails } from "../../../lib/types/database.types";

// Get screen width to handle grid spacing logic
const { width } = Dimensions.get("window");
const columnWidth = (width - 48) / 2; // Subtracting total horizontal padding

const Item = ({
  id,
  title,
  category,
  price,
  rating,
  author,
  image,
  reviewCount,
}: ItemProps & { id: string }) => (
  <TouchableOpacity
    onPress={() => router.push(`/juarez_app/pages/service_detail?id=${id}`)}
    style={{ width: columnWidth }}
    className="bg-white rounded-3xl mb-4 overflow-hidden border border-[#E9ECEF]"
  >
    {/* Image Container */}
    <View>
      {image ? (
        <Image
          style={{ height: 140 }}
          className="w-full object-cover"
          source={{ uri: image }}
        />
      ) : (
        // Placeholder for services without images
        <View
          style={{ height: 140 }}
          className="w-full bg-slate-200 items-center justify-center"
        >
          <AntDesign name="picture" size={40} color="#94a3b8" />
        </View>
      )}

      {/* Service Badge */}
      <View className="absolute top-2 right-2 bg-white/70 px-2 py-0.5 rounded-3xl">
        <Text className="text-[10px] font-bold tracking-tight">SERVICE</Text>
      </View>
    </View>

    {/* Content Area */}
    <View className="p-3">
      {/* Category and Rating */}
      <View className="flex">
        <Text className="text-[#868E96] text-[12px]">{category}</Text>
        <View className="flex-row items-center">
          <AntDesign name="star" size={12} color="#FCC419" />
          <Text className="ml-1 text-[12px] font-bold text-[#212529]">
            {rating.toFixed(1)}
          </Text>
          {reviewCount > 0 && (
            <Text className="ml-1 text-[10px] text-[#868E96]">
              ({reviewCount})
            </Text>
          )}
        </View>
      </View>

      {/* Title - Truncated for Grid Consistency */}
      <Text
        className="text-[14px] font-bold text-[#212529] mb-3"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Footer */}
      <View className="flex-row justify-between items-center">
        {price !== null ? (
          <Text className="text-[18px] font-black text-[#212529]">
            ₱{price.toLocaleString()}
          </Text>
        ) : (
          <Text className="text-[14px] font-semibold text-[#868E96]">
            Contact for price
          </Text>
        )}
        <Text className="text-[#ADB5BD] text-[11px]" numberOfLines={1}>
          {author}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function ServicesContent() {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch services on component mount
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setError(null);
      const data = await fetchServices();
      setServices(data);
    } catch (err) {
      console.error("Error loading services:", err);
      setError("Failed to load services. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#1877F2" />
        <Text className="mt-4 text-slate-600">Loading services...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="exclamation-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-slate-800 font-semibold text-center">
          {error}
        </Text>
        <Text className="mt-2 text-slate-600 text-center">
          Pull down to refresh
        </Text>
      </View>
    );
  }

  // Empty state
  if (services.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <AntDesign name="inbox" size={64} color="#94a3b8" />
        <Text className="mt-4 text-slate-800 font-semibold text-lg">
          No Services Yet
        </Text>
        <Text className="mt-2 text-slate-600 text-center">
          Be the first to post a service! Tap the + button below to get started.
        </Text>
      </View>
    );
  }

  // Services list
  return (
    <FlatList
      data={services}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      contentContainerStyle={{ padding: 16 }}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#1877F2"]}
          tintColor="#1877F2"
        />
      }
      renderItem={({ item }) => {
        // Get author name from profile
        const authorName = item.profile?.first_name
          ? `${item.profile.first_name} ${item.profile.last_name || ""}`.trim()
          : "Unknown";

        // Get category name
        const categoryName = item.category?.name || "Uncategorized";

        return (
          <Item
            id={item.id}
            title={item.title}
            category={categoryName}
            price={item.price}
            rating={item.rating}
            author={authorName}
            image={item.image_url}
            reviewCount={item.review_count}
          />
        );
      }}
    />
  );
}
