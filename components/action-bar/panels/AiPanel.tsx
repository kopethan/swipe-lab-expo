import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type AiPanelPalette = {
  text: string;
  muted: string;
  border: string;
  surfaceAlt: string;
};

type Props = {
  prompt: string;
  onChangePrompt: (next: string) => void;
  onSubmit: () => void;
  palette: AiPanelPalette;
};

export function AiPanel({ prompt, onChangePrompt, onSubmit, palette }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: palette.text }]}>AI assistant</Text>

      <TextInput
        value={prompt}
        onChangeText={onChangePrompt}
        placeholder="Describe what you want…"
        placeholderTextColor={palette.muted}
        style={[
          styles.input,
          {
            color: palette.text,
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
          },
        ]}
        multiline
      />

      <View style={styles.suggestions}>
        <Suggestion label='"2-hour chill walk + coffee"' palette={palette} onPress={() => onChangePrompt('2-hour chill walk + coffee')} />
        <Suggestion label='"Cinema + ramen"' palette={palette} onPress={() => onChangePrompt('Cinema + ramen')} />
        <Suggestion label='"Indoor climbing after work"' palette={palette} onPress={() => onChangePrompt('Indoor climbing after work')} />
      </View>

      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.cta,
          {
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '900' }}>Ask AI</Text>
      </Pressable>

      <Text style={[styles.help, { color: palette.muted }]}>Lab only: this does not call the backend.</Text>
    </View>
  );
}

function Suggestion({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: AiPanelPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestion,
        {
          borderColor: palette.border,
          backgroundColor: palette.surfaceAlt,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: palette.text, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 2,
  },
  input: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestion: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cta: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  help: {
    paddingHorizontal: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
