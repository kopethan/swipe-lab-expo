import React from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

export type DebugToggle = {
  key: string;
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
};

export function DebugPanel({
  title,
  toggles,
  note,
}: {
  title: string;
  toggles: DebugToggle[];
  note?: string;
}) {
  const { palette } = useTheme();

  const trackFalse = palette.border;
  const trackTrue = palette.text;
  const thumb = palette.surface;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>

      {note ? (
        <Text style={[styles.note, { color: palette.muted }]}>{note}</Text>
      ) : null}

      <View style={styles.rows}>
        {toggles.map((t) => (
          <View key={t.key} style={styles.row}>
            <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
              {t.label}
            </Text>
            <Switch
              value={t.value}
              onValueChange={t.onChange}
              trackColor={{ false: trackFalse, true: trackTrue }}
              thumbColor={thumb}
              ios_backgroundColor={trackFalse}
              style={Platform.OS === "web" ? ({ transform: [{ scale: 0.85 }] } as any) : undefined}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: palette.muted }]}>Watch m# + typed text in the probe.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 300,
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  note: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  rows: {
    gap: 8,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  hint: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
