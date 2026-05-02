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

  return (
    <View
      style={[
        styles.card,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: palette.mode === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
          backgroundColor: palette.surface,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === "web" ? ({ willChange: "transform" } as any) : null),
  },
});
