import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { TradeFeed, TradeNeeds, TradeOffers, TradeTabs } from "./components";
import type { TradeTabKey } from "./types";

export function TradeHome() {
  const { palette } = useTheme();
  const [activeTab, setActiveTab] = useState<TradeTabKey>("feed");

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.headerShell, { borderBottomColor: palette.border }]}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>TRADE LAB</Text>
        <Text style={[styles.screenTitle, { color: palette.text }]}>Trade</Text>
        <Text style={[styles.screenSubtitle, { color: palette.muted }]} numberOfLines={2}>
          One isolated trade menu with Feed, Needs, and Offers inside it.
        </Text>
        <TradeTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === "feed" ? <TradeFeed /> : activeTab === "needs" ? <TradeNeeds /> : <TradeOffers />}
    </View>
  );
}

export default TradeHome;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerShell: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 16,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
