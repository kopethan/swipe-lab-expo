import React from "react";
import { StyleSheet, View } from "react-native";

type TradeExchangeIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function TradeExchangeIcon({
  size = 18,
  color = "#111111",
  strokeWidth = 2,
}: TradeExchangeIconProps) {
  const lineThickness = Math.max(1.5, strokeWidth);
  const horizontalWidth = size * 0.7;
  const diagonalWidth = size * 0.26;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={[
          styles.horizontal,
          {
            top: size * 0.3,
            left: size * 0.15,
            width: horizontalWidth,
            height: lineThickness,
            borderRadius: 999,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.horizontal,
          {
            top: size * 0.56,
            left: size * 0.15,
            width: horizontalWidth,
            height: lineThickness,
            borderRadius: 999,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.diagonal,
          {
            top: size * 0.18,
            left: size * 0.56,
            width: diagonalWidth,
            height: lineThickness,
            borderRadius: 999,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.diagonal,
          {
            top: size * 0.63,
            left: size * 0.14,
            width: diagonalWidth,
            height: lineThickness,
            borderRadius: 999,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  horizontal: {
    position: "absolute",
  },
  diagonal: {
    position: "absolute",
  },
});
