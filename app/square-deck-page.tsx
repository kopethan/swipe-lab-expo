import React from "react";
import { Stack } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { SQUARE_STACK_DEMO_CARDS, SquareDeckLabStage } from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

const CHECKS = [
  "Vertical page drags above and below the deck should scroll the page.",
  "A mostly vertical drag that starts on the deck should not accidentally commit a card.",
  "A deliberate up-left or down-right diagonal drag should still commit the deck.",
  "The deck should not clip while it sits inside normal page content.",
];

export default function SquareDeckPageScreen() {
  const { palette } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Square Deck Page Scroll" }} />

      <ScrollView
        nestedScrollEnabled
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: palette.muted }]}>LAB6 / page-scroll</Text>
          <Text style={[styles.h1, { color: palette.text }]}>Deck inside a vertically scrolling page</Text>
          <Text style={[styles.body, { color: palette.muted }]}>This route simulates the Places feed pressure: normal page content around a diagonal deck.</Text>
        </View>

        <View style={[styles.noteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {CHECKS.map((check) => (
            <Text key={check} style={[styles.check, { color: palette.text }]}>• {check}</Text>
          ))}
        </View>

        <SquareDeckLabStage
          cards={SQUARE_STACK_DEMO_CARDS}
          stageStyle={styles.deckStage}
          title="Scrollable page deck"
          description="Try slow vertical scrolls, fast flicks, then intentional diagonal swipes."
          footer="Gesture guard: the deck now requires a horizontal component before the pan activates, so vertical page scroll has a chance to win."
        />

        {Array.from({ length: 6 }, (_, index) => (
          <View key={`section-${index}`} style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Feed content block {index + 1}</Text>
            <Text style={[styles.body, { color: palette.muted }]}>This filler content forces real vertical scrolling below the deck. Keep testing whether the page scroll feels natural after swiping cards.</Text>
          </View>
        ))}
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
    paddingBottom: 52,
    gap: 18,
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
  noteCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  check: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "650",
  },
  deckStage: {
    height: 520,
  },
  section: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    minHeight: 112,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
});
