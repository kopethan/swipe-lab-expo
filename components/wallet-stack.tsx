import React, { useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type WalletCardSpec = {
  key: string;
  title: string;
  /** Optional short summary shown on non-top cards. */
  summary?: string;
  render: () => React.ReactNode;
};

type Props = {
  cards: WalletCardSpec[];
  /** Height of the active card. If omitted, a reasonable default is used. */
  cardHeight?: number;
  /** Max cards visibly “peeking” behind. */
  maxVisible?: number;
};

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

/**
 * Wallet-style vertical card stack.
 * - Wheel (web) / drag handle (all): rotates cards next/prev.
 * - Loops infinitely (non-feed behavior): last can come to top when going backward.
 */
export function WalletStack({ cards, cardHeight = 520, maxVisible = 4 }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";
  const n = Math.max(1, cards.length);
  const [activeIndex, setActiveIndex] = useState(0);

  // Prevent rapid re-entrancy (wheel + drag, etc.).
  // Use a shared value so worklets can read it without runOnJS.
  const animLock = useSharedValue(0);

  // A single progress value drives the whole deck.
  // 0 = resting (current card on top)
  // +1 = fully advanced to next card
  // -1 = fully pulled back to previous card
  const progress = useSharedValue(0);

  // Tuning knobs (feel free to tweak).
  const PEEK = 18;
  const LIFT = 42;
  const EXIT = Math.min(cardHeight * 0.55, 330);

  // Hitbox height: let the TOP card capture wheel/drag even when the cursor is
  // over the exposed "peeking" area of background cards.
  // This fixes the feeling that the back card is being swiped.
  const hitboxHeight = cardHeight + maxVisible * PEEK + 36;

  // How far a vertical swipe must travel (in px) to reach a full +/-1 progress.
  // Lower = more sensitive.
  const DRAG_TO_PROGRESS = 210;
  const COMMIT_THRESH = 0.35;
  const WHEEL_TO_PROGRESS = 0.0018; // deltaY -> progress

  // We always render a small window around the active card:
  // prev (-1), active (0), and a few cards behind it (+1..).
  // Important: keep indices unique (avoid duplicate React keys when n is small).
  const offsets = useMemo(() => {
    if (n <= 1) return [0];
    const out: number[] = [-1, 0];
    const maxBehind = Math.min(maxVisible - 1, n - 2);
    for (let i = 1; i <= maxBehind; i++) out.push(i);
    return out;
  }, [maxVisible, n]);

  const rotate = (dir: "next" | "prev") => {
    setActiveIndex((prev) => {
      if (n <= 1) return prev;
      return dir === "next" ? (prev + 1) % n : (prev - 1 + n) % n;
    });
  };

  const unlockJS = () => {
    animLock.value = 0;
  };

  const commitTo = (target: -1 | 0 | 1) => {
    // JS entry-point for wheel snapping.
    if (animLock.value) return;
    animLock.value = 1;
    cancelAnimation(progress);
    progress.value = withTiming(
      target,
      { duration: 240, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && target !== 0) {
          runOnJS(rotate)(target === 1 ? "next" : "prev");
        }
        // Re-index instantly after commit (no visible jump because cards are keyed).
        progress.value = 0;
        runOnJS(unlockJS)();
      }
    );
  };

  const snapFromCurrent = () => {
    const p = progress.value;
    if (Math.abs(p) >= COMMIT_THRESH) {
      commitTo(p > 0 ? 1 : -1);
    } else {
      commitTo(0);
    }
  };

  // Web wheel -> continuous progress with smoothing + snap on idle.
  const wheelIdleTimer = useRef<any>(null);
  const onWheel = (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (animLock.value) return;
    const dy = Number(e?.deltaY ?? 0);
    cancelAnimation(progress);
    const nextTarget = clamp(progress.value + dy * WHEEL_TO_PROGRESS, -1, 1);
    progress.value = withTiming(nextTarget, { duration: 140, easing: Easing.out(Easing.cubic) });

    if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
    wheelIdleTimer.current = setTimeout(() => {
      snapFromCurrent();
    }, 120);
  };

  // Vertical swipe anywhere on the top card.
  // (No handle. Works for mouse-drag and touch on web/mobile-web.)
  const pan = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-30, 30])
      .minDistance(4)
      .onUpdate((ev) => {
        if (animLock.value) return;
        const p = clamp(-ev.translationY / DRAG_TO_PROGRESS, -1, 1);
        progress.value = p;
      })
      .onEnd(() => {
        if (animLock.value) return;
        const p = progress.value;
        const target: -1 | 0 | 1 = Math.abs(p) >= COMMIT_THRESH ? (p > 0 ? 1 : -1) : 0;
        animLock.value = 1;
        cancelAnimation(progress);
        progress.value = withTiming(
          target,
          { duration: 240, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished && target !== 0) {
              runOnJS(rotate)(target === 1 ? "next" : "prev");
            }
            progress.value = 0;
            animLock.value = 0;
          }
        );
      });
  }, [DRAG_TO_PROGRESS, COMMIT_THRESH]);

  return (
    <View
      style={[
        styles.stage,
        {
          height: hitboxHeight,
        },
        Platform.OS === "web" ? (styles as any).webStage : null,
      ]}
      // @ts-expect-error RN-web supports onWheel on View
      onWheel={Platform.OS === "web" ? onWheel : undefined}
    >
      {offsets
        // Render from back to front for nicer stacking (deep cards first).
        .slice()
        .sort((a, b) => b - a)
        .map((offset) => {
        const idx = (activeIndex + offset + n) % n;
        const spec = cards[idx];
        const isTop = offset === 0;

        const cardStyle = useAnimatedStyle(() => {
          const raw = progress.value;
          const p = clamp(raw, 0, 1);
          const q = clamp(-raw, 0, 1);

          const posY = (pos: number) => {
            "worklet";
            if (pos === -1) return -Math.min(PEEK * 2.2, 44);
            return clamp(pos, 0, maxVisible - 1) * PEEK;
          };

          const posScale = (pos: number) => {
            "worklet";
            if (pos === -1) return 0.985;
            return 1 - clamp(pos, 0, maxVisible - 1) * 0.03;
          };

          const posOpacity = (pos: number) => {
            "worklet";
            if (pos === -1) return 0.96;
            return 1 - clamp(pos, 0, maxVisible - 1) * 0.10;
          };

          // Base at rest.
          const y0 = posY(offset);
          const s0 = posScale(offset);
          const o0 = posOpacity(offset);

          // Forward (p): everything shifts up by one slot.
          // Backward (q): everything shifts down by one slot, and prev (-1) becomes top.
          let y = y0;
          let s = s0;
          let o = o0;

          if (p > 0) {
            if (offset === 0) {
              // Top card exits upward.
              y = interpolate(p, [0, 1], [0, -EXIT]);
              s = interpolate(p, [0, 1], [1, 0.985]);
              // Keep opacity high; only soften near the end.
              o = interpolate(p, [0, 0.85, 1], [1, 0.97, 0.92]);
            } else if (offset >= 1) {
              const y1 = posY(offset - 1);
              const s1 = posScale(offset - 1);
              const o1 = posOpacity(offset - 1);
              y = y0 + (y1 - y0) * p - (offset === 1 ? LIFT * p : 8 * p);
              s = s0 + (s1 - s0) * p;
              o = o0 + (o1 - o0) * p;
            } else {
              // prev card stays tucked above.
              y = y0;
              s = s0;
              o = o0;
            }
          } else if (q > 0) {
            if (offset === -1) {
              // Previous card slides down into the top.
              const y1 = posY(0);
              const s1 = posScale(0);
              const o1 = posOpacity(0);
              y = y0 + (y1 - y0) * q;
              s = s0 + (s1 - s0) * q;
              o = o0 + (o1 - o0) * q;
            } else if (offset === 0) {
              // Current top becomes second.
              const y1 = posY(1);
              const s1 = posScale(1);
              const o1 = posOpacity(1);
              y = y0 + (y1 - y0) * q + LIFT * q;
              s = s0 + (s1 - s0) * q;
              o = o0 + (o1 - o0) * q;
            } else if (offset >= 1) {
              const y1 = posY(offset + 1);
              const s1 = posScale(offset + 1);
              const o1 = posOpacity(offset + 1);
              y = y0 + (y1 - y0) * q;
              s = s0 + (s1 - s0) * q;
              o = o0 + (o1 - o0) * q;
            }
          }

          // zIndex rules:
          // - At rest / moving forward: current top (0) is above everything.
          // - When pulling backward (raw < 0): previous (-1) should come above.
          let z = 0;
          if (offset === 0) z = raw < 0 ? 200 : 300;
          else if (offset === -1) z = raw < 0 ? 310 : 150;
          else z = 200 - offset;

          return {
            transform: [{ translateY: y }, { scale: s }],
            opacity: o,
            zIndex: z,
          };
        }, [PEEK, LIFT, EXIT, maxVisible]);

        // Bold borders like feed cards: stronger on top, lighter behind.
        const borderA = offset === 0 ? 0.95 : offset === 1 ? 0.55 : offset === 2 ? 0.35 : offset === -1 ? 0.35 : 0.22;
        const borderColor = isDark
          ? `rgba(255,255,255,${Math.max(0, Math.min(0.5, borderA * 0.5))})`
          : `rgba(0,0,0,${Math.max(0, Math.min(0.22, borderA * 0.22))})`;

        const cardInner = (
          <Animated.View
            style={[
              styles.card,
              {
                height: cardHeight,
                borderColor,
                // Make the active card more opaque to avoid visual confusion
                // (seeing background card content through the top card).
                backgroundColor: isDark
                  ? `rgba(20,20,20,${offset === 0 ? 0.985 : 0.92})`
                  : `rgba(255,255,255,${offset === 0 ? 0.985 : 0.94})`,
              },
              (Platform.OS === "web" ? (styles as any).webCard : null) as any,
              cardStyle,
            ]}
            pointerEvents={isTop ? "auto" : "none"}
          >

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTextWrap}>
                <Animated.Text
                  style={[styles.title, { color: isDark ? "rgba(255,255,255,0.95)" : "#0b0d0e" }]}
                  numberOfLines={1}
                >
                  {spec.title}
                </Animated.Text>
                {!!spec.summary && !isTop && (
                  <Animated.Text
                    style={[
                      styles.summary,
                      { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" },
                    ]}
                    numberOfLines={1}
                  >
                    {spec.summary}
                  </Animated.Text>
                )}
              </View>
              <View
                style={[
                  styles.pill,
                  {
                    borderColor: isDark ? "rgba(46,229,255,0.35)" : "rgba(15,118,110,0.30)",
                    backgroundColor: isDark ? "rgba(46,229,255,0.10)" : "rgba(15,118,110,0.08)",
                  },
                ]}
              >
                <Animated.Text
                  style={[
                    styles.pillText,
                    { color: isDark ? "rgba(46,229,255,0.90)" : "rgba(15,118,110,0.95)" },
                  ]}
                >
                  {isTop ? "Active" : ""}
                </Animated.Text>
              </View>
            </View>

            {/* Body (top card only) */}
            <View style={styles.body}>{isTop ? spec.render() : null}</View>
          </Animated.View>
        );

        return isTop ? (
          <GestureDetector key={spec.key} gesture={pan}>
            <Animated.View
              style={[styles.hitbox, { height: hitboxHeight, zIndex: 9999 }]}
              pointerEvents="auto"
              // @ts-expect-error RN-web supports onWheel on View
              onWheel={Platform.OS === "web" ? onWheel : undefined}
            >
              {cardInner}
            </Animated.View>
          </GestureDetector>
        ) : (
          <React.Fragment key={spec.key}>{cardInner}</React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  hitbox: {
    position: "absolute",
    width: "92%",
    maxWidth: 720,
    borderRadius: 22,
    backgroundColor: "transparent",
  },
  card: {
    position: "absolute",
    width: "92%",
    maxWidth: 720,
    borderRadius: 22,
    borderWidth: 4,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextWrap: { flex: 1, paddingRight: 10 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summary: {
    marginTop: 2,
    fontSize: 12,
  },
  pill: {
    minWidth: 58,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  // RN-web extras
  webStage: {
    // Prevent browser scroll/pinch from stealing the gesture.
    // (RN-web will pass this through to the DOM.)
    // @ts-expect-error web-only
    touchAction: "none",
  },
  webCard: {
    // @ts-expect-error web-only
    boxShadow: "0 24px 60px rgba(0,0,0,0.40)",
  },
});
