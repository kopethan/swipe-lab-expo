import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function OnboardingProgress({
  currentIndex,
  total,
  textColor,
  mutedColor,
  align = "center",
  onSelect,
}: {
  currentIndex: number;
  total: number;
  textColor: string;
  mutedColor: string;
  align?: "center" | "start";
  onSelect?: (index: number) => void;
}) {
  return (
    <View style={[styles.wrap, align === "start" ? styles.wrapStart : null]} accessibilityRole="text">
      <View
        style={[styles.dots, align === "start" ? styles.dotsStart : null]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: total }).map((_, index) => {
          const isActive = index === currentIndex;
          const dot = (
            <View
              style={[
                styles.dot,
                {
                  width: isActive ? 22 : 7,
                  backgroundColor: isActive ? textColor : mutedColor,
                  opacity: isActive ? 0.92 : 0.34,
                },
              ]}
            />
          );

          if (onSelect) {
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Go to onboarding slide ${index + 1} of ${total}`}
                hitSlop={8}
                onPress={() => onSelect(index)}
                style={styles.dotTapTarget}
              >
                {dot}
              </Pressable>
            );
          }

          return (
            <View key={index} style={styles.dotTapTarget}>
              {dot}
            </View>
          );
        })}
      </View>
      <Text style={[styles.count, { color: mutedColor }]}>
        {currentIndex + 1} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
  },
  wrapStart: {
    alignItems: "flex-start",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 12,
  },
  dotsStart: {
    justifyContent: "flex-start",
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
  dotTapTarget: {
    minWidth: 22,
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
