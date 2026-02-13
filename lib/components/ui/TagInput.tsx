import { AntDesign } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface TagInputProps {
  tags: string[];
  currentTag: string;
  onChangeTag: (value: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}

/**
 * Reusable tag chip input.
 * Previously copy-pasted verbatim in both CreateService and EditServiceModal.
 */
export function TagInput({
  tags,
  currentTag,
  onChangeTag,
  onAdd,
  onRemove,
}: TagInputProps) {
  return (
    <View>
      <View className="flex-row items-center mb-2">
        <TextInput
          value={currentTag}
          onChangeText={onChangeTag}
          placeholder="Add a tag..."
          className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
          placeholderTextColor="#94a3b8"
          onSubmitEditing={onAdd}
        />
        <TouchableOpacity
          onPress={onAdd}
          className="ml-2 bg-[#1877F2] rounded-xl px-4 py-3"
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      {tags.length > 0 && (
        <View className="flex-row flex-wrap">
          {tags.map((tag) => (
            <View
              key={tag}
              className="bg-slate-100 rounded-full px-3 py-1 flex-row items-center mr-2 mb-2"
            >
              <Text className="text-slate-700 text-sm mr-1">{tag}</Text>
              <TouchableOpacity onPress={() => onRemove(tag)}>
                <AntDesign name="close" size={12} color="#64748b" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
