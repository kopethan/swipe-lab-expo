import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { TradeFeed, TradeNeeds, TradeOffers, TradeTabs } from "./components";
import type { TradeTabKey } from "./types";

export function TradeHome() {
  const { mode, palette, toggleMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TradeTabKey>("feed");

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.headerShell, { borderBottomColor: palette.border }]}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>TRADE LAB</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: palette.text }]}>Trade</Text>
          <Pressable
            onPress={toggleMode}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
            style={({ pressed }) => [
              styles.themeToggle,
              { borderColor: palette.border, backgroundColor: palette.surface },
              pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={[styles.themeToggleText, { color: palette.text }]}>{mode === "dark" ? "Light" : "Dark"}</Text>
          </Pressable>
        </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  screenTitle: {
    flex: 1,
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
  themeToggle: {
    minWidth: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
