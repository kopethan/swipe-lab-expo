import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ParticipationFilter = 'ALL' | 'JOINED' | 'CREATED';
export type StatusFilter = 'ALL' | 'UPCOMING' | 'ONGOING' | 'PAST';
export type SortMode = 'default' | 'balanced_joins';

export type FilterPanelPalette = {
  text: string;
  muted: string;
  border: string;
  surfaceAlt: string;
  surface: string;
};

type Props = {
  participation: ParticipationFilter;
  status: StatusFilter;
  sortMode: SortMode;
  nearMe: boolean;
  onChangeParticipation: (next: ParticipationFilter) => void;
  onChangeStatus: (next: StatusFilter) => void;
  onChangeSortMode: (next: SortMode) => void;
  onToggleNearMe: () => void;
  onReset: () => void;
  palette: FilterPanelPalette;
};

export function FilterPanel({
  participation,
  status,
  sortMode,
  nearMe,
  onChangeParticipation,
  onChangeStatus,
  onChangeSortMode,
  onToggleNearMe,
  onReset,
  palette,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Section title="Participation" palette={palette}>
        <Row>
          <Chip
            label="All"
            active={participation === 'ALL'}
            onPress={() => onChangeParticipation('ALL')}
            palette={palette}
          />
          <Chip
            label="Joined"
            active={participation === 'JOINED'}
            onPress={() => onChangeParticipation('JOINED')}
            palette={palette}
          />
          <Chip
            label="Created"
            active={participation === 'CREATED'}
            onPress={() => onChangeParticipation('CREATED')}
            palette={palette}
          />
        </Row>
      </Section>

      <Section title="Status" palette={palette}>
        <Row>
          <Chip label="All" active={status === 'ALL'} onPress={() => onChangeStatus('ALL')} palette={palette} />
          <Chip
            label="Upcoming"
            active={status === 'UPCOMING'}
            onPress={() => onChangeStatus('UPCOMING')}
            palette={palette}
          />
          <Chip
            label="Ongoing"
            active={status === 'ONGOING'}
            onPress={() => onChangeStatus('ONGOING')}
            palette={palette}
          />
          <Chip label="Past" active={status === 'PAST'} onPress={() => onChangeStatus('PAST')} palette={palette} />
        </Row>
      </Section>

      <Section title="Sort" palette={palette}>
        <Row>
          <Chip
            label="Default"
            active={sortMode === 'default'}
            onPress={() => onChangeSortMode('default')}
            palette={palette}
          />
          <Chip
            label="Balanced joins"
            active={sortMode === 'balanced_joins'}
            onPress={() => onChangeSortMode('balanced_joins')}
            palette={palette}
          />
        </Row>
      </Section>

      <Section title="Location" palette={palette}>
        <Row>
          <Chip label="Near me" active={nearMe} onPress={onToggleNearMe} palette={palette} />
        </Row>
      </Section>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset filters"
        onPress={onReset}
        style={({ pressed }) => [
          styles.reset,
          {
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '900' }}>Reset</Text>
      </Pressable>
    </View>
  );
}

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: FilterPanelPalette;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.muted }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Chip({
  label,
  active,
  onPress,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: FilterPanelPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: palette.border,
          backgroundColor: active ? palette.surface : palette.surfaceAlt,
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
    gap: 16,
    paddingHorizontal: 2,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  reset: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
