import { supabase } from "@/lib/api/supabase";
import { router } from "expo-router";
import {
  BarChart3,
  Edit3,
  List,
  Lock,
  LogOut,
  MoreVertical,
  Settings,
  Star,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

async function handleLogout() {
  await supabase.auth.signOut();
  router.replace("../../(auth)/auth");
}

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([
    {
      id: 1,
      title: "The Art of Minimalist UI",
      rating: 4.8,
      comments: 24,
      reviews: 12,
      image: "https://picsum.photos/400/300",
    },
    {
      id: 2,
      title: "React Native in 2026",
      rating: 4.5,
      comments: 18,
      reviews: 9,
      image: "https://picsum.photos/401/300",
    },
  ]);

  // States
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [isModifyVisible, setIsModifyVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [postToEdit, setPostToEdit] = useState<any>(null);

  // --- Handlers ---
  const openActionMenu = (post: any) => {
    setPostToEdit(post);
    setIsActionSheetVisible(true);
  };

  const handleDelete = () => {
    Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setPosts(posts.filter((p) => p.id !== postToEdit.id));
          setIsActionSheetVisible(false);
        },
      },
    ]);
  };

  const saveModifications = (updatedPost: any) => {
    setPosts(posts.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setIsModifyVisible(false);
    setIsActionSheetVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-900">Profile</Text>
        <TouchableOpacity
          onPress={() => setIsSettingsVisible(true)}
          className="p-2 bg-slate-50 rounded-full"
        >
          <Settings size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Profile Info */}
        <View className="px-6 py-8 flex-row items-center">
          <Image
            source={{ uri: "https://i.pravatar.cc/150?u=9" }}
            className="w-20 h-20 rounded-2xl bg-slate-100"
          />
          <View className="ml-5 flex-1">
            <Text className="text-2xl font-bold text-slate-900">
              Alex Rivera
            </Text>
            <Text className="text-slate-500 text-sm">Product Designer</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-6 mb-4 border-b border-slate-100">
          <TabButton
            active={activeTab === "posts"}
            onPress={() => setActiveTab("posts")}
            label="Posts"
            Icon={List}
          />
          <TabButton
            active={activeTab === "analytics"}
            onPress={() => setActiveTab("analytics")}
            label="Insights"
            Icon={BarChart3}
          />
          <TabButton
            active={activeTab === "income"}
            onPress={() => setActiveTab("income")}
            label="Earnings"
            Icon={Wallet}
          />
        </View>

        {/* Content */}
        <View className="px-6 pb-10">
          {activeTab === "posts" &&
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => setSelectedPost(post)}
                onMorePress={() => openActionMenu(post)}
              />
            ))}
          {activeTab !== "posts" && (
            <View className="py-20 items-center">
              <Text className="text-slate-400">No data available yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- Action Sheet (Modify/Delete) --- */}
      <Modal visible={isActionSheetVisible} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setIsActionSheetVisible(false)}
        >
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-6" />
            <MenuOption
              icon={<Edit3 size={20} color="black" />}
              label="Modify Post"
              onPress={() => setIsModifyVisible(true)}
            />
            <MenuOption
              icon={<Trash2 size={20} color="#ef4444" />}
              label="Delete Post"
              destructive
              onPress={handleDelete}
            />
            <TouchableOpacity
              onPress={() => setIsActionSheetVisible(false)}
              className="mt-4 bg-slate-100 py-4 rounded-2xl items-center border-t border-white"
            >
              <Text className="font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* --- Settings Modal --- */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />

      {/* --- Modify Modal --- */}
      <ModifyPostModal
        visible={isModifyVisible}
        post={postToEdit}
        onClose={() => setIsModifyVisible(false)}
        onSave={saveModifications}
      />

      {/* --- Detail Modal --- */}
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </SafeAreaView>
  );
};

// --- Sub-Components ---

const PostCard = ({ post, onPress, onMorePress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white border border-slate-100 p-4 rounded-2xl mb-4 flex-row items-center justify-between shadow-sm"
  >
    <View className="flex-1 pr-4">
      <Text className="text-lg font-semibold text-slate-900 mb-1">
        {post.title}
      </Text>
      <View className="flex-row items-center">
        <Star size={14} color="#f59e0b" fill="#f59e0b" />
        <Text className="ml-1 text-slate-500 text-sm">{post.rating}</Text>
      </View>
    </View>
    <TouchableOpacity
      onPress={onMorePress}
      className="p-3 bg-slate-50 rounded-xl"
    >
      <MoreVertical size={18} color="#64748b" />
    </TouchableOpacity>
  </TouchableOpacity>
);

const ModifyPostModal = ({ visible, post, onClose, onSave }: any) => {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setImage(post.image);
    }
  }, [post, visible]);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-white p-6">
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-2xl font-bold">Edit Post</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color="black" />
          </TouchableOpacity>
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4"
        />
        <TextInput
          value={image}
          onChangeText={setImage}
          placeholder="Image URL"
          className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8"
        />
        <TouchableOpacity
          onPress={() => onSave({ ...post, title, image })}
          className="bg-black py-5 rounded-2xl items-center border-t border-slate-700 shadow-md"
        >
          <Text className="text-white font-bold text-lg">Save Changes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const SettingsModal = ({ visible, onClose }: any) => (
  <Modal visible={visible} animationType="fade">
    <SafeAreaView className="flex-1 bg-white p-6">
      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-2xl font-bold">Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={28} color="black" />
        </TouchableOpacity>
      </View>
      <MenuOption
        icon={<Lock size={20} color="black" />}
        label="Change Password"
        onPress={() => {}}
      />
      <MenuOption
        icon={<Users size={20} color="black" />}
        label="Switch Account"
        onPress={() => {}}
      />
      <View className="h-[1px] bg-slate-100 my-4" />
      <MenuOption
        icon={<LogOut size={20} color="#ef4444" />}
        label="Logout"
        destructive
        onPress={handleLogout}
      />
    </SafeAreaView>
  </Modal>
);

// ... (Keep existing imports and ProfilePage logic)

const PostDetailModal = ({ post, visible, onClose }: any) => {
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  // State-managed comments for interactivity
  const [comments, setPostsComments] = useState([
    {
      id: 1,
      user: "Sarah J.",
      text: "The spacing on this is perfect. How did you handle the scaling?",
      time: "2h",
      likes: 12,
      isLiked: false,
    },
    {
      id: 2,
      user: "Marcus.dev",
      text: "I love the inner-glow on the buttons! Very premium feel.",
      time: "5h",
      likes: 8,
      isLiked: false,
    },
  ]);

  if (!post) return null;

  const handleSend = () => {
    if (replyText.trim() === "") return;

    const prefix = replyTarget ? `@${replyTarget} ` : "";
    const newComment = {
      id: Date.now(),
      user: "You (Alex)",
      text: prefix + replyText,
      time: "Just now",
      likes: 0,
      isLiked: false,
    };

    setPostsComments([newComment, ...comments]);
    setReplyText("");
    setReplyTarget(null); // Reset target after sending
  };

  const toggleLike = (id: number) => {
    setPostsComments(
      comments.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            isLiked: !c.isLiked,
            likes: c.isLiked ? c.likes - 1 : c.likes + 1,
          };
        }
        return c;
      }),
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-50">
          <TouchableOpacity
            onPress={() => {
              onClose();
              setReplyTarget(null);
            }}
            className="p-2 -ml-2"
          >
            <X size={24} color="black" />
          </TouchableOpacity>
          <Text className="font-bold text-lg text-slate-900">Post Review</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Post Content Header */}
          <View className="p-6">
            <Image
              source={{ uri: post.image }}
              className="w-full h-80 rounded-[32px] bg-slate-100 mb-6"
            />
            <Text className="text-2xl font-bold text-slate-900 leading-tight">
              {post.title}
            </Text>
          </View>

          {/* Comments Section */}
          <View className="px-6 pb-32">
            <Text className="text-lg font-bold text-slate-900 mb-6">
              Discussion
            </Text>

            {comments.map((comment) => (
              <View key={comment.id} className="mb-8 flex-row">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                  <Text className="text-slate-400 font-bold">
                    {comment.user[0]}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-slate-900">
                      {comment.user}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {comment.time}
                    </Text>
                  </View>
                  <Text className="text-slate-600 mt-1 text-[15px] leading-5">
                    {comment.text}
                  </Text>

                  <View className="flex-row items-center mt-3 gap-x-6">
                    <TouchableOpacity
                      onPress={() => toggleLike(comment.id)}
                      className="flex-row items-center"
                    >
                      <Star
                        size={14}
                        color={comment.isLiked ? "#f59e0b" : "#94a3b8"}
                        fill={comment.isLiked ? "#f59e0b" : "transparent"}
                      />
                      <Text
                        className={`ml-1 text-xs font-bold ${comment.isLiked ? "text-slate-900" : "text-slate-400"}`}
                      >
                        {comment.likes}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setReplyTarget(comment.user)}
                    >
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-tight">
                        Reply
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Floating Functional Input */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8">
          {replyTarget && (
            <View className="flex-row justify-between items-center bg-slate-50 px-4 py-2 mb-2 rounded-t-xl border-x border-t border-slate-100">
              <Text className="text-xs text-slate-500">
                Replying to{" "}
                <Text className="font-bold text-slate-900">@{replyTarget}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)}>
                <X size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center bg-slate-50 rounded-full px-5 py-3 border border-slate-100">
            <TextInput
              placeholder={
                replyTarget ? `Reply to ${replyTarget}...` : "Add a comment..."
              }
              className="flex-1 text-slate-900 py-1"
              value={replyText}
              onChangeText={setReplyText}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!replyText.trim()}
              className={`ml-2 p-2 rounded-full ${replyText.trim() ? "bg-black" : "bg-slate-200"}`}
            >
              <Text className="text-white font-bold text-xs px-2">Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const TabButton = ({ active, onPress, label, Icon }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center py-4 mr-6 border-b-2 ${active ? "border-black" : "border-transparent"}`}
  >
    <Icon size={18} color={active ? "black" : "#94a3b8"} />
    <Text
      className={`ml-2 font-semibold ${active ? "text-black" : "text-slate-400"}`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const MenuOption = ({ icon, label, onPress, destructive }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center py-4 px-2 active:bg-slate-50 rounded-xl"
  >
    {icon}
    <Text
      className={`ml-4 text-lg ${destructive ? "text-red-500 font-bold" : "text-slate-900 font-medium"}`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default ProfilePage;
