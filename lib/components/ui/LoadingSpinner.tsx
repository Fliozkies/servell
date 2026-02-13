import { ActivityIndicator, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";

interface LoadingSpinnerProps {
  /** Optional label shown beneath the spinner. */
  label?: string;
  /** Full-screen variant (flex-1 + justify-center). Defaults to false. */
  fullScreen?: boolean;
}

/**
 * Reusable loading indicator.
 * Replaces ad-hoc <ActivityIndicator> + optional <Text> combos across screens.
 */
export function LoadingSpinner({
  label,
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <View
      className={
        fullScreen
          ? "flex-1 items-center justify-center bg-slate-50"
          : "py-16 items-center"
      }
    >
      <ActivityIndicator size="large" color={COLORS.primary} />
      {label ? (
        <Text className="mt-4 text-slate-600">{label}</Text>
      ) : null}
    </View>
  );
}
