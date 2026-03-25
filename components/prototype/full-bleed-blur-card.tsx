import React from "react";
import { ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Image, type ImageProps } from "expo-image";

type FullBleedBlurCardProps = {
  source: ImageProps["source"];
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  radius?: number;
  blurStartPercent?: number;
  blurSlices?: number;
  maxBlurRadius?: number;
  bottomTint?: string;
  tintStrength?: number;
};

/**
 * Reusable prototype card:
 * - full-bleed background image
 * - no border stroke
 * - soft blur-like transition that ramps in from invisible to visible
 *
 * The ramp uses many low-opacity clipped slices with eased progression,
 * which keeps the effect portable without relying on extra gradient packages.
 */
export function FullBleedBlurCard({
  source,
  title,
  subtitle,
  style,
  imageStyle,
  radius = 28,
  blurStartPercent = 50,
  blurSlices = 22,
  maxBlurRadius = 28,
  bottomTint = "rgba(8,10,12,0.46)",
  tintStrength = 0.9,
}: FullBleedBlurCardProps) {
  const safeStart = Math.max(0, Math.min(92, blurStartPercent));
  const overlayHeight = 100 - safeStart;
  const sliceHeight = overlayHeight / blurSlices;

  return (
    <View style={[styles.card, { borderRadius: radius }, style]}>
      <Image
        source={source}
        contentFit="cover"
        transition={180}
        style={[StyleSheet.absoluteFillObject, imageStyle]}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {Array.from({ length: blurSlices }, (_, index) => {
          const progress = (index + 1) / blurSlices;
          const eased = progress * progress * (3 - 2 * progress); // smoothstep
          const top = safeStart + index * sliceHeight;
          const blurOpacity = eased * 0.9;
          const tintOpacity = eased * tintStrength;

          return (
            <React.Fragment key={`blur-slice-${index}`}>
              <View
                style={[
                  styles.slice,
                  {
                    top: `${top}%`,
                    height: `${sliceHeight}%`,
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
                  styles.slice,
                  {
                    top: `${top}%`,
                    height: `${sliceHeight}%`,
                    backgroundColor: bottomTint,
                    opacity: tintOpacity,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}
      </View>

      {(title || subtitle) ? (
        <View style={styles.content}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: "#0b0d0e",
    borderWidth: 0,
  },
  slice: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
    gap: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});
