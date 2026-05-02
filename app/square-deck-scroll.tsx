import React from "react";
import { Stack } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  MAP_AND_FALLBACK_DEMO_CARDS,
  PHOTO_ONLY_DEMO_CARDS,
  SQUARE_STACK_DEMO_CARDS,
  SquareDeckLabStage,
} from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

export default function SquareDeckScrollScreen() {
  const { palette } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Three Deck Scroll" }} />

      <ScrollView nestedScrollEnabled contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: palette.muted }]}>LAB6 / multi-deck</Text>
          <Text style={[styles.h1, { color: palette.text }]}>Three decks in one scroll view</Text>
          <Text style={[styles.body, { color: palette.muted }]}>This stress test checks whether moving between multiple deck zones still feels like normal vertical page scrolling.</Text>
        </View>

        <SquareDeckLabStage
          cards={PHOTO_ONLY_DEMO_CARDS}
          stageStyle={styles.deckStage}
          title="Photo deck"
          description="Only photo-backed cards. Check blur continuity and vertical scroll handoff."
        />

        <SquareDeckLabStage
          cards={MAP_AND_FALLBACK_DEMO_CARDS}
          stageStyle={styles.deckStage}
          title="Map + fallback deck"
          description="Static-map-like and fallback cards. Check white/black flash behavior and vertical scroll handoff."
        />

        <SquareDeckLabStage
          cards={SQUARE_STACK_DEMO_CARDS}
          stageStyle={styles.deckStage}
          title="Mixed deck"
          description="All media types in one stack. This is closest to the future Places feed test."
          footer="Expected: vertical movement scrolls the page; intentional diagonal movement changes the active card."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === "web" ? 24 : 18,
    paddingBottom: 56,
    gap: 24,
  },
  hero: {
    paddingHorizontal: 18,
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  h1: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  deckStage: {
    height: 500,
  },
});
