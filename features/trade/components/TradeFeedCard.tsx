import React from "react";
import { StyleSheet, View } from "react-native";

import { SwipeDeck } from "@/features/deck";

import { TRADE_FEED_MOCK_ITEMS } from "../data";
import { TradeFeedCard } from "./TradeFeedCard";

export function TradeFeed() {
  return (
    <View style={styles.feedShell}>
      <View style={styles.stage}>
        <SwipeDeck
          cards={TRADE_FEED_MOCK_ITEMS}
          onCardPress={(_, item) => console.log("open trade details", item.id)}
          renderCard={({ card, index }) => (
            <TradeFeedCard item={card} index={index} total={TRADE_FEED_MOCK_ITEMS.length} />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedShell: {
    flex: 1,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
});