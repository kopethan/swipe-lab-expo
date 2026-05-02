import React from "react";
import { Stack } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

import { SQUARE_STACK_DEMO_CARDS, SquareDeckLabStage } from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

export default function SquareDeckScreen() {
  const { palette } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Square Deck Lab" }} />

      <View style={styles.header}>
        <Text style={[styles.h1, { color: palette.text }]}>Place card stack lab</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>HelloWhen-like fake place cards using the clean diagonal square-deck model.</Text>
      </View>

      <SquareDeckLabStage
        cards={SQUARE_STACK_DEMO_CARDS}
        containerStyle={styles.deckWrap}
        stageStyle={styles.stage}
        footer="LAB6 baseline: isolated deck route. Compare this against the page-scroll and multi-deck routes."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "web" ? 24 : 18,
    paddingHorizontal: 18,
    gap: 4,
  },
  h1: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
  },
  deckWrap: {
    flex: 1,
  },
  stage: {
    flex: 1,
  },
});
