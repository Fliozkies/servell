// lib/components/ServellLogo.tsx
import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle, Polyline, Ellipse } from "react-native-svg";

interface ServellLogoProps {
  size?: number;
  showWordmark?: boolean;
  color?: string;
}

export default function ServellLogo({
  size = 80,
  showWordmark = true,
  color = "#1877F2",
}: ServellLogoProps) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        {/* Drop shadow */}
        <Ellipse cx="256" cy="422" rx="52" ry="14" fill={color} opacity={0.13} />

        {/* Pin body */}
        <Path
          d="M256 80 C196 80 148 128 148 188 C148 262 256 432 256 432 C256 432 364 262 364 188 C364 128 316 80 256 80 Z"
          fill={color}
        />

        {/* Inner white circle */}
        <Circle cx="256" cy="182" r="62" fill="white" />

        {/* Checkmark */}
        <Polyline
          points="226,182 247,204 288,156"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {showWordmark && (
        <Text
          style={{
            fontSize: size * 0.28,
            fontWeight: "500",
            color: color,
            marginTop: size * 0.06,
            letterSpacing: -0.5,
          }}
        >
          Servell
        </Text>
      )}
    </View>
  );
}
