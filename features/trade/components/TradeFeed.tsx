import React, { useCallback, useState } from "react";
import { type LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";

import { ContinuousSquareStackDeck } from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

import { TRADE_FEED_MOCK_ITEMS } from "../data";
import { TradeFeedCard } from "./TradeFeedCard";

export function TradeFeed() {
  const { palette } = useTheme();
  const [activeLabel, setActiveLabel] = useState(TRADE_FEED_MOCK_ITEMS[0]?.id ?? "—");
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

  return (
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      style={styles.feedShell}
      contentContainerStyle={styles.content}
    >
      <View style={styles.feedIntro}>
        <Text style={[styles.feedKicker, { color: palette.muted }]}>DISCOVER</Text>
        <Text style={[styles.feedTitle, { color: palette.text }]}>Need ↔ Offer feed</Text>
        <Text style={[styles.feedText, { color: palette.muted }]}>
          Browse compact trade cards. Vertical drags can scroll the page; intentional diagonal drags move through the
          square stack.
        </Text>
        <Text style={[styles.feedMeta, { color: palette.muted }]}>Active: {activeLabel}</Text>
      </View>

      <View style={styles.stage} onLayout={handleStageLayout}>
        <ContinuousSquareStackDeck
          cards={TRADE_FEED_MOCK_ITEMS}
          availableWidth={stageBounds.width}
          availableHeight={stageBounds.height}
          minCardSize={254}
          maxCardSize={360}
          renderWindow="all"
          showDebugBadge={false}
          onIndexChange={(_, item) => setActiveLabel(item.id)}
          renderCard={({ card, index, total }) => <TradeFeedCard item={card} index={index} total={total} />}
        />
      </View>

      <Text style={[styles.footerText, { color: palette.muted }]}>
        Back-list cards are mounted with their real Need/Offer content so the stack feels ready before each swipe.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedShell: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 48,
    paddingTop: 22,
    gap: 14,
  },
  feedIntro: {
    paddingHorizontal: 18,
    gap: 5,
  },
  feedKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  feedText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  feedMeta: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stage: {
    height: 430,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: 18,
  },
  footerText: {
    paddingHorizontal: 18,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
});
