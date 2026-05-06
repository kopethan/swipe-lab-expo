import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, type LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";

import { ContinuousSquareStackDeck } from "@/features/square-stack-deck";
import { useTheme } from "@/providers/ThemeProvider";

import { useTradeStore } from "../state";
import type { TradeCategory, TradeFeedItem } from "../types";
import { TradeCreateForm } from "./TradeCreateForm";
import { TradeFeedCard } from "./TradeFeedCard";

type FeedDeckGroup = {
  key: string;
  label: string;
  description: string;
  items: TradeFeedItem[];
};

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

const CATEGORY_ORDER: TradeCategory[] = [
  "design",
  "development",
  "marketing",
  "writing",
  "photo-video",
  "language",
  "home-help",
  "teaching",
  "business",
  "other",
];

function uniqueById(items: TradeFeedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function getTradeTags(item: TradeFeedItem) {
  return [...(item.need.tags ?? []), ...(item.offer.tags ?? [])].map((tag) => tag.trim()).filter(Boolean);
}

function buildFeedDeckGroups(feedItems: TradeFeedItem[]): FeedDeckGroup[] {
  const groups: FeedDeckGroup[] = [
    {
      key: "all",
      label: "All",
      description: "Every published trade",
      items: feedItems,
    },
  ];

  CATEGORY_ORDER.forEach((category) => {
    const items = feedItems.filter((item) => item.need.category === category || item.offer.category === category);

    if (items.length > 0) {
      groups.push({
        key: `category:${category}`,
        label: CATEGORY_LABELS[category],
        description: "Grouped by need or offer category",
        items,
      });
    }
  });

  const tagBuckets = new Map<string, TradeFeedItem[]>();

  feedItems.forEach((item) => {
    getTradeTags(item).forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      const existing = tagBuckets.get(normalizedTag) ?? [];
      existing.push(item);
      tagBuckets.set(normalizedTag, existing);
    });
  });

  Array.from(tagBuckets.entries())
    .map(([tagKey, items]) => ({
      tagKey,
      label: items
        .flatMap((item) => getTradeTags(item))
        .find((tag) => tag.toLowerCase() === tagKey) ?? tagKey,
      items: uniqueById(items),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
    .slice(0, 6)
    .forEach((group) => {
      groups.push({
        key: `tag:${group.tagKey}`,
        label: `#${group.label}`,
        description: "Grouped by need or offer tag",
        items: group.items,
      });
    });

  return groups;
}

export function TradeFeed() {
  const { palette } = useTheme();
  const router = useRouter();
  const { feedItems } = useTradeStore();
  const deckGroups = React.useMemo(() => buildFeedDeckGroups(feedItems), [feedItems]);
  const [activeGroupKey, setActiveGroupKey] = useState(deckGroups[0]?.key ?? "all");
  const activeGroup = deckGroups.find((group) => group.key === activeGroupKey) ?? deckGroups[0];
  const activeDeckItems = activeGroup?.items ?? [];
  const firstActiveFeedItemId = activeDeckItems[0]?.id ?? "-";
  const [activeLabel, setActiveLabel] = useState(firstActiveFeedItemId);
  const [stageBounds, setStageBounds] = useState({ width: 0, height: 0 });
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);

  useEffect(() => {
    if (!deckGroups.some((group) => group.key === activeGroupKey)) {
      setActiveGroupKey(deckGroups[0]?.key ?? "all");
    }
  }, [activeGroupKey, deckGroups]);

  useEffect(() => {
    setActiveLabel((current) =>
      activeDeckItems.some((item) => item.id === current) ? current : firstActiveFeedItemId
    );
  }, [activeDeckItems, firstActiveFeedItemId]);

  const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;

    setStageBounds((current) => {
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);

      if (Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  return (
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      style={[styles.feedShell, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.feedIntro}>
        <Text style={[styles.feedKicker, { color: palette.muted }]}>DISCOVER</Text>
        <Text style={[styles.feedTitle, { color: palette.text }]}>Need <-> Offer feed</Text>
        <Text style={[styles.feedText, { color: palette.muted }]}>
          Browse compact trade cards. Vertical drags can scroll the page; intentional diagonal drags move through the
          square stack.
        </Text>
        <Text style={[styles.feedMeta, { color: palette.muted }]}>
          Deck: {activeGroup?.label ?? "All"} - {activeDeckItems.length} cards - Active: {activeLabel}
        </Text>

        <View style={styles.feedActions}>
          <Pressable
            onPress={() => setIsCreatingTrade((current) => !current)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createTradeButton,
              { borderColor: palette.border, backgroundColor: palette.surface },
              pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={[styles.createTradeButtonText, { color: palette.text }]}>
              {isCreatingTrade ? "Close create trade" : "Create trade"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.deckPickerBlock}>
          <View style={styles.deckPickerHeader}>
            <Text style={[styles.deckPickerTitle, { color: palette.text }]}>Decks</Text>
            <Text style={[styles.deckPickerMeta, { color: palette.muted }]}>
              {activeGroup?.description ?? "Grouped trades"}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckPicker}>
            {deckGroups.map((group) => {
              const selected = group.key === activeGroup?.key;

              return (
                <Pressable
                  key={group.key}
                  onPress={() => setActiveGroupKey(group.key)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.deckChip,
                    {
                      borderColor: selected ? palette.text : palette.border,
                      backgroundColor: selected ? palette.text : palette.surface,
                    },
                    pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  <Text style={[styles.deckChipText, { color: selected ? palette.background : palette.text }]}>
                    {group.label} - {group.items.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {isCreatingTrade ? (
        <View style={styles.createTradeWrap}>
          <TradeCreateForm onDone={() => setIsCreatingTrade(false)} />
        </View>
      ) : null}

      <View style={styles.stage} onLayout={handleStageLayout}>
        {activeDeckItems.length > 0 ? (
          <ContinuousSquareStackDeck
            key={activeGroup?.key ?? "all"}
            cards={activeDeckItems}
            availableWidth={stageBounds.width}
            availableHeight={stageBounds.height}
            minCardSize={254}
            maxCardSize={360}
            renderWindow="all"
            showDebugBadge={false}
            depthEffect="flat"
            onIndexChange={(_, item) => setActiveLabel(item.id)}
            renderCard={({ card, index, total }) => (
              <Pressable
                onPress={() => router.push({ pathname: "/trade/[tradeId]", params: { tradeId: card.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.cardPressable,
                  pressed ? { opacity: 0.92, transform: [{ scale: 0.992 }] } : null,
                ]}
              >
                <TradeFeedCard item={card} index={index} total={total} />
              </Pressable>
            )}
          />
        ) : (
          <View style={[styles.emptyFeedCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyFeedText, { color: palette.muted }]}>No trades in this deck yet.</Text>
          </View>
        )}
      </View>

      <Text style={[styles.footerText, { color: palette.muted }]}>
        Back-list cards are mounted with their real Need/Offer content so the stack feels ready before each swipe.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedShell: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 48,
    paddingTop: 22,
    gap: 14,
  },
  feedIntro: {
    paddingHorizontal: 18,
    gap: 5,
  },
  feedKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  feedTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  feedText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  feedMeta: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  feedActions: {
    marginTop: 8,
    flexDirection: "row",
  },
  createTradeButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createTradeButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  deckPickerBlock: {
    marginTop: 8,
    gap: 9,
  },
  deckPickerHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  deckPickerTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  deckPickerMeta: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
  },
  deckPicker: {
    gap: 8,
    paddingRight: 18,
  },
  deckChip: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  deckChipText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  createTradeWrap: {
    paddingHorizontal: 18,
  },
  stage: {
    height: 430,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: 18,
  },
  cardPressable: {
    flex: 1,
  },
  emptyFeedCard: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 32,
    paddingHorizontal: 24,
  },
  emptyFeedText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  footerText: {
    paddingHorizontal: 18,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
});
