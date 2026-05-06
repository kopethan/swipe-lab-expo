import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { TRADE_OFFER_MOCK_ITEMS } from "../data";
import type { TradeCategory, TradeOfferItem, TradeServiceMode, TradeStatus } from "../types";

const CATEGORY_LABELS: Record<TradeCategory, string> = {
  design: "Design",
  development: "Development",
  marketing: "Marketing",
  writing: "Writing",
  "photo-video": "Photo / Video",
  language: "Language",
  "home-help": "Home help",
  teaching: "Teaching",
  business: "Business",
  other: "Other",
};

const MODE_LABELS: Record<TradeServiceMode, string> = {
  remote: "Remote",
  local: "Local",
  hybrid: "Hybrid",
};

const STATUS_LABELS: Record<TradeStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  matched: "Matched",
  closed: "Closed",
};

function compactMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function CreateOfferCard() {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={() => console.log("create offer")}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.createCard,
        { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.createPlus, { color: palette.muted }]}>＋</Text>
      <Text style={[styles.createTitle, { color: palette.text }]}>Create an offer</Text>
      <Text style={[styles.createText, { color: palette.muted }]}>Describe what you can provide and what you want in exchange.</Text>
    </Pressable>
  );
}

function OfferListCard({ item, index }: { item: TradeOfferItem; index: number }) {
  const { palette } = useTheme();
  const meta = compactMeta([CATEGORY_LABELS[item.category], item.availability, MODE_LABELS[item.mode]]);

  return (
    <Pressable
      onPress={() => console.log("open offer", item.id)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.offerCard,
        { borderColor: palette.border, backgroundColor: palette.surface },
        pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={styles.offerTopRow}>
        <Text style={[styles.offerKicker, { color: palette.muted }]} numberOfLines={1}>
          CREATED OFFER {index + 1}
        </Text>
        <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.statusText, { color: palette.text }]} numberOfLines={1}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={[styles.offerTitle, { color: palette.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.offerMeta, { color: palette.muted }]} numberOfLines={1}>
        {meta}
      </Text>

      <Text style={[styles.includesText, { color: palette.text }]} numberOfLines={1}>
        Includes: {item.includes}
      </Text>

      {item.preferredExchange ? (
        <Text style={[styles.exchangeText, { color: palette.muted }]} numberOfLines={1}>
          Wants: {item.preferredExchange}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function TradeOffers() {
  const { palette } = useTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <CreateOfferCard />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionKicker, { color: palette.muted }]}>MY OFFERS</Text>
        <Text style={[styles.sectionCount, { color: palette.muted }]}>{TRADE_OFFER_MOCK_ITEMS.length} created</Text>
      </View>

      <View style={styles.list}>
        {TRADE_OFFER_MOCK_ITEMS.map((item, index) => (
          <OfferListCard key={item.id} item={item} index={index} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 42,
    paddingTop: 22,
    gap: 18,
  },
  createCard: {
    minHeight: 188,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 34,
    borderStyle: "dashed",
    paddingHorizontal: 26,
    paddingVertical: 28,
    gap: 8,
  },
  createPlus: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 26,
    textAlign: "center",
  },
  createText: {
    maxWidth: 260,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  list: {
    gap: 14,
  },
  offerCard: {
    minHeight: 136,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  offerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  offerKicker: {
    flex: 1,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  offerMeta: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  includesText: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  exchangeText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
});
