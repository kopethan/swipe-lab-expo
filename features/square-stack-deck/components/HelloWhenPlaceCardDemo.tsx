import React, { memo, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

export type DemoPlaceMediaKind = "photo" | "static_map" | "fallback";

export type HelloWhenPlaceDemoCard = {
  id: string;
  title: string;
  area: string;
  descriptor: string;
  mediaKind: DemoPlaceMediaKind;
  imageUrl?: string;
  distanceLabel: string;
  moodLabel: string;
  tags: string[];
  accent: string;
  modeLabel?: string;
  primaryContext?: string;
  contextBadgeLabel?: string;
  subtitle?: string;
};

type Props = {
  card: HelloWhenPlaceDemoCard;
  index: number;
  total: number;
};

type LowerAtmosphereProps = {
  source?: { uri: string };
  isDark: boolean;
  mediaKind: DemoPlaceMediaKind;
};

function LowerAtmosphere({ source, isDark, mediaKind }: LowerAtmosphereProps) {
  const isStaticMap = mediaKind === "static_map";
  const sliceCount = isStaticMap ? 26 : 24;
  const slices = useMemo(() => Array.from({ length: sliceCount }, (_, index) => index), [sliceCount]);
  const blurStartPercent = isStaticMap ? 46 : 50;
  const safeStart = Math.max(0, Math.min(92, blurStartPercent));
  const overlayHeight = 100 - safeStart;
  const sliceHeight = overlayHeight / sliceCount;
  const sliceOverlap = 0.9;
  const maxBlurRadius = isStaticMap ? 32 : 28;
  const bottomTint = isDark
    ? isStaticMap
      ? "rgba(5,7,10,0.52)"
      : "rgba(8,10,12,0.46)"
    : isStaticMap
      ? "rgba(255,255,255,0.66)"
      : "rgba(255,255,255,0.46)";
  const tintStrength = isStaticMap ? 0.92 : 0.82;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {source ? (
        slices.map((slice) => {
          const progress = (slice + 1) / sliceCount;
          const eased = progress * progress * (3 - 2 * progress);
          const top = safeStart + slice * sliceHeight - sliceOverlap / 2;
          const height = sliceHeight + sliceOverlap;
          const blurOpacity = eased * 0.9;
          const tintOpacity = eased * tintStrength;

          return (
            <React.Fragment key={`blur-slice-${slice}`}>
              <View
                style={[
                  styles.atmosphereSlice,
                  {
                    top: `${top}%`,
                    height: `${height}%`,
                    opacity: blurOpacity,
                  },
                ]}
              >
                <Image
                  source={source}
                  contentFit="cover"
                  transition={0}
                  blurRadius={6 + eased * (maxBlurRadius - 6)}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <View
                style={[
                  styles.atmosphereSlice,
                  {
                    top: `${top}%`,
                    height: `${height}%`,
                    backgroundColor: bottomTint,
                    opacity: tintOpacity,
                  },
                ]}
              />
            </React.Fragment>
          );
        })
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: isDark ? "rgba(3,5,8,0.42)" : "rgba(255,255,255,0.40)" },
          ]}
        />
      )}
    </View>
  );
}

function mediaLabel(_: DemoPlaceMediaKind) {
  return "offline";
}

function HelloWhenPlaceCardDemoInner({ card }: Props) {
  const { palette } = useTheme();
  const isDark = palette.mode === "dark";
  const isStaticMap = card.mediaKind === "static_map";
  const mediaSurface = isDark ? "#0c1116" : "#dfe6dc";
  const mediaSource = useMemo(() => (card.imageUrl ? { uri: card.imageUrl } : undefined), [card.imageUrl]);
  const [mediaFailed, setMediaFailed] = useState(false);
  const visibleMediaSource = mediaFailed ? undefined : mediaSource;

  useEffect(() => {
    setMediaFailed(false);
  }, [card.id, card.imageUrl]);

  const overlayTextShadow = isDark ? "rgba(0,0,0,0.44)" : "rgba(255,255,255,0.18)";
  const overlayTextShadowRadius = isDark ? 7 : 4;
  const titleColor = isDark ? "#ffffff" : "#101010";
  const bodyColor = isDark ? "rgba(255,255,255,0.84)" : "rgba(18,24,32,0.80)";
  const eyebrowColor = isDark ? "rgba(255,255,255,0.90)" : "rgba(12,18,28,0.78)";

  const directOverlayPillBg = isStaticMap
    ? isDark
      ? "rgba(6,12,22,0.44)"
      : "rgba(255,255,255,0.84)"
    : isDark
      ? "rgba(7,10,14,0.24)"
      : "rgba(255,255,255,0.18)";
  const directOverlayPillBorder = isStaticMap
    ? isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(15,23,42,0.09)"
    : isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.12)";

  const modeChipBg = isStaticMap
    ? isDark
      ? "rgba(6,12,22,0.52)"
      : "rgba(255,255,255,0.92)"
    : isDark
      ? "rgba(10,16,24,0.36)"
      : "rgba(255,255,255,0.86)";
  const modeChipBorder = isStaticMap
    ? isDark
      ? "rgba(255,255,255,0.14)"
      : "rgba(15,23,42,0.08)"
    : isDark
      ? "rgba(255,255,255,0.16)"
      : "rgba(15,23,42,0.06)";

  const fallbackLines = useMemo(() => Array.from({ length: 8 }, (_, lineIndex) => lineIndex), []);

  const model = useMemo(
    () => ({
      modeLabel: card.modeLabel ?? mediaLabel(card.mediaKind),
      primaryContext: card.primaryContext ?? card.area,
      contextBadgeLabel: card.contextBadgeLabel ?? card.moodLabel,
      subtitle: card.subtitle ?? card.descriptor,
      visibleTags: card.tags.slice(0, 3),
      extraTagCount: Math.max(0, card.tags.length - 3),
    }),
    [card.area, card.contextBadgeLabel, card.descriptor, card.mediaKind, card.modeLabel, card.moodLabel, card.primaryContext, card.subtitle, card.tags]
  );

  return (
    <View style={[styles.card, { backgroundColor: mediaSurface }]}>
      {visibleMediaSource ? (
        <Image
          source={visibleMediaSource}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
          recyclingKey={card.id}
          onError={() => setMediaFailed(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallbackMedia, { backgroundColor: mediaSurface }]}>
          {fallbackLines.map((line) => (
            <View
              key={`fallback-line-${card.id}-${line}`}
              style={[
                styles.fallbackLine,
                {
                  top: 22 + line * 29,
                  left: `${8 + ((line * 11) % 42)}%`,
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                },
              ]}
            />
          ))}
          <View style={[styles.fallbackDot, { backgroundColor: card.accent }]} />
        </View>
      )}

      <LowerAtmosphere source={visibleMediaSource} isDark={isDark} mediaKind={card.mediaKind} />

      <View style={styles.contentLayer}>
        <View style={styles.topBar}>
          <View style={[styles.modeChip, { backgroundColor: modeChipBg, borderColor: modeChipBorder }]}>
            <Text style={[styles.modeChipText, { color: eyebrowColor }]}>{model.modeLabel}</Text>
          </View>
        </View>

        <View style={[styles.bottomOverlay, isStaticMap ? styles.bottomOverlayMap : null]}>
          {model.primaryContext || model.contextBadgeLabel ? (
            <View style={styles.eyebrowRow}>
              {model.primaryContext ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.eyebrow,
                    {
                      color: eyebrowColor,
                      textShadowColor: overlayTextShadow,
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: overlayTextShadowRadius,
                    },
                  ]}
                >
                  {model.primaryContext}
                </Text>
              ) : null}
              {model.contextBadgeLabel ? (
                <View style={[styles.metaPill, { backgroundColor: directOverlayPillBg, borderColor: directOverlayPillBorder }]}>
                  <Text numberOfLines={1} style={[styles.metaPillText, { color: eyebrowColor }]}>
                    {model.contextBadgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.captionBlock}>
            <Text
              numberOfLines={2}
              style={[
                styles.title,
                {
                  color: titleColor,
                  textShadowColor: overlayTextShadow,
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: overlayTextShadowRadius,
                },
              ]}
            >
              {card.title}
            </Text>
            {model.subtitle ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.subtitle,
                  {
                    color: bodyColor,
                    textShadowColor: overlayTextShadow,
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: overlayTextShadowRadius,
                  },
                ]}
              >
                {model.subtitle}
              </Text>
            ) : null}
          </View>

          {model.visibleTags.length ? (
            <View style={styles.footerRow}>
              {model.visibleTags.map((tag) => (
                <View key={`${card.id}-${tag}`} style={[styles.tagChip, { backgroundColor: directOverlayPillBg, borderColor: directOverlayPillBorder }]}>
                  <Text numberOfLines={1} style={[styles.tagText, { color: eyebrowColor }]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {model.extraTagCount > 0 ? (
                <View style={[styles.tagChip, { backgroundColor: directOverlayPillBg, borderColor: directOverlayPillBorder }]}>
                  <Text numberOfLines={1} style={[styles.tagText, { color: eyebrowColor }]}>
                    +{model.extraTagCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const HelloWhenPlaceCardDemo = memo(HelloWhenPlaceCardDemoInner);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: "hidden",
  },
  fallbackMedia: {
    overflow: "hidden",
  },
  fallbackLine: {
    position: "absolute",
    width: "62%",
    height: 18,
    borderRadius: 999,
    transform: [{ rotate: "-18deg" }],
  },
  fallbackDot: {
    position: "absolute",
    left: "50%",
    top: "37%",
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 999,
    opacity: 0.82,
  },
  atmosphereSlice: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  modeChip: {
    minHeight: 26,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "58%",
  },
  modeChipText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textTransform: "lowercase",
  },
  bottomOverlay: {
    alignSelf: "stretch",
    gap: 7,
    paddingRight: 8,
  },
  bottomOverlayMap: {
    paddingBottom: 2,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyebrow: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "42%",
  },
  metaPillText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
  },
  captionBlock: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    maxWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
  },
});

