import { CheckCircle2, XCircle } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface AuthSuccessModalProps {
  visible: boolean;
  success: boolean;
  onClose: () => void;
  message?: string;
}

const { width } = Dimensions.get("window");

export const AuthSuccessModal: React.FC<AuthSuccessModalProps> = ({
  visible,
  success,
  onClose,
  message,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    })),
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnims.forEach((anim) => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);
      });

      // Start entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Start confetti animation for success
      if (success) {
        setTimeout(() => {
          confettiAnims.forEach((anim, index) => {
            const randomX = (Math.random() - 0.5) * width;
            const randomRotate = Math.random() * 720 - 360;
            const delay = index * 30;

            Animated.parallel([
              Animated.timing(anim.x, {
                toValue: randomX,
                duration: 1500,
                delay,
                useNativeDriver: true,
              }),
              Animated.timing(anim.y, {
                toValue: 400,
                duration: 1500,
                delay,
                useNativeDriver: true,
              }),
              Animated.timing(anim.rotate, {
                toValue: randomRotate,
                duration: 1500,
                delay,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 1500,
                delay,
                useNativeDriver: true,
              }),
            ]).start();
          });
        }, 200);
      }

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, success, scaleAnim, fadeAnim, confettiAnims, onClose]);

  const defaultMessage = success
    ? "Your email has been confirmed! Welcome to Servell 🎉"
    : "Email confirmation failed. Please try again or contact support.";

  return (
    <Modal visible={visible} transparent animationType="none">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm items-center shadow-2xl"
        >
          {/* Icon with pulse animation */}
          <View
            className={`mb-6 rounded-full p-6 ${
              success ? "bg-green-50" : "bg-red-50"
            }`}
          >
            {success ? (
              <CheckCircle2 size={64} color="#22c55e" strokeWidth={2.5} />
            ) : (
              <XCircle size={64} color="#ef4444" strokeWidth={2.5} />
            )}
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-slate-900 text-center mb-3">
            {success ? "Success! 🎊" : "Oops! 😔"}
          </Text>

          {/* Message */}
          <Text className="text-base text-slate-600 text-center mb-6">
            {message || defaultMessage}
          </Text>

          {/* Action button */}
          <TouchableOpacity
            onPress={onClose}
            className={`w-full rounded-full py-4 ${
              success ? "bg-[#1877F2]" : "bg-slate-700"
            }`}
            activeOpacity={0.8}
          >
            <Text className="text-white text-center font-bold text-base">
              {success ? "Continue" : "Close"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Confetti particles for success */}
        {success &&
          visible &&
          confettiAnims.map((anim, index) => {
            const colors = [
              "#1877F2",
              "#22c55e",
              "#f59e0b",
              "#ec4899",
              "#8b5cf6",
            ];
            const color = colors[index % colors.length];

            return (
              <Animated.View
                key={index}
                style={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  width: 8,
                  height: 8,
                  backgroundColor: color,
                  borderRadius: 4,
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    {
                      rotate: anim.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                  opacity: anim.opacity,
                }}
              />
            );
          })}
      </View>
    </Modal>
  );
};
