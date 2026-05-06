import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { useTradeStore } from "../state";
import type { TradeFeedItem, TradeStatus } from "../types";

const STATUS_LABELS: Record<TradeStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  matched: "Matched",
  expired: "Expired",
  closed: "Closed",
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

function getVisibleStatus(item: TradeFeedItem): TradeStatus {
  if (item.status === "active" && isExpiredTrade(item)) {
    return "expired";
  }

  return item.status;
}

function getListingLabel(item: TradeFeedItem) {
  if (item.status === "closed") {
    return `Closed ${formatDateTime(item.closedAt)}`;
  }

  if (item.expirationMode === "manual") {
    return "Until closed by owner";
  }

  return `Expires ${formatDateTime(item.expiresAt)}`;
}

function OwnerTradeCard({
  item,
  onOpen,
  onClose,
}: {
  item: TradeFeedItem;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const visibleStatus = getVisibleStatus(item);
  const canClose = visibleStatus === "active";

  return (
    <View style={[styles.tradeCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.tradeTopRow}>
        <View style={styles.tradeTopText}>
          <Text style={[styles.tradeKicker, { color: palette.muted }]} numberOfLines={1}>
            PUBLISHED TRADE
          </Text>
          <Text style={[styles.tradeTitle, { color: palette.text }]} numberOfLines={2}>
            {item.need.title} ↔ {item.offer.title}
          </Text>
        </View>

        <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.statusText, { color: palette.text }]} numberOfLines={1}>
            {STATUS_LABELS[visibleStatus]}
          </Text>
        </View>
      </View>

      <View style={styles.tradeMetaBlock}>
        <Text style={[styles.tradeMeta, { color: palette.muted }]} numberOfLines={1}>
          Published {formatDateTime(item.publishedAt)}
        </Text>
        <Text style={[styles.tradeMeta, { color: palette.muted }]} numberOfLines={1}>
          {getListingLabel(item)}
        </Text>
        {item.matchScore != null ? (
          <Text style={[styles.tradeMeta, { color: palette.muted }]} numberOfLines={1}>
            {item.matchScore}% match score
          </Text>
        ) : null}
      </View>

      <View style={[styles.visibilityNote, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.visibilityText, { color: palette.muted }]}>
          {visibleStatus === "active"
            ? "Visible in the public Feed."
            : "Hidden from the public Feed. Kept here for owner management."}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Open detail</Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          disabled={!canClose}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.text },
            !canClose ? { opacity: 0.38 } : null,
            pressed && canClose ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: palette.background }]}>
            {canClose ? "Close trade" : "Closed"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyOwnerTrades() {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <View style={[styles.emptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>No published trades yet</Text>
      <Text style={[styles.emptyText, { color: palette.muted }]}>
        Create a public Trade from one private Need and one private Offer. It will appear here for owner management.
      </Text>
      <Pressable
        onPress={() => router.push("/trade/create")}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.emptyButton,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
          pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Text style={[styles.emptyButtonText, { color: palette.text }]}>Create trade</Text>
      </Pressable>
    </View>
  );
}

export function TradeOwnerTrades() {
  const router = useRouter();
  const { palette } = useTheme();
  const { closeTrade, tradeItems } = useTradeStore();

  const stats = useMemo(() => {
    return tradeItems.reduce(
      (summary, item) => {
        const status = getVisibleStatus(item);

        if (status === "active") {
          summary.active += 1;
        } else if (status === "expired") {
          summary.expired += 1;
        } else if (status === "closed") {
          summary.closed += 1;
        }

        return summary;
      },
      { active: 0, expired: 0, closed: 0 }
    );
  }, [tradeItems]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.summaryCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.summaryKicker, { color: palette.muted }]}>OWNER SPACE</Text>
        <Text style={[styles.summaryTitle, { color: palette.text }]}>My Trades</Text>
        <Text style={[styles.summaryText, { color: palette.muted }]}>
          Manage the public Trades you published. Needs and Offers stay private; this tab controls the public listing.
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.statValue, { color: palette.text }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: palette.muted }]}>Active</Text>
          </View>
          <View style={[styles.statPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.statValue, { color: palette.text }]}>{stats.expired}</Text>
            <Text style={[styles.statLabel, { color: palette.muted }]}>Expired</Text>
          </View>
          <View style={[styles.statPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.statValue, { color: palette.text }]}>{stats.closed}</Text>
            <Text style={[styles.statLabel, { color: palette.muted }]}>Closed</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/trade/create")}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: palette.text },
            pressed ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.createButtonText, { color: palette.background }]}>Create new trade</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionKicker, { color: palette.muted }]}>PUBLISHED LISTINGS</Text>
        <Text style={[styles.sectionCount, { color: palette.muted }]}>{tradeItems.length} total</Text>
      </View>

      <View style={styles.list}>
        {tradeItems.length > 0 ? (
          tradeItems.map((item) => (
            <OwnerTradeCard
              key={item.id}
              item={item}
              onOpen={() => router.push({ pathname: "/trade/[tradeId]", params: { tradeId: item.id } })}
              onClose={() => closeTrade(item.id)}
            />
          ))
        ) : (
          <EmptyOwnerTrades />
        )}
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  summaryKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  summaryTitle: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 29,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  createButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
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
  tradeCard: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  tradeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  tradeTopText: {
    flex: 1,
    gap: 4,
  },
  tradeKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  tradeTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 23,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tradeMetaBlock: {
    gap: 4,
  },
  tradeMeta: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  visibilityNote: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  emptyButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  emptyButtonText: {
    fontSize: 11,
    fontWeight: "900",
  },
});
