import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Stack } from "expo-router";

import {
  SettingsWalletStack,
  type SettingsDeckCardSpec,
  type SettingsWalletStackHandle,
} from "@/components/settings-wallet-stack";

const ACCENT = "#2CE5FF"; // teal for now
// Move the whole deck up a bit relative to the side rails ("navigator").
// Tune this visually if needed.
const DECK_Y_OFFSET = -46;


const SECTIONS = [
  "GENERAL",
  "NOTIFICATION",
  "IDENTITY",
  "ACCOUNTS",
  "PASSWORD",
  "SUPPORT",
  "FEEDBACK",
] as const;

function Rail({
  side,
  activeIndex,
  onPick,
}: {
  side: "left" | "right";
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  return (
    <View style={[styles.rail, side === "left" ? styles.railLeft : styles.railRight]}>
      {SECTIONS.map((label, idx) => {
        const isActive = idx === activeIndex;
        return (
          <Pressable
            key={`${side}-${label}`}
            onPress={() => onPick(idx)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.railItem,
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text
              style={[
                styles.railText,
                {
                  color: isActive ? ACCENT : "rgba(255,255,255,0.62)",
                  fontWeight: isActive ? "900" : "700",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function DeckSettingsScreen() {
  const { width } = useWindowDimensions();
  const railsHidden = width < 920;

  const deckRef = useRef<SettingsWalletStackHandle | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Web: allow wheel/trackpad to rotate the deck from ANYWHERE on screen.
  // This is intentional: no nested scroll in cards for v1.
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deckRef.current?.handleGlobalWheel(e);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const cards: SettingsDeckCardSpec[] = useMemo(
    () => [
      {
        key: "general",
        title: "General",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Language" value="English" />
            <Row label="Time zone" value="Auto" />
            <Row label="Date format" value="DD/MM/YYYY" />
            <Row label="Time format" value="24-hour" />
          </View>
        ),
      },
      {
        key: "notification",
        title: "Notification",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Message notifications" value="On" />
            <Text style={styles.comingSoon}>More settings options are coming soon…</Text>
          </View>
        ),
      },
      {
        key: "identity",
        title: "Identity",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Display name" value="Kopy" />
            <Row label="Username" value="@kopy" />
            <Row label="Profile" value="Public" />
          </View>
        ),
      },
      {
        key: "accounts",
        title: "Accounts",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Google" value="Connected" />
            <Row label="Apple" value="Not connected" />
            <Row label="Export" value="Available" />
          </View>
        ),
      },
      {
        key: "password",
        title: "Password",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Password" value="••••••••" />
            <Row label="Two‑factor auth" value="Off" />
            <Row label="Active sessions" value="2" />
          </View>
        ),
      },
      {
        key: "support",
        title: "Support",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Help Center" value="Available" />
            <Row label="Contact" value="Email" />
            <Row label="Status" value="All systems" />
          </View>
        ),
      },
      {
        key: "feedback",
        title: "Feedback",
        detailsEnabled: false,
        render: () => (
          <View style={{ gap: 10 }}>
            <Row label="Suggest a feature" value="Open" />
            <Row label="Report a bug" value="Open" />
            <Text style={styles.comingSoon}>More feedback options are coming soon…</Text>
          </View>
        ),
      },
    ],
    []
  );

  const onPick = (index: number) => {
    deckRef.current?.goToIndex(index);
  };

  return (
    <View style={styles.screen}>
      {/* Removes the white header bar + route title */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.layoutRow}>
        {!railsHidden ? (
          <Rail side="left" activeIndex={activeIndex} onPick={onPick} />
        ) : (
          <View style={{ width: 0 }} />
        )}

        <View style={[styles.center, { transform: [{ translateY: DECK_Y_OFFSET }] }]}>
          <SettingsWalletStack
            ref={deckRef}
            cards={cards}
            // Bigger cards + stronger presence in the center.
            cardHeight={560}
            cardWidthMax={940}
            cardWidthRatio={0.985}
            // Slight upward nudge (often looks more centered because peeks extend above).
            centerBiasY={-28}
            maxVisible={5}
            accent={ACCENT}
            onActiveIndexChange={setActiveIndex}
          />
        </View>

        {!railsHidden ? (
          <Rail side="right" activeIndex={activeIndex} onPick={onPick} />
        ) : (
          <View style={{ width: 0 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0d0e",
  },
  layoutRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  rail: {
    width: 140,
    justifyContent: "center",
    gap: 8,
  },
  railLeft: {
    alignItems: "flex-start",
  },
  railRight: {
    alignItems: "flex-end",
  },
  railItem: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  railText: {
    fontSize: 11,
    letterSpacing: 1.1,
  },
  row: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    paddingRight: 10,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  rowValue: {
    color: "rgba(46,229,255,0.95)",
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 200,
  },
  comingSoon: {
    marginTop: 4,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 14,
  },
});
