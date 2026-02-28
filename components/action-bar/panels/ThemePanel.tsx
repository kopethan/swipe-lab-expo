import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeAccent = 'teal' | 'sun' | 'sky' | 'violet' | 'rose';

export type ThemePanelPalette = {
  text: string;
  muted: string;
  border: string;
  surfaceAlt: string;
  surface: string;
};

type Props = {
  mode: ThemeMode;
  accent: ThemeAccent;
  onChangeMode: (next: ThemeMode) => void;
  onChangeAccent: (next: ThemeAccent) => void;
  palette: ThemePanelPalette;
};

const MODES: ThemeMode[] = ['system', 'light', 'dark'];
const ACCENTS: ThemeAccent[] = ['teal', 'sun', 'sky', 'violet', 'rose'];

export function ThemePanel({ mode, accent, onChangeMode, onChangeAccent, palette }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: palette.text }]}>Theme mode</Text>
      <View style={styles.grid}>
        {MODES.map((m) => (
          <PillButton
            key={m}
            label={m}
            active={mode === m}
            onPress={() => onChangeMode(m)}
            palette={palette}
            minWidth={96}
          />
        ))}
      </View>

      <Text style={[styles.title, { color: palette.text }]}>Accent</Text>
      <View style={styles.grid}>
        {ACCENTS.map((a) => (
          <PillButton
            key={a}
            label={a}
            active={accent === a}
            onPress={() => onChangeAccent(a)}
            palette={palette}
            minWidth={92}
          />
        ))}
      </View>

      <Text style={[styles.help, { color: palette.muted }]}>Lab only: selections are stored locally.</Text>
    </View>
  );
}

function PillButton({
  label,
  active,
  onPress,
  palette,
  minWidth,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: ThemePanelPalette;
  minWidth: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          minWidth,
          borderColor: palette.border,
          backgroundColor: active ? palette.surface : palette.surfaceAlt,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: '900', textTransform: 'capitalize' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  btn: {
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  help: {
    fontSize: 12,
    fontWeight: '700',
  },
});
