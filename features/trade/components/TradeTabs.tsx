import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { TRADE_TABS, type TradeTabKey } from "../types";

type TradeTabsProps = {
  activeTab: TradeTabKey;
  onChange: (tab: TradeTabKey) => void;
};

export function TradeTabs({ activeTab, onChange }: TradeTabsProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.tabs, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      {TRADE_TABS.map((tab) => {
        const active = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tab,
              active ? { backgroundColor: palette.surface, borderColor: palette.border } : { borderColor: "transparent" },
              pressed ? { opacity: 0.82 } : null,
            ]}
          >
            <Text style={[styles.tabText, { color: active ? palette.text : palette.muted }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
