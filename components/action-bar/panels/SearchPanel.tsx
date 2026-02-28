import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type SearchOp = 'AND' | 'OR';

export type SearchPanelPalette = {
  text: string;
  muted: string;
  border: string;
  surfaceAlt: string;
  surface: string;
};

type Props = {
  term: string;
  term2: string;
  op: SearchOp;
  onChangeTerm: (next: string) => void;
  onChangeTerm2: (next: string) => void;
  onChangeOp: (next: SearchOp) => void;
  palette: SearchPanelPalette;
};

export function SearchPanel({ term, term2, op, onChangeTerm, onChangeTerm2, onChangeOp, palette }: Props) {
  const hasPrimary = term.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: palette.text }]}>Keyword</Text>

      <TextInput
        value={term}
        onChangeText={onChangeTerm}
        placeholder="Search keyword…"
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[
          styles.input,
          {
            color: palette.text,
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
          },
        ]}
      />

      <View style={[styles.opRow, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <OpPill
          label="AND"
          active={op === 'AND'}
          onPress={() => onChangeOp('AND')}
          palette={palette}
        />
        <OpPill
          label="OR"
          active={op === 'OR'}
          onPress={() => onChangeOp('OR')}
          palette={palette}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: hasPrimary ? palette.text : palette.muted }]}>Second keyword</Text>

      <TextInput
        value={term2}
        onChangeText={onChangeTerm2}
        placeholder={hasPrimary ? 'Optional…' : 'Type a first keyword first'}
        placeholderTextColor={palette.muted}
        editable={hasPrimary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: palette.text,
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
            opacity: hasPrimary ? 1 : 0.55,
          },
        ]}
      />

      <Text style={[styles.help, { color: palette.muted }]}>Tip: use tags like #cinema, #walk, #food.</Text>
    </View>
  );
}

function OpPill({
  label,
  active,
  onPress,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: SearchPanelPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.opPill,
        {
          backgroundColor: active ? palette.surface : 'transparent',
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sectionLabel: {
    paddingHorizontal: 2,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  opRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    gap: 6,
  },
  opPill: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  help: {
    paddingHorizontal: 2,
    fontSize: 12,
    fontWeight: '700',
  },
});
