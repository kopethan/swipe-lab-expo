import { Stack, router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { ActionBarDock } from '@/components/action-bar/ActionBarDock';

export default function ActionBarLabScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const bg = isDark ? '#151718' : '#ffffff';
  const text = isDark ? '#ECEDEE' : '#11181C';
  const muted = isDark ? 'rgba(236,237,238,0.7)' : 'rgba(17,24,28,0.62)';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Stack.Screen options={{ title: 'Action Bar', headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {/* NOTE: On web, expo-router's <Link asChild> can forward RN style arrays to a DOM <a>.
             That crashes React DOM with: "CSSStyleProperties doesn't have an indexed property setter for '0'".
             Using Pressable + router.push keeps this screen stable on web.
          */}
          <Pressable
            onPress={() => router.push('/')}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back to labs"
          >
            <Text style={[styles.back, { color: text }]}>{'← Back'}</Text>
          </Pressable>

          <Text style={[styles.title, { color: text }]}>Action Bar Lab (Web Dock)</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            Locked bottom/center · No drag · Single-surface morph (Slice A)
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' },
          ]}
        >
          <Text style={[styles.cardTitle, { color: text }]}>What to test</Text>
          <Text style={[styles.cardText, { color: muted }]}>
            1) Tap any icon → the surface opens.
          </Text>
          <Text style={[styles.cardText, { color: muted }]}>
            2) Switch tools while open → content fades out, swaps, fades in.
          </Text>
          <Text style={[styles.cardText, { color: muted }]}>
            3) Click outside or close button → returns to compact dock.
          </Text>
        </View>

        <View style={{ height: 680 }} />
        <Text style={[styles.footerHint, { color: muted }]}
        >
          Scroll to confirm the dock stays locked.
        </Text>
      </ScrollView>

      <ActionBarDock />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  header: {
    gap: 6,
    marginBottom: 14,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  back: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
