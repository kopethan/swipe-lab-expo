import React, { useCallback, useMemo, useState } from "react";
import { Stack } from "expo-router";
import { type LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";

import {
  ContinuousSquareStackDeck,
  HelloWhenPlaceCardDemo,
  type HelloWhenPlaceDemoCard,
  type SquareStackDeckCard,
} from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

type DemoSquareCard = SquareStackDeckCard & HelloWhenPlaceDemoCard;

export default function SquareDeckScreen() {
  const { palette } = useTheme();
  const [activeLabel, setActiveLabel] = useState("sq01");
  const [stageBounds, setStageBounds] = useState({ width: 0, height: 0 });

  const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setStageBounds((current) => {
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      if (Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const cards = useMemo<DemoSquareCard[]>(
    () => [
      {
        id: "sq01",
        title: "Rooftop sunset walk",
        area: "Paris · 11th arrondissement",
        descriptor: "Golden-hour terrace, short stairs, open sky, and a calm route back toward the canal.",
        subtitle: "Paris 11e, near Canal Saint-Martin, rooftop access, open sky, and an easy return route.",
        primaryContext: "Paris",
        contextBadgeLabel: "sunset",
        modeLabel: "offline",
        mediaKind: "photo",
        imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "12 min walk",
        moodLabel: "quiet",
        tags: ["sunset", "walk", "view"],
        accent: "#ff715b",
      },
      {
        id: "sq02",
        title: "Hidden garden coffee",
        area: "Lyon · Croix-Rousse",
        descriptor: "Small courtyard tables with plants, soft shade, and a good reset stop between plans.",
        subtitle: "Croix-Rousse courtyard tables, plants, soft shade, and a calm coffee reset.",
        primaryContext: "Lyon",
        contextBadgeLabel: "coffee",
        modeLabel: "offline",
        mediaKind: "photo",
        imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "650 m",
        moodLabel: "slow",
        tags: ["coffee", "garden", "nearby"],
        accent: "#6bbf8a",
      },
      {
        id: "sq03",
        title: "Late-night ramen corner",
        area: "Alfortville, Créteil, Val-de-Marne, Île-de-France, France métropolitaine",
        descriptor: "A compact food stop near the station, useful when the plan runs later than expected.",
        subtitle: "Alfortville, Créteil, Val-de-Marne, Île-de-France, France métropolitaine, 94140, France",
        primaryContext: "94140",
        contextBadgeLabel: "France",
        modeLabel: "offline",
        mediaKind: "static_map",
        imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "open late",
        moodLabel: "busy",
        tags: ["food", "night", "map"],
        accent: "#ffbd4a",
      },
      {
        id: "sq04",
        title: "Canal-side book market",
        area: "Amsterdam · Centrum",
        descriptor: "Outdoor stalls, water reflections, and a good low-pressure browse before dinner.",
        subtitle: "Canal edge, book stalls, calm browsing, and an easy stop before dinner.",
        primaryContext: "Amsterdam",
        contextBadgeLabel: "market",
        modeLabel: "offline",
        mediaKind: "photo",
        imageUrl: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "2.1 km",
        moodLabel: "browse",
        tags: ["market", "books", "canal"],
        accent: "#6aa8ff",
      },
      {
        id: "sq05",
        title: "Tiny gallery opening",
        area: "Berlin · Mitte",
        descriptor: "A small indoor place with predictable lighting, useful as a weather-safe card type.",
        subtitle: "Berlin Mitte, indoor fallback-friendly stop with predictable light and calm pacing.",
        primaryContext: "Berlin",
        contextBadgeLabel: "indoor",
        modeLabel: "offline",
        mediaKind: "fallback",
        distanceLabel: "indoor",
        moodLabel: "art",
        tags: ["gallery", "backup", "calm"],
        accent: "#b48cff",
      },
      {
        id: "sq06",
        title: "Morning bakery queue",
        area: "Lisbon · Alfama",
        descriptor: "A simple early stop with warm light, quick service, and nearby benches for a pause.",
        subtitle: "Alfama bakery line, warm light, quick service, and benches nearby for a pause.",
        primaryContext: "Lisbon",
        contextBadgeLabel: "bakery",
        modeLabel: "offline",
        mediaKind: "photo",
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "8 min walk",
        moodLabel: "morning",
        tags: ["bakery", "breakfast", "easy"],
        accent: "#f3a15f",
      },
      {
        id: "sq07",
        title: "Old town photo loop",
        area: "Seoul · Ikseon-dong",
        descriptor: "A short loop of narrow streets, textures, small shops, and easy alternate exits.",
        subtitle: "Ikseon-dong side streets, texture-heavy corners, and a short map-guided loop.",
        primaryContext: "Seoul",
        contextBadgeLabel: "photo",
        modeLabel: "offline",
        mediaKind: "static_map",
        imageUrl: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "loop",
        moodLabel: "photo",
        tags: ["streets", "map", "loop"],
        accent: "#44c7c1",
      },
      {
        id: "sq08",
        title: "Quiet jazz basement",
        area: "New York · West Village",
        descriptor: "Dim room, small tables, later timing, and a card that needs readable lower text.",
        subtitle: "West Village basement, dim room, small tables, and reliable late-evening timing.",
        primaryContext: "New York",
        contextBadgeLabel: "music",
        modeLabel: "offline",
        mediaKind: "photo",
        imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=82",
        distanceLabel: "after 9 PM",
        moodLabel: "music",
        tags: ["jazz", "night", "indoors"],
        accent: "#d76083",
      },
      {
        id: "sq09",
        title: "Sunday park picnic",
        area: "Montreal · Plateau",
        descriptor: "Fallback-friendly open area with simple text, no hard dependency on a perfect photo.",
        subtitle: "Plateau open area, easy fallback card, and simple readable outdoor text treatment.",
        primaryContext: "Montreal",
        contextBadgeLabel: "weekend",
        modeLabel: "offline",
        mediaKind: "fallback",
        distanceLabel: "weekend",
        moodLabel: "open air",
        tags: ["park", "picnic", "fallback"],
        accent: "#7bc96f",
      },
    ],
    []
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Square Deck Lab" }} />

      <View style={styles.header}>
        <Text style={[styles.h1, { color: palette.text }]}>Place card stack lab</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>HelloWhen-like fake place cards using the clean diagonal square-deck model.</Text>
        <Text style={[styles.meta, { color: palette.muted }]}>Active: {activeLabel}</Text>
      </View>

      <View style={styles.stage} onLayout={handleStageLayout}>
        <ContinuousSquareStackDeck
          cards={cards}
          availableWidth={stageBounds.width}
          availableHeight={stageBounds.height}
          onIndexChange={(_, card) => setActiveLabel(card.id)}
          renderCard={({ card, index, total }) => <HelloWhenPlaceCardDemo card={card} index={index} total={total} />}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: palette.muted }]}>LAB5b: blur now covers the full text zone and the text overlay matches the main HelloWhen PlaceCard layout more closely.</Text>
      </View>
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
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: 18,
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
  },
});

