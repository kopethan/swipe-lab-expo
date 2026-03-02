import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

let __probeSeq = 0;

function nextProbeId() {
  __probeSeq += 1;
  return __probeSeq;
}

/**
 * DeckProbeCard
 *
 * Helps detect unwanted remounts / fast reloads inside swipe decks.
 * - Shows a stable mountInstanceId (per mount)
 * - Shows a render counter
 * - Includes local state (TextInput + toggle) so resets are obvious
 */
export function DeckProbeCard({
  cardId,
  label,
}: {
  cardId: string;
  label?: string;
}) {
  const { palette } = useTheme();
  const mountInstanceId = useRef<number>(nextProbeId()).current;
  const renderCountRef = useRef<number>(0);
  renderCountRef.current += 1;

  const [value, setValue] = useState<string>("");
  const [flag, setFlag] = useState<boolean>(false);

  const shortId = useMemo(() => {
    if (cardId.length <= 22) return cardId;
    return `${cardId.slice(0, 10)}…${cardId.slice(-8)}`;
  }, [cardId]);

  useEffect(() => {
    console.log("[DeckProbeCard] mount", { cardId, mountInstanceId });
    return () => console.log("[DeckProbeCard] unmount", { cardId, mountInstanceId });
  }, [cardId, mountInstanceId]);

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: palette.border,
          backgroundColor: palette.surfaceAlt,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.kicker, { color: palette.muted }]}>{label ?? "PROBE"}</Text>
        <Text style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>
          id: <Text style={[styles.mono, { color: palette.text }]}>{shortId}</Text>
          {"  "}m# <Text style={[styles.mono, { color: palette.text }]}>{mountInstanceId}</Text>
          {"  "}r# <Text style={[styles.mono, { color: palette.text }]}>{renderCountRef.current}</Text>
        </Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Type here — should NOT reset if card stays mounted"
          placeholderTextColor={palette.muted}
          style={[
            styles.input,
            {
              borderColor: palette.border,
              backgroundColor: palette.surface,
              color: palette.text,
            },
          ]}
        />

        <Pressable
          onPress={() => setFlag((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => [
            [
              styles.toggle,
              {
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ],
            pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text style={[styles.toggleText, { color: palette.text }]}>
            {flag ? "TOGGLE: ON" : "TOGGLE: OFF"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  meta: {
    flex: 1,
    fontSize: 11,
    textAlign: "right",
  },
  mono: {
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  controls: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
  },
  toggle: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
