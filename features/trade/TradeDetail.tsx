import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { useTradeStore } from "./state";
import type { TradeCategory, TradeFeedItem, TradeServiceMode } from "./types";

type TradeDetailProps = {
  tradeId: string;
};

type DetailZoneKind = "need" | "offer";

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

function formatDateTime(value?: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isExpiredTrade(item: TradeFeedItem) {
  if (!item.expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(item.expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

function getVisibleStatus(item: TradeFeedItem) {
  return isExpiredTrade(item) ? "expired" : item.status;
}

function compactMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function DetailChip({ label }: { label: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.chip, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.chipText, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.backButton,
        { borderColor: palette.border, backgroundColor: palette.surface },
        pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <Text style={[styles.backButtonText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function DetailZone({
  kind,
  title,
  description,
  meta,
  tags,
}: {
  kind: DetailZoneKind;
  title: string;
  description?: string;
  meta: string;
  tags?: string[];
}) {
  const { palette } = useTheme();
  const label = kind === "need" ? "Need" : "Offer";
  const headline = kind === "need" ? "What they need" : "What they offer";

  return (
    <View style={[styles.zoneCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.zoneHeader}>
        <Text style={[styles.zoneKicker, { color: palette.muted }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.zoneHeadline, { color: palette.muted }]}>{headline}</Text>
      </View>

      <Text style={[styles.zoneTitle, { color: palette.text }]}>{title}</Text>

      <Text style={[styles.zoneMeta, { color: palette.muted }]}>{meta}</Text>

      {description ? <Text style={[styles.zoneDescription, { color: palette.text }]}>{description}</Text> : null}

      {tags && tags.length > 0 ? (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <DetailChip key={`${kind}-${tag}`} label={tag} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TradeNotFound({ tradeId }: { tradeId: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.notFoundScreen, { backgroundColor: palette.background }]}>
      <View style={[styles.notFoundCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.notFoundKicker, { color: palette.muted }]}>TRADE DETAIL</Text>
        <Text style={[styles.notFoundTitle, { color: palette.text }]}>Trade not found</Text>
        <Text style={[styles.notFoundText, { color: palette.muted }]}>
          This trade is not available in the local mock store. ID: {tradeId || "missing"}
        </Text>
        <BackButton />
      </View>
    </View>
  );
}

export function TradeDetail({ tradeId }: TradeDetailProps) {
  const router = useRouter();
  const { palette } = useTheme();
  const { findTradeById } = useTradeStore();
  const trade = findTradeById(tradeId);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    trade?.need.tags?.forEach((tag) => tagSet.add(tag));
    trade?.offer.tags?.forEach((tag) => tagSet.add(tag));
    return Array.from(tagSet).slice(0, 8);
  }, [trade]);

  if (!trade) {
    return <TradeNotFound tradeId={tradeId} />;
  }
  const visibleStatus = getVisibleStatus(trade);

  const needMeta = compactMeta([
    CATEGORY_LABELS[trade.need.category],
    trade.need.timing,
    MODE_LABELS[trade.need.mode],
    trade.need.locationLabel,
  ]);

  const offerMeta = compactMeta([
    CATEGORY_LABELS[trade.offer.category],
    trade.offer.availability,
    MODE_LABELS[trade.offer.mode],
    trade.offer.locationLabel,
  ]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <BackButton />
        <Text style={[styles.topMeta, { color: palette.muted }]} numberOfLines={1}>
          {visibleStatus.toUpperCase()}
        </Text>
      </View>

      <View style={[styles.heroCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleBlock}>
            <Text style={[styles.heroKicker, { color: palette.muted }]}>PUBLIC TRADE</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Need ↔ Offer</Text>
          </View>

          {trade.matchScore != null ? (
            <View style={[styles.scorePill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[styles.scoreValue, { color: palette.text }]}>{trade.matchScore}%</Text>
              <Text style={[styles.scoreLabel, { color: palette.muted }]}>match</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroSummary}>
          <Text style={[styles.summaryTitle, { color: palette.text }]} numberOfLines={2}>
            {trade.need.title}
          </Text>
          <Text style={[styles.summaryExchange, { color: palette.muted }]}>↔</Text>
          <Text style={[styles.summaryTitle, { color: palette.text }]} numberOfLines={2}>
            {trade.offer.title}
          </Text>
        </View>

        <View style={[styles.ownerRow, { borderTopColor: palette.border }]}>
          <View style={styles.ownerTextBlock}>
            <Text style={[styles.ownerKicker, { color: palette.muted }]}>PUBLISHED BY</Text>
            <Text style={[styles.ownerName, { color: palette.text }]} numberOfLines={1}>
              {trade.participant.name}
              {trade.participant.rating ? ` · ${trade.participant.rating.toFixed(1)}` : ""}
            </Text>
          </View>
          {trade.participant.locationLabel ? (
            <Text style={[styles.ownerLocation, { color: palette.muted }]} numberOfLines={1}>
              {trade.participant.locationLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <DetailZone
        kind="need"
        title={trade.need.title}
        description={trade.need.shortDescription}
        meta={needMeta}
        tags={trade.need.tags}
      />

      <DetailZone
        kind="offer"
        title={trade.offer.title}
        description={trade.offer.shortDescription ?? trade.offer.includes}
        meta={offerMeta}
        tags={trade.offer.tags}
      />

      {allTags.length > 0 ? (
        <View style={[styles.tagsSection, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.tagsTitle, { color: palette.muted }]}>GROUPING TAGS</Text>
          <View style={styles.chipRow}>
            {allTags.map((tag) => (
              <DetailChip key={`detail-${tag}`} label={tag} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.expirationSection, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.expirationTitle, { color: palette.muted }]}>LISTING TIME</Text>
        <Text style={[styles.expirationMain, { color: palette.text }]}>
          {trade.expirationMode === "manual" ? "Until closed by owner" : `Expires ${formatDateTime(trade.expiresAt)}`}
        </Text>
        <Text style={[styles.expirationText, { color: palette.muted }]}>
          Published {formatDateTime(trade.publishedAt)}
          {visibleStatus === "expired" ? " · This trade is no longer visible in the public Feed." : ""}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => console.log("interested in trade", trade.id)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.text },
            pressed ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: palette.background }]}>I’m interested</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: palette.border, backgroundColor: palette.surface },
            pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Back to feed</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default TradeDetail;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 42,
    paddingTop: 18,
    gap: 16,
  },
  topBar: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  topMeta: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 4,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  scorePill: {
    minWidth: 66,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  scoreLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroSummary: {
    alignItems: "center",
    gap: 8,
  },
  summaryTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.45,
    lineHeight: 27,
  },
  summaryExchange: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  ownerRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  ownerTextBlock: {
    flex: 1,
    gap: 3,
  },
  ownerKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: "900",
  },
  ownerLocation: {
    maxWidth: 120,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  zoneCard: {
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  zoneKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  zoneHeadline: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
  },
  zoneTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.45,
    lineHeight: 26,
  },
  zoneMeta: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  zoneDescription: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  tagsSection: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  tagsTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    maxWidth: 150,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "900",
  },

  expirationSection: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 7,
  },
  expirationTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  expirationMain: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 22,
  },
  expirationText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },

  actions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  notFoundScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  notFoundCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 12,
  },
  notFoundKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  notFoundText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
