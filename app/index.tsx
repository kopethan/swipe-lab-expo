import React, { useMemo } from "react";
import { Stack, router } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Lab = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

export default function LabsIndexScreen() {
  const labs = useMemo<Lab[]>(
    () => [
      {
        title: "Action Bar",
        description: "Web docked action bar (bottom/center) + icon-collapse → panel morph.",
        href: "/action-bar",
        badge: "web",
      },
      {
        title: "Settings Deck (Rails)",
        description: "Stacked ‘page cards’ with side rails + snap scrolling.",
        href: "/rails",
      },
      {
        title: "Swipe Deck",
        description: "Swipe mechanics prototype (gesture + card transitions).",
        href: "/swipe",
      },
      {
        title: "Deck Settings",
        description: "Deck tuning screen (depth, spacing, motion parameters).",
        href: "/deck-settings",
      },
      {
        title: "Trade",
        description: "Trade cards prototype.",
        href: "/trade",
      },
      {
        title: "Square Deck Lab",
        description: "Isolated square-card stack using one continuous diagonal swipe model.",
        href: "/square-deck",
        badge: "new",
      },
      {
        title: "Image Card",
        description: "Full-bleed image card with a soft lower-third blur transition.",
        href: "/image-card",
      },
      {
        title: "Wallet",
        description: "Wallet / balance UI prototype.",
        href: "/wallet",
      },
      {
        title: "Modal (template)",
        description: "Starter modal + context menu demo (kept for reference).",
        href: "/modal",
        badge: "ref",
      },
      {
        title: "Explore (template)",
        description: "Expo template Explore tab (kept for reference).",
        href: "/explore",
        badge: "ref",
      },
    ],
    []
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Labs", headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.h1}>Labs</Text>
        <Text style={styles.sub}>
          Choose a prototype to open. (This index replaces the old Rails demo landing page.)
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {labs.map((lab) => (
          <Pressable
            key={lab.href}
            onPress={() => router.push(lab.href)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>{lab.title}</Text>
              <View style={styles.cardRight}>
                {lab.badge ? (
                  <View
                    style={[
                      styles.badge,
                      lab.badge === "web" ? styles.badgeWeb : styles.badgeRef,
                    ]}
                  >
                    <Text style={styles.badgeText}>{lab.badge.toUpperCase()}</Text>
                  </View>
                ) : null}
                <Text style={styles.chev}>›</Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>{lab.description}</Text>
            <Text style={styles.cardMeta}>{lab.href}</Text>
          </Pressable>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tip: on web, the Action Bar lab is the main target for the “dock + morph” redesign.
          </Text>
          {Platform.OS === "web" ? (
            <Text style={styles.footerText}>You can open devtools (F12) to debug layout.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0C",
  },
  header: {
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  h1: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 820,
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    borderColor: "rgba(255,255,255,0.18)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeWeb: {
    borderColor: "rgba(44,229,255,0.55)",
    backgroundColor: "rgba(44,229,255,0.10)",
  },
  badgeRef: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  badgeText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  chev: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 22,
    fontWeight: "800",
    marginTop: -2,
  },
  cardDesc: {
    marginTop: 8,
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    marginTop: 8,
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontFamily: Platform.select({
      web: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
      default: undefined,
    }),
  },
  footer: {
    paddingTop: 10,
    gap: 6,
  },
  footerText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    lineHeight: 16,
  },
});
