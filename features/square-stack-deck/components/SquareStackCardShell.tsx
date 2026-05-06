import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

type Props = {
  size: number;
  children: React.ReactNode;
};

export function SquareStackCardShell({ size, children }: Props) {
  const { palette } = useTheme();
  const radius = Math.max(24, Math.round(size * 0.075));
  const outlineColor = palette.mode === "light" ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.68)";
  const innerOutlineOpacity = palette.mode === "light" ? 0.12 : 0.24;

  return (
    <View
      style={[
        styles.card,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: outlineColor,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.innerFrame,
          {
            borderRadius: Math.max(0, radius - 2),
            borderColor: outlineColor,
            opacity: innerOutlineOpacity,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ willChange: "transform" } as any) : null),
  },
  innerFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
});
