import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { OnboardingGuideSlide } from "./onboardingGuide.slides";

type OnboardingImageMode = "light" | "dark";

type OnboardingImageBackgrounds = Record<OnboardingGuideSlide["illustrationKey"], string>;

type IllustrationProps = {
  slide: OnboardingGuideSlide;
  mode: OnboardingImageMode;
  backgroundColor: string;
  large?: boolean;
  frameSize?: number;
};

const ONBOARDING_IMAGE_ASSETS: Record<OnboardingImageMode, Record<OnboardingGuideSlide["illustrationKey"], number>> = {
  light: {
    welcome: require("@/assets/images/onboarding/light/welcome-trade-match-light.png"),
    createNeed: require("@/assets/images/onboarding/light/create-need-light.png"),
    createOffer: require("@/assets/images/onboarding/light/create-offer-light.png"),
    discoverTrades: require("@/assets/images/onboarding/light/discover-trades-light.png"),
    sendProposal: require("@/assets/images/onboarding/light/send-proposal-light.png"),
    staySafe: require("@/assets/images/onboarding/light/stay-safe-light.png"),
    accountGuide: require("@/assets/images/onboarding/light/account-guide-light.png"),
  },
  dark: {
    welcome: require("@/assets/images/onboarding/dark/welcome-trade-match-dark.png"),
    createNeed: require("@/assets/images/onboarding/dark/create-need-dark.png"),
    createOffer: require("@/assets/images/onboarding/dark/create-offer-dark.png"),
    discoverTrades: require("@/assets/images/onboarding/dark/discover-trades-dark.png"),
    sendProposal: require("@/assets/images/onboarding/dark/send-proposal-dark.png"),
    staySafe: require("@/assets/images/onboarding/dark/stay-safe-dark.png"),
    accountGuide: require("@/assets/images/onboarding/dark/account-guide-dark.png"),
  },
};

const ONBOARDING_IMAGE_BACKGROUNDS: Record<OnboardingImageMode, OnboardingImageBackgrounds> = {
  light: {
    welcome: "#FEFEFE",
    createNeed: "#FEFEFE",
    createOffer: "#FAF8F7",
    discoverTrades: "#FCFCFC",
    sendProposal: "#FEFEFE",
    staySafe: "#FDFDFD",
    accountGuide: "#FEFEFE",
  },
  dark: {
    welcome: "#0A1224",
    createNeed: "#0B0F18",
    createOffer: "#030A15",
    discoverTrades: "#081225",
    sendProposal: "#060D19",
    staySafe: "#020617",
    accountGuide: "#090D16",
  },
};

export function getOnboardingImageBackground(
  mode: OnboardingImageMode,
  illustrationKey: OnboardingGuideSlide["illustrationKey"]
) {
  return ONBOARDING_IMAGE_BACKGROUNDS[mode][illustrationKey];
}

export function OnboardingSlideIllustration({
  slide,
  mode,
  backgroundColor,
  large = false,
  frameSize,
}: IllustrationProps) {
  const source = ONBOARDING_IMAGE_ASSETS[mode][slide.illustrationKey];

  return (
    <View
      style={[
        styles.frame,
        large ? styles.frameLarge : null,
        frameSize ? { width: frameSize, height: frameSize } : null,
        { backgroundColor },
      ]}
    >
      <Image
        source={source}
        contentFit="contain"
        transition={120}
        accessibilityRole="image"
        accessibilityLabel={`${slide.title} onboarding illustration`}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1,
    alignSelf: "center",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  frameLarge: {
    width: "44%",
    maxWidth: 560,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
