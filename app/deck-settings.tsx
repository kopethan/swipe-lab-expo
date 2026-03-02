import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack } from "expo-router";

import {
  SettingsWalletStack,
  type SettingsDeckCardSpec,
  type SettingsWalletStackHandle,
} from "@/features/settings";
import { DeckProbeCard } from "@/components/deck-probe-card";
import { DebugPanel } from "@/components/debug-panel";
import { useTheme } from "@/providers/ThemeProvider";
import { makeParagraphs, makeRows, makeSubtitle } from "@/lib/fakeContent";

// Layout constants (kept close to main project)
const SIDE_PAD = 18;
const RAIL_W = 140;
const LANE_GAP = 22;

const SECTIONS = [
  "GENERAL",
  "NOTIFICATION",
  "IDENTITY",
  "ACCOUNTS",
  "PASSWORD",
  "SUPPORT",
  "FEEDBACK",
] as const;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function Rail({
  side,
  activeIndex,
  onPick,
}: {
  side: "left" | "right";
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  const { palette } = useTheme();

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
              pressed ? { opacity: 0.8, transform: [{ scale: 0.99 }] } : null,
            ]}
          >
            <Text
              style={[
                styles.railText,
                {
                  color: isActive ? palette.text : palette.muted,
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
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: palette.border,
          backgroundColor: palette.surfaceAlt,
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: palette.muted }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SectionBody({ sectionKey }: { sectionKey: string }) {
  const { palette } = useTheme();
  const seed = `settings:${sectionKey.toLowerCase()}`;

  const rows = useMemo(() => makeRows(seed, 7), [seed]);
  const subtitle = useMemo(() => makeSubtitle(seed), [seed]);
  const paragraphs = useMemo(() => makeParagraphs(seed, 1), [seed]);

  return (
    <View style={{ gap: 10 }}>
      {/* Big identity: makes any wrong-content flash obvious */}
      <View style={{ gap: 2 }}>
        <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }}>
          {`SECTION ${sectionKey}`}
        </Text>
        <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800", lineHeight: 16 }}>
          {subtitle}
        </Text>
      </View>

      <DeckProbeCard cardId={`settings-${sectionKey.toLowerCase()}`} label="SETTINGS" />

      {rows.map((r) => (
        <Row key={`${sectionKey}-${r.label}`} label={r.label} value={r.value} />
      ))}

      <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 15, fontWeight: "700" }}>
        {paragraphs[0]}
      </Text>
    </View>
  );
}

export default function DeckSettingsScreen() {
  const { palette } = useTheme();
  const { width, height } = useWindowDimensions();

  const [keepAllMounted, setKeepAllMounted] = useState(true);
  const [useContentOwnerGating, setUseContentOwnerGating] = useState(true);
  const [renderStackBodies, setRenderStackBodies] = useState(true);

  const railsHidden = width < 920;
  const compact = railsHidden;

  // A/B: keep all cards mounted vs. limited visible stack.
  const maxVisible = keepAllMounted ? SECTIONS.length : 3;

  const compactCardMax = height < 760 ? 500 : 520;
  const cardHeight = compact
    ? clamp(Math.round(height * 0.66), 420, compactCardMax)
    : 560;
  const cardWidthMax = compact ? Math.min(520, width - 24) : 940;
  const cardWidthRatio = compact ? 0.96 : 0.985;

  const laneInset = railsHidden ? 0 : SIDE_PAD + RAIL_W + LANE_GAP;
  const deckYOffset = railsHidden ? 22 : -48;

  const deckRef = useRef<SettingsWalletStackHandle | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
        render: () => <SectionBody sectionKey="GENERAL" />,
      },
      {
        key: "notification",
        title: "Notification",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="NOTIFICATION" />,
      },
      {
        key: "identity",
        title: "Identity",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="IDENTITY" />,
      },
      {
        key: "accounts",
        title: "Accounts",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="ACCOUNTS" />,
      },
      {
        key: "password",
        title: "Password",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="PASSWORD" />,
      },
      {
        key: "support",
        title: "Support",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="SUPPORT" />,
      },
      {
        key: "feedback",
        title: "Feedback",
        detailsEnabled: false,
        render: () => <SectionBody sectionKey="FEEDBACK" />,
      },
    ],
    [palette.muted]
  );

  const onPick = (index: number) => {
    deckRef.current?.goToIndex(index);
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.debugWrap} pointerEvents="box-none">
        <View style={styles.debugPanel}>
          <DebugPanel
            title="Settings deck A/B"
            note={`active=${activeIndex + 1}/${SECTIONS.length}  maxVisible=${maxVisible}`}
            toggles={[
              {
                key: "keepAll",
                label: "Keep all cards mounted",
                value: keepAllMounted,
                onChange: setKeepAllMounted,
              },
              {
                key: "stackBodies",
                label: "Render stack card bodies",
                value: renderStackBodies,
                onChange: setRenderStackBodies,
              },
              {
                key: "gating",
                label: "Use content-owner gating",
                value: useContentOwnerGating,
                onChange: setUseContentOwnerGating,
              },
            ]}
          />
        </View>
      </View>

      {!railsHidden ? <Rail side="left" activeIndex={activeIndex} onPick={onPick} /> : null}

      <View
        style={[
          styles.deckLane,
          {
            left: laneInset,
            right: laneInset,
            transform: [{ translateY: deckYOffset }],
          },
        ]}
      >
        <SettingsWalletStack
          ref={deckRef}
          cards={cards}
          cardHeight={cardHeight}
          cardWidthMax={cardWidthMax}
          cardWidthRatio={cardWidthRatio}
          centerBiasY={0}
          maxVisible={maxVisible}
          onActiveIndexChange={setActiveIndex}
          debug={{ useContentOwnerGating, renderStackBodies }}
        />
      </View>

      {!railsHidden ? <Rail side="right" activeIndex={activeIndex} onPick={onPick} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  debugWrap: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: "center",
  },
  debugPanel: {
    pointerEvents: "auto",
  },
  deckLane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  rail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: RAIL_W,
    justifyContent: "center",
    gap: 8,
  },
  railLeft: {
    left: SIDE_PAD,
    alignItems: "flex-end",
  },
  railRight: {
    right: SIDE_PAD,
    alignItems: "flex-start",
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
    fontSize: 13,
    fontWeight: "700",
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 200,
  },
  comingSoon: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
});
