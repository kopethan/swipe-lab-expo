import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

import { OnboardingActions } from "./OnboardingActions";
import { OnboardingProgress } from "./OnboardingProgress";
import { ONBOARDING_GUIDE_SLIDES } from "./onboardingGuide.slides";
import { OnboardingSlideIllustration } from "./OnboardingSlideIllustration";

type OnboardingGuideScreenProps = {
  replayMode?: boolean;
  onClose?: () => void;
};

export function OnboardingGuideScreen({ replayMode = false, onClose }: OnboardingGuideScreenProps) {
  const { palette } = useTheme();
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);

  const slide = ONBOARDING_GUIDE_SLIDES[currentIndex];
  const isLastSlide = currentIndex === ONBOARDING_GUIDE_SLIDES.length - 1;
  const isWideWeb = Platform.OS === "web" && width >= 760;
  const isCompactHeight = height < 700 && !isWideWeb;
  const maxContentWidth = isWideWeb ? Math.min(width - 64, 1120) : width >= 520 ? 430 : undefined;
  const mobileIllustrationHeight = isWideWeb
    ? undefined
    : Math.max(210, Math.min(isCompactHeight ? 250 : 310, height * 0.38));

  const surfaceForPrimaryText = useMemo(
    () => (palette.mode === "dark" ? "#050506" : "#FFFFFF"),
    [palette.mode]
  );

  const goBack = useCallback(() => setCurrentIndex((index) => Math.max(index - 1, 0)), []);
  const closeGuide = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    setIsSkipped(true);
  }, [onClose]);
  const goNext = useCallback(() => {
    if (isLastSlide) {
      closeGuide();
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, ONBOARDING_GUIDE_SLIDES.length - 1));
  }, [closeGuide, isLastSlide]);
  const skip = useCallback(() => closeGuide(), [closeGuide]);
  const restart = useCallback(() => {
    setCurrentIndex(0);
    setIsSkipped(false);
  }, []);

  if (isSkipped) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={styles.doneWrap}>
          <View style={[styles.doneCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.doneTitle, { color: palette.text }]}>Guide closed</Text>
            <Text style={[styles.doneBody, { color: palette.muted }]}>
              {replayMode
                ? "The replay guide closes without changing the first-run seen flag."
                : "In the real app, this would mark the versioned onboarding flag as seen."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Replay onboarding guide lab"
              onPress={restart}
              style={({ pressed }) => [
                styles.doneButton,
                { backgroundColor: palette.text },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.doneButtonText, { color: surfaceForPrimaryText }]}>Replay guide</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, isWideWeb ? styles.screenWeb : null, { backgroundColor: palette.background }]}>
      <View style={[styles.topBar, isWideWeb ? styles.topBarWide : null, { maxWidth: maxContentWidth }]}>
        <Text style={[styles.brand, { color: palette.text }]}>Hellowhen</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding guide"
          onPress={skip}
          style={({ pressed }) => [styles.topSkip, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.topSkipText, { color: palette.muted }]}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWideWeb ? styles.scrollContentWide : null,
          { maxWidth: maxContentWidth, paddingTop: isCompactHeight ? 12 : isWideWeb ? 24 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.slideWrap, isWideWeb ? styles.slideWrapWide : null]}>
          <OnboardingSlideIllustration
            slide={slide}
            large={isWideWeb}
            frameHeight={mobileIllustrationHeight}
            textColor={palette.text}
            mutedColor={palette.muted}
            surfaceColor={palette.surface}
            surfaceAltColor={palette.surfaceAlt}
            borderColor={palette.border}
          />

          <Text style={[styles.caption, { color: palette.muted }]}>{slide.illustrationCaption}</Text>

          <View
            style={[
              styles.copyWrap,
              isCompactHeight ? styles.copyWrapCompact : null,
              isWideWeb
                ? [
                    styles.copyCardWide,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]
                : null,
            ]}
          >
            {isWideWeb ? (
              <Text style={[styles.progressBadge, { color: palette.muted, borderColor: palette.border }]}>
                {currentIndex + 1} / {ONBOARDING_GUIDE_SLIDES.length}
              </Text>
            ) : (
              <Text style={[styles.mobileProgressText, { color: palette.text }]}>
                {currentIndex + 1} / {ONBOARDING_GUIDE_SLIDES.length}
              </Text>
            )}
            <Text style={[styles.title, isWideWeb ? styles.titleWide : null, { color: palette.text }]}>
              {slide.title}
            </Text>
            <Text style={[styles.body, isWideWeb ? styles.bodyWide : null, { color: palette.muted }]}>
              {slide.body}
            </Text>
            {isWideWeb ? (
              <OnboardingProgress
                currentIndex={currentIndex}
                total={ONBOARDING_GUIDE_SLIDES.length}
                textColor={palette.text}
                mutedColor={palette.muted}
                align="start"
                onSelect={setCurrentIndex}
              />
            ) : null}
          </View>
          {!isWideWeb ? (
            <OnboardingProgress
              currentIndex={currentIndex}
              total={ONBOARDING_GUIDE_SLIDES.length}
              textColor={palette.text}
              mutedColor={palette.muted}
              onSelect={setCurrentIndex}
            />
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          isWideWeb ? styles.bottomBarWide : null,
          {
            backgroundColor: palette.background,
            borderTopColor: palette.border,
            maxWidth: maxContentWidth,
          },
        ]}
      >
        <View style={isWideWeb ? styles.actionsWide : null}>
          <OnboardingActions
            canGoBack={currentIndex > 0}
            isLastSlide={isLastSlide}
            onBack={goBack}
            onNext={goNext}
            onSkip={skip}
            showSkipBottom={false}
            textColor={palette.text}
            mutedColor={palette.muted}
            surfaceColor={surfaceForPrimaryText}
            borderColor={palette.border}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenWeb: {
    minHeight: "100vh" as any,
  },
  topBar: {
    width: "100%",
    minHeight: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarWide: {
    alignSelf: "center",
    minHeight: 64,
    paddingHorizontal: 0,
  },
  brand: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  topSkip: {
    minHeight: 42,
    minWidth: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  topSkipText: {
    fontSize: 14,
    fontWeight: "900",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  scrollContentWide: {
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  slideWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
  },
  slideWrapWide: {
    minHeight: "68vh" as any,
    flexDirection: "row",
    alignItems: "center",
    gap: 48,
  },
  caption: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  copyWrap: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 8,
  },
  copyWrapCompact: {
    paddingTop: 0,
    gap: 7,
  },
  copyCardWide: {
    flex: 0.82,
    minHeight: 360,
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 34,
    borderWidth: 1,
    padding: 38,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  progressBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    overflow: "hidden",
  },
  mobileProgressText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    textAlign: "center",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  titleWide: {
    textAlign: "left",
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -1.2,
  },
  body: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  bodyWide: {
    textAlign: "left",
    fontSize: 18,
    lineHeight: 27,
  },
  bottomBar: {
    width: "100%",
    alignSelf: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 12,
    gap: 14,
  },
  bottomBarWide: {
    alignItems: "flex-end",
    borderTopWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 28,
  },
  actionsWide: {
    width: "100%",
    maxWidth: 520,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  doneCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 13,
  },
  doneTitle: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  doneBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  doneButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
});
