import React from "react";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FullBleedBlurCard } from "@/components/prototype/full-bleed-blur-card";

const HERO_IMAGE = {
  uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
};

const CITY_IMAGE = {
  uri: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
};

export default function ImageCardPrototypeScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Image Card", headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.h1}>Image Card Prototype</Text>
          <Text style={styles.sub}>
            Full-bleed image, no visible border, with a softer bottom ramp that starts near the halfway point and fades in without a hard line.
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Horizontal rectangle</Text>
          <FullBleedBlurCard
            source={HERO_IMAGE}
            title="Evening in the Valley"
            subtitle="Prototype A"
            style={styles.horizontalCard}
            blurStartPercent={50}
            blurSlices={26}
            tintStrength={0.86}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Perfect square</Text>
          <FullBleedBlurCard
            source={CITY_IMAGE}
            title="City Walk"
            subtitle="Prototype B"
            style={styles.squareCard}
            blurStartPercent={50}
            blurSlices={26}
            bottomTint="rgba(7,9,12,0.44)"
            tintStrength={0.84}
          />
        </View>

        <View style={styles.notes}>
          <Text style={styles.notesTitle}>What changed in this pass</Text>
          <Text style={styles.note}>• The demo now shows a horizontal rectangle and a true 1:1 square.</Text>
          <Text style={styles.note}>• The visual ramp starts around 1/2 of the card instead of 1/3.</Text>
          <Text style={styles.note}>• The effect fades in progressively, so the start point should feel invisible rather than like a visible line.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0b0c",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 24,
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: 920,
  },
  h1: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 8,
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 760,
  },
  block: {
    width: "100%",
    maxWidth: 920,
    gap: 12,
    alignItems: "center",
  },
  label: {
    width: "100%",
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "700",
  },
  horizontalCard: {
    width: "100%",
    maxWidth: 720,
    aspectRatio: 1.72,
  },
  squareCard: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
  },
  notes: {
    width: "100%",
    maxWidth: 920,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  notesTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  note: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
  },
});
