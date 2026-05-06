import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import type { TradeCategory, TradeFeedItem, TradeServiceMode } from "../types";
import { TradeExchangeIcon } from "./TradeExchangeIcon";

type TradeFeedCardProps = {
  item: TradeFeedItem;
  index?: number;
  total?: number;
};

type TradeZoneKind = "need" | "offer";

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

function compactMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function TradeZone({
  kind,
  title,
  meta,
}: {
  kind: TradeZoneKind;
  title: string;
  meta: string;
}) {
  const { palette } = useTheme();
  const label = kind === "need" ? "I need" : "I offer";

  return (
    <View style={styles.zone}>
      <Text style={[styles.zoneLabel, { color: palette.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.zoneTitle, { color: palette.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.84}>
        {title}
      </Text>
      <Text style={[styles.zoneMeta, { color: palette.muted }]} numberOfLines={1}>
        {meta}
      </Text>
    </View>
  );
}

export function TradeFeedCard({ item, index, total }: TradeFeedCardProps) {
  const { mode, palette } = useTheme();
  const cardBackground = mode === "dark" ? palette.surfaceAlt : palette.surface;
  const cardBorder = mode === "light" ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.72)";
  const badgeBackground = mode === "dark" ? palette.surface : palette.surfaceAlt;

  const cardPosition =
    index != null && total != null
      ? `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`
      : null;

  const needMeta = compactMeta([
    CATEGORY_LABELS[item.need.category],
    item.need.timing,
    MODE_LABELS[item.need.mode],
  ]);

  const offerMeta = compactMeta([
    item.offer.includes,
    item.offer.availability,
    MODE_LABELS[item.offer.mode],
  ]);

  return (
    <View style={[styles.cardBody, { backgroundColor: cardBackground }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardKicker, { color: palette.muted }]} numberOfLines={1}>
          TRADE{cardPosition ? ` · ${cardPosition}` : ""}
        </Text>
        {item.matchScore != null ? (
          <Text style={[styles.matchText, { color: palette.text }]} numberOfLines={1}>
            {item.matchScore}% match
          </Text>
        ) : null}
      </View>

      <TradeZone kind="need" title={item.need.title} meta={needMeta} />

      <View style={styles.exchangeRow}>
        <View style={[styles.exchangeLine, { backgroundColor: palette.border }]} />
        <View style={styles.exchangeIconOnly}>
          <View style={styles.exchangeIconWrap}>
            <TradeExchangeIcon size={20} color={palette.text} />
          </View>
        </View>
        <View style={[styles.exchangeLine, { backgroundColor: palette.border }]} />
      </View>

      <TradeZone kind="offer" title={item.offer.title} meta={offerMeta} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  cardHeader: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardKicker: {
    flex: 1,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  matchText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.1,
    textTransform: "uppercase",
  },
  zone: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 9,
  },
  zoneLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  zoneTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.55,
    lineHeight: 29,
  },
  zoneMeta: {
    width: "100%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  exchangeRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  exchangeLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
  },
  exchangeIconOnly: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  exchangeIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
