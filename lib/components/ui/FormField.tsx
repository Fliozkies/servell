import React from "react";
import { Text, View } from "react-native";

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a form input with a label row.
 * Previously duplicated between create_service.tsx and EditServiceModal.
 */
export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 mb-2">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}
