import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { OnboardingGuideSlide } from "./onboardingGuide.slides";

type IllustrationProps = {
  slide: OnboardingGuideSlide;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  surfaceAltColor: string;
  borderColor: string;
  large?: boolean;
  frameHeight?: number;
};

export function OnboardingSlideIllustration({
  slide,
  textColor,
  mutedColor,
  surfaceColor,
  surfaceAltColor,
  borderColor,
  large = false,
  frameHeight,
}: IllustrationProps) {
  const colors = { textColor, mutedColor, surfaceColor, surfaceAltColor, borderColor };

  return (
    <View
      style={[
        styles.frame,
        large ? styles.frameLarge : null,
        frameHeight ? { height: frameHeight } : null,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      {renderIllustration(slide.illustrationKey, colors)}
    </View>
  );
}

function renderIllustration(
  key: OnboardingGuideSlide["illustrationKey"],
  colors: Pick<IllustrationProps, "textColor" | "mutedColor" | "surfaceColor" | "surfaceAltColor" | "borderColor">
) {
  switch (key) {
    case "welcome":
      return <WelcomeScene {...colors} />;
    case "createNeed":
      return <CreateItemScene kind="NEED" {...colors} />;
    case "createOffer":
      return <CreateItemScene kind="OFFER" {...colors} />;
    case "discoverTrades":
      return <DiscoverTradesScene {...colors} />;
    case "sendProposal":
      return <ProposalScene {...colors} />;
    case "staySafe":
      return <SafetyScene {...colors} />;
    case "accountGuide":
      return <AccountScene {...colors} />;
    default:
      return null;
  }
}

function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "need" | "offer" | "safe" }) {
  const isNeed = tone === "need";
  const isOffer = tone === "offer";
  const isSafe = tone === "safe";
  return (
    <View
      style={[
        styles.badge,
        isNeed ? styles.needBadge : null,
        isOffer ? styles.offerBadge : null,
        isSafe ? styles.safeBadge : null,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function FakeLine({ width = "72%", opacity = 1 }: { width?: `${number}%`; opacity?: number }) {
  return <View style={[styles.fakeLine, { width, opacity }]} />;
}

function MiniImage({ plus = false }: { plus?: boolean }) {
  return (
    <View style={styles.miniImage}>
      <Text style={styles.miniImageText}>{plus ? "+" : ""}</Text>
    </View>
  );
}

function WelcomeScene({ textColor, borderColor }: Pick<IllustrationProps, "textColor" | "borderColor">) {
  return (
    <View style={styles.sceneCenter}>
      <View style={[styles.matchCard, styles.matchNeedCard, { borderColor }]}>
        <Badge label="NEED" tone="need" />
        <Text style={[styles.cardTitle, { color: textColor }]}>Landing page</Text>
        <FakeLine width="70%" />
        <FakeLine width="46%" opacity={0.55} />
      </View>

      <View style={styles.exchangeCircle}>
        <Text style={styles.exchangeText}>{"<->"}</Text>
      </View>

      <View style={[styles.matchCard, styles.matchOfferCard, { borderColor }]}>
        <Badge label="OFFER" tone="offer" />
        <Text style={[styles.cardTitle, { color: textColor }]}>Product photos</Text>
        <FakeLine width="76%" />
        <FakeLine width="52%" opacity={0.55} />
      </View>
    </View>
  );
}

function CreateItemScene({
  kind,
  textColor,
  borderColor,
}: Pick<IllustrationProps, "textColor" | "borderColor"> & { kind: "NEED" | "OFFER" }) {
  const isNeed = kind === "NEED";
  return (
    <View style={styles.sceneCenter}>
      <View style={[styles.formCard, { borderColor }]}>
        <View style={styles.formTopRow}>
          <Badge label={kind} tone={isNeed ? "need" : "offer"} />
          <View style={styles.formPill} />
        </View>
        <Text style={[styles.formTitle, { color: textColor }]}>
          {isNeed ? "I need help with..." : "I can offer..."}
        </Text>
        <FakeLine width="88%" />
        <FakeLine width="64%" opacity={0.58} />
        <View style={styles.chipRow}>
          <View style={styles.chip} />
          <View style={[styles.chip, styles.chipShort]} />
          <View style={[styles.chip, styles.chipMini]} />
        </View>
        <View style={styles.imageRow}>
          <MiniImage />
          <MiniImage />
          <MiniImage plus />
        </View>
      </View>
    </View>
  );
}

function DiscoverTradesScene({ textColor, borderColor }: Pick<IllustrationProps, "textColor" | "borderColor">) {
  return (
    <View style={styles.deckScene}>
      <View style={[styles.deckBack, styles.deckBackThree, { borderColor }]} />
      <View style={[styles.deckBack, styles.deckBackTwo, { borderColor }]} />
      <View style={[styles.deckBack, styles.deckBackOne, { borderColor }]} />
      <View style={[styles.deckFront, { borderColor }]}>
        <Badge label="TRADE 01/04" />
        <Text style={[styles.deckTitle, { color: textColor }]}>Design help</Text>
        <View style={styles.tradePair}>
          <Text style={styles.tradeLabel}>Need</Text>
          <Text style={styles.tradeArrow}>{"<->"}</Text>
          <Text style={styles.tradeLabel}>Offer</Text>
        </View>
        <View style={styles.deckBlurBlock}>
          <FakeLine width="74%" />
          <FakeLine width="48%" opacity={0.55} />
        </View>
      </View>
    </View>
  );
}

function ProposalScene({ textColor, borderColor }: Pick<IllustrationProps, "textColor" | "borderColor">) {
  return (
    <View style={styles.proposalScene}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar} />
        <View style={[styles.privateBadge, { borderColor }]}>
          <Text style={styles.privateBadgeText}>PRIVATE</Text>
        </View>
        <View style={styles.avatar} />
      </View>
      <View style={[styles.messageCard, { borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Proposal sent</Text>
        <FakeLine width="82%" />
        <FakeLine width="58%" opacity={0.55} />
      </View>
      <View style={[styles.replyBubble, { borderColor }]}>
        <Text style={styles.replyText}>I can help by Friday.</Text>
      </View>
    </View>
  );
}

function SafetyScene({ textColor, borderColor }: Pick<IllustrationProps, "textColor" | "borderColor">) {
  return (
    <View style={styles.safetyScene}>
      <View style={styles.shield}>
        <Text style={styles.shieldText}>OK</Text>
      </View>
      <View style={[styles.checklist, { borderColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Safety checklist</Text>
        <ChecklistRow label="Agree clearly" />
        <ChecklistRow label="Keep details here" />
        <ChecklistRow label="Report problems" />
      </View>
      <Badge label="SAFE" tone="safe" />
    </View>
  );
}

function ChecklistRow({ label }: { label: string }) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkDot}>
        <Text style={styles.checkDotText}>OK</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

function AccountScene({ textColor, borderColor }: Pick<IllustrationProps, "textColor" | "borderColor">) {
  const rows = ["Profile", "Settings", "Support", "User Guide"];
  return (
    <View style={styles.sceneCenter}>
      <View style={[styles.accountCard, { borderColor }]}>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar} />
          <View style={styles.profileText}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Account</Text>
            <FakeLine width="70%" opacity={0.65} />
          </View>
        </View>
        {rows.map((row) => (
          <View key={row} style={styles.accountRow}>
            <View style={styles.rowIcon} />
            <Text style={styles.accountLabel}>{row}</Text>
            <Text style={styles.accountChevron}>{">"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1.04,
    maxHeight: 360,
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  frameLarge: {
    aspectRatio: 1.18,
    maxHeight: 620,
    borderRadius: 44,
    padding: 44,
  },
  glowOne: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(102, 230, 255, 0.14)",
    top: -62,
    right: -48,
  },
  glowTwo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: "rgba(255, 210, 112, 0.11)",
    bottom: -82,
    left: -66,
  },
  sceneCenter: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  needBadge: {
    backgroundColor: "rgba(83, 206, 255, 0.18)",
    borderColor: "rgba(83, 206, 255, 0.42)",
  },
  offerBadge: {
    backgroundColor: "rgba(255, 209, 102, 0.18)",
    borderColor: "rgba(255, 209, 102, 0.44)",
  },
  safeBadge: {
    backgroundColor: "rgba(90, 220, 154, 0.18)",
    borderColor: "rgba(90, 220, 154, 0.44)",
  },
  badgeText: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  fakeLine: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginTop: 9,
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  matchCard: {
    width: "70%",
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
  },
  matchNeedCard: {
    alignSelf: "flex-start",
    transform: [{ rotate: "-4deg" }],
  },
  matchOfferCard: {
    alignSelf: "flex-end",
    transform: [{ rotate: "4deg" }],
  },
  exchangeCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -5,
    zIndex: 3,
  },
  exchangeText: {
    color: "#08080A",
    fontSize: 24,
    fontWeight: "900",
  },
  formCard: {
    width: "82%",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 17,
  },
  formTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formPill: {
    width: 44,
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  formTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  chip: {
    width: 70,
    height: 23,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  chipShort: {
    width: 54,
  },
  chipMini: {
    width: 38,
  },
  imageRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  miniImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniImageText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 22,
    fontWeight: "900",
  },
  deckScene: {
    width: "86%",
    aspectRatio: 0.92,
    alignItems: "center",
    justifyContent: "center",
  },
  deckBack: {
    position: "absolute",
    width: "82%",
    height: "82%",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  deckBackThree: {
    transform: [{ translateX: 22 }, { translateY: 22 }],
    opacity: 0.5,
  },
  deckBackTwo: {
    transform: [{ translateX: 14 }, { translateY: 14 }],
    opacity: 0.72,
  },
  deckBackOne: {
    transform: [{ translateX: 6 }, { translateY: 6 }],
    opacity: 0.88,
  },
  deckFront: {
    width: "82%",
    height: "82%",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 17,
    justifyContent: "space-between",
  },
  deckTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  tradePair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  tradeLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "900",
  },
  tradeArrow: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 26,
    fontWeight: "900",
  },
  deckBlurBlock: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  proposalScene: {
    width: "86%",
    height: "86%",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "84%",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  privateBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  privateBadgeText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  messageCard: {
    width: "82%",
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.11)",
    padding: 16,
  },
  replyBubble: {
    alignSelf: "flex-end",
    maxWidth: "76%",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: "rgba(83, 206, 255, 0.17)",
  },
  replyText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },
  safetyScene: {
    width: "86%",
    height: "88%",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  shield: {
    width: 88,
    height: 98,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(90, 220, 154, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(90, 220, 154, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldText: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 38,
    fontWeight: "900",
  },
  checklist: {
    width: "86%",
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(90, 220, 154, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDotText: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 8,
    fontWeight: "900",
  },
  checkLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
  },
  accountCard: {
    width: "84%",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 16,
    gap: 11,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 8,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  profileText: {
    flex: 1,
  },
  accountRow: {
    minHeight: 40,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginRight: 10,
  },
  accountLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "800",
  },
  accountChevron: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 20,
    fontWeight: "900",
    marginTop: -2,
  },
});
