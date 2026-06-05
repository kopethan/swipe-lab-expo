import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export function OnboardingActions({
  canGoBack,
  isLastSlide,
  onBack,
  onNext,
  onSkip,
  showSkipBottom = true,
  textColor,
  mutedColor,
  surfaceColor,
  borderColor,
}: {
  canGoBack: boolean;
  isLastSlide: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  showSkipBottom?: boolean;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  borderColor: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to the previous onboarding slide"
          disabled={!canGoBack}
          onPress={onBack}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor, opacity: canGoBack ? 1 : 0.36 },
            pressed && canGoBack ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.secondaryText, { color: canGoBack ? textColor : mutedColor }]}>Back</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? "Finish onboarding guide" : "Go to the next onboarding slide"}
          onPress={onNext}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: textColor },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.primaryText, { color: surfaceColor }]}>
            {isLastSlide ? "Get started" : "Next"}
          </Text>
        </Pressable>
      </View>

      {showSkipBottom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding guide"
          onPress={onSkip}
          style={({ pressed }) => [styles.skipBottom, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.skipBottomText, { color: mutedColor }]}>Skip guide</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  primaryButton: {
    flex: 1.45,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "900",
  },
  skipBottom: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  skipBottomText: {
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});
