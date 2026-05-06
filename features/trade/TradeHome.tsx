import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { TradeFeed, TradeTabs } from "./components";
import { TRADE_TABS, type TradeTabKey } from "./types";

function TradePlaceholder({ tab }: { tab: Exclude<TradeTabKey, "feed"> }) {
  const { palette } = useTheme();
  const tabConfig = TRADE_TABS.find((item) => item.key === tab);

  return (
    <View style={styles.placeholderWrap}>
      <View style={[styles.placeholderCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.placeholderKicker, { color: palette.muted }]}>COMING NEXT</Text>
        <Text style={[styles.placeholderTitle, { color: palette.text }]}>{tabConfig?.label}</Text>
        <Text style={[styles.placeholderText, { color: palette.muted }]}>
          {tabConfig?.description} We keep this tab as a clean placeholder while the Feed card experience is built first.
        </Text>
      </View>
    </View>
  );
}

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

      {activeTab === "feed" ? <TradeFeed /> : <TradePlaceholder tab={activeTab} />}
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
  placeholderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  placeholderCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 10,
  },
  placeholderKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});