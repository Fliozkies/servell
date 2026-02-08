import { Bell } from "lucide-react-native";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logout from "../../(app)/home";
import { PageName } from "../../../lib/types/custom.types";
import ConversationsScreen from "./conversations";
import CreateService from "./create_service";
import BottomNav from "./Navigation";
import ServicesContent from "./services_content";

export default function ServellApp() {
  const [activeTab, setActiveTab] = useState<PageName>("Services");
  const insets = useSafeAreaInsets();

  // Handle when a service is created
  const handleServiceCreated = () => {
    setActiveTab("Services"); // Go back to home/services tab
    // The ServicesContent component will auto-refresh on mount
  };

  // Handle cancel button in create service
  const handleCreateCancel = () => {
    setActiveTab("Services");
  };

  return (
    <View className="bg-slate-50 flex-1">
      {/**Header - Show only on Services tab */}
      {activeTab === "Services" && (
        <View
          className="bg-white flex-row py-4 px-6 items-center justify-between"
          style={{ paddingTop: insets.top }}
        >
          <Text className="font-bold text-slate-900 text-3xl">Servell</Text>
          <TouchableOpacity className="p-2 bg-slate-100 rounded-full">
            <Bell size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      <View className="flex-1">
        {activeTab === "Services" && <ServicesContent />}

        {activeTab === "Progress" && (
          <View className="flex-1 items-center justify-center">
            <Text className="text-slate-600 text-lg">
              Progress Content Coming Soon...
            </Text>
          </View>
        )}

        {activeTab === "Message" && <ConversationsScreen />}

        {activeTab === "Post" && (
          <CreateService
            onServiceCreated={handleServiceCreated}
            onCancel={handleCreateCancel}
          />
        )}

        {activeTab === "Profile" && <Logout />}
      </View>

      {/* Bottom Navigation - Hide when creating service */}
      {activeTab !== "Post" && (
        <BottomNav currentTab={activeTab} onTabPress={setActiveTab} />
      )}
    </View>
  );
}
