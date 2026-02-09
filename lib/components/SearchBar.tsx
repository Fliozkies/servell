import { AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search services...",
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText("");
  };

  return (
    <View
      className={`flex-row items-center bg-white rounded-2xl px-4 mx-4 mb-3 border ${
        isFocused ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <AntDesign
        name="search"
        size={18}
        color={isFocused ? "#3b82f6" : "#94a3b8"}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className="flex-1 ml-3 text-base text-slate-900"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} className="ml-2">
          <AntDesign name="close-circle" size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
}
