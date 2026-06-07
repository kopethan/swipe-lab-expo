import React from "react";
import { Stack } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { MIXED_MEDIA_DEMO_CARDS, SquareDeckLabStage } from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

const MEDIA_NOTES = [
  "Photo cards should show the Image Card blur behavior without a top shade box.",
  "Static-map-like cards should stay readable without becoming a pale rectangle.",
  "Fallback cards should look intentional when there is no remote media source.",
  "Remote image failures should fall back cleanly and should not feed failed sources into blur slices.",
];

export default function SquareDeckMixedScreen() {
  const { palette } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Mixed Media Deck" }} />

      <ScrollView nestedScrollEnabled contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: palette.muted }]}>LAB6 / media simulation</Text>
          <Text style={[styles.h1, { color: palette.text }]}>Photo, map, and fallback cards</Text>
          <Text style={[styles.body, { color: palette.muted }]}>Use this route as the media regression screen while tuning deck gestures and theme mode later.</Text>
        </View>

        <SquareDeckLabStage
          cards={MIXED_MEDIA_DEMO_CARDS}
          stageStyle={styles.deckStage}
          title="Mixed media deck"
          description="Swipe through every card type, then vertically scroll the notes below."
        />

        <View style={[styles.noteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {MEDIA_NOTES.map((note) => (
            <Text key={note} style={[styles.note, { color: palette.text }]}>• {note}</Text>
          ))}
        </View>
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
  deckStage: {
    height: 520,
  },
  noteCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});
