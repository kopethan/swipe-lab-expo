import React, { memo, useMemo } from "react";
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

const BLUR_SLICE_COUNT = 20;

type LowerAtmosphereProps = {
  source?: { uri: string };
  accent: string;
  isDark: boolean;
  mediaKind: DemoPlaceMediaKind;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function LowerAtmosphere({ source, accent, isDark, mediaKind }: LowerAtmosphereProps) {
  const slices = useMemo(() => Array.from({ length: BLUR_SLICE_COUNT }, (_, index) => index), []);
  const isStaticMap = mediaKind === "static_map";
  const tintBase = isDark
    ? isStaticMap
      ? "rgba(3,5,8,0.74)"
      : "rgba(4,6,9,0.64)"
    : isStaticMap
      ? "rgba(255,255,255,0.76)"
      : "rgba(255,255,255,0.56)";
  const bottomVeil = isDark
    ? isStaticMap
      ? "rgba(2,4,7,0.80)"
      : "rgba(2,4,7,0.64)"
    : isStaticMap
      ? "rgba(255,255,255,0.72)"
      : "rgba(255,255,255,0.48)";
  const midVeil = isDark
    ? isStaticMap
      ? "rgba(4,7,12,0.24)"
      : "rgba(4,7,12,0.16)"
    : isStaticMap
      ? "rgba(255,255,255,0.18)"
      : "rgba(255,255,255,0.10)";

  return (
    <View pointerEvents="none" style={[styles.lowerAtmosphere, { height: isStaticMap ? "58%" : "54%" }]}>
      {source ? (
        slices.map((slice) => {
          const progress = (slice + 1) / BLUR_SLICE_COUNT;
          const eased = progress * progress * (3 - 2 * progress);
          const sliceHeight = 100 / BLUR_SLICE_COUNT;
          const blurOpacity = clamp((eased - 0.03) * (isStaticMap ? 0.84 : 0.76), 0, 1);
          const tintOpacity = clamp((eased - 0.06) * (isStaticMap ? 0.72 : 0.58), 0, 1);

          return (
            <React.Fragment key={`atmosphere-slice-${slice}`}>
              <View
                style={[
                  styles.atmosphereSlice,
                  {
                    top: `${slice * sliceHeight}%`,
                    height: `${sliceHeight + 5}%`,
                    opacity: blurOpacity,
                  },
                ]}
              >
                <Image
                  source={source}
                  contentFit="cover"
                  transition={0}
                  blurRadius={5 + eased * (isStaticMap ? 28 : 22)}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <View
                style={[
                  styles.atmosphereSlice,
                  {
                    top: `${slice * sliceHeight}%`,
                    height: `${sliceHeight + 5}%`,
                    backgroundColor: tintBase,
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
            { backgroundColor: isDark ? "rgba(3,5,8,0.46)" : "rgba(255,255,255,0.40)" },
          ]}
        />
      )}

      <View style={[styles.atmosphereFeather, styles.atmosphereFeatherTop, { backgroundColor: midVeil }]} />
      <View style={[styles.atmosphereFeather, styles.atmosphereFeatherBottom, { backgroundColor: bottomVeil }]} />
      <View
        style={[
          styles.atmosphereAccentWash,
          {
            backgroundColor: accent,
            opacity: isStaticMap ? 0.06 : 0.05,
          },
        ]}
      />
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
      {mediaSource ? (
        <Image
          source={mediaSource}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
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

      <View style={styles.topShade} />
      <LowerAtmosphere source={mediaSource} accent={card.accent} isDark={isDark} mediaKind={card.mediaKind} />

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
  topShade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "26%",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  lowerAtmosphere: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  atmosphereSlice: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  atmosphereFeather: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  atmosphereFeatherTop: {
    top: 0,
    height: "36%",
    opacity: 0.08,
  },
  atmosphereFeatherBottom: {
    bottom: 0,
    height: "62%",
    opacity: 0.74,
  },
  atmosphereAccentWash: {
    position: "absolute",
    left: "10%",
    right: "10%",
    bottom: "3%",
    height: "56%",
    borderRadius: 999,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
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
    gap: 8,
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
