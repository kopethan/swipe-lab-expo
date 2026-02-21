import React, { useMemo } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { WalletStack, type WalletCardSpec } from "@/components/wallet-stack";

function Row({
  label,
  value,
  hint,
  isDark,
}: {
  label: string;
  value: string;
  hint?: string;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        },
      ]}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, { color: isDark ? "rgba(255,255,255,0.92)" : "#0b0d0e" }]}>
          {label}
        </Text>
        {!!hint && (
          <Text style={[styles.rowHint, { color: isDark ? "rgba(255,255,255,0.55)" : "#4b5563" }]}>
            {hint}
          </Text>
        )}
      </View>
      <Text
        style={[
          styles.rowValue,
          {
            color: isDark ? "rgba(46,229,255,0.95)" : "#0f766e",
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function WalletStackTemplateScreen() {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";

  const cards: WalletCardSpec[] = useMemo(
    () => [
      {
        key: "prefs",
        title: "Preferences",
        summary: "Language, time zone, formats",
        render: () => (
          <View style={{ gap: 10 }}>
            <Row isDark={isDark} label="Language" value="English" hint="Affects date/time formatting." />
            <Row
              isDark={isDark}
              label="Time zone"
              value="Auto-detect (Europe/Paris)"
              hint="Displayed only in v1 (inputs remain device time zone)."
            />
            <Row isDark={isDark} label="Date format" value="DD/MM/YYYY" hint="How dates are shown." />
            <Row isDark={isDark} label="Time format" value="24-hour" hint="Choose 24h or 12h." />
            <Row isDark={isDark} label="Autosave drafts" value="On" hint="Keeps unfinished text safe on device." />
          </View>
        ),
      },
      {
        key: "notif",
        title: "Notifications",
        summary: "Message alerts and badges",
        render: () => (
          <View style={{ gap: 10 }}>
            <Row
              isDark={isDark}
              label="Message notifications"
              value="On"
              hint="Shows in-app alerts and unread indicators."
            />
          </View>
        ),
      },
      {
        key: "privacy",
        title: "Privacy",
        summary: "Visibility and data controls",
        render: () => (
          <View style={{ gap: 10 }}>
            <Row isDark={isDark} label="Profile visibility" value="Public" hint="Who can see your profile." />
            <Row isDark={isDark} label="Data export" value="Available" hint="Export your account data." />
            <Row isDark={isDark} label="Data deletion" value="Request" hint="Permanently delete your data." />
          </View>
        ),
      },
    ],
    [isDark]
  );

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: isDark ? "#0b0d0e" : "#f4f5f6" },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.h1, { color: isDark ? "#ffffff" : "#0b0d0e" }]}>
          Wallet Stack Template
        </Text>
        <Text style={[styles.p, { color: isDark ? "rgba(255,255,255,0.70)" : "#4b5563" }]}>
          Scroll (wheel/trackpad) or swipe the top card to rotate sections. Loops infinitely.
        </Text>
      </View>

      <View style={styles.deckWrap}>
        <WalletStack cards={cards} cardHeight={520} maxVisible={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  h1: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  p: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  deckWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  row: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  rowLeft: { flex: 1, paddingRight: 10 },
  rowLabel: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  rowHint: {
    marginTop: 4,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 14,
  },
  rowValue: {
    color: "rgba(46,229,255,0.95)",
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 180,
  },
});
