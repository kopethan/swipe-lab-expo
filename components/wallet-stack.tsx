import React, { useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
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
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));

  // Prevent rapid re-entrancy (wheel + drag, etc.).
  const animatingRef = useRef(false);

  const PEEK = 18;
  const THRESH = 84;
  const EXIT = Math.min(cardHeight * 0.35, 220);

  const dragY = useSharedValue(0);

  const visible = useMemo(() => {
    const top = order.slice(0, maxVisible);
    const last = order[order.length - 1];
    if (last != null && !top.includes(last)) return [...top, last];
    return top;
  }, [order, maxVisible]);

  const rotateNext = () => {
    setOrder((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(1).concat(prev[0]);
    });
  };
  const rotatePrev = () => {
    setOrder((prev) => {
      if (prev.length <= 1) return prev;
      const last = prev[prev.length - 1];
      return [last, ...prev.slice(0, -1)];
    });
  };

  const commit = (dir: "next" | "prev") => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const target = dir === "next" ? -EXIT : EXIT;
    dragY.value = withTiming(
      target,
      { duration: 240, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(dir === "next" ? rotateNext : rotatePrev)();
        }
        dragY.value = 0;
        runOnJS(() => {
          animatingRef.current = false;
        })();
      }
    );
  };

  // Web wheel -> next/prev (discrete).
  const wheelAcc = useRef(0);
  const onWheel = (e: any) => {
    // RN-web uses a synthetic event; prevent page scroll when interacting with the deck.
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const dy = Number(e?.deltaY ?? 0);
    wheelAcc.current += dy;

    if (Math.abs(wheelAcc.current) > 70) {
      const dir = wheelAcc.current > 0 ? "next" : "prev";
      wheelAcc.current = 0;
      commit(dir);
    }
  };

  // Drag handle -> next/prev (smooth threshold).
  const pan = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((ev) => {
        if (animatingRef.current) return;
        // Clamp to avoid absurd drags.
        dragY.value = clamp(ev.translationY, -EXIT, EXIT);
      })
      .onEnd(() => {
        if (animatingRef.current) return;
        const y = dragY.value;
        if (y < -THRESH) {
          commit("next");
          return;
        }
        if (y > THRESH) {
          commit("prev");
          return;
        }
        dragY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      });
  }, [EXIT, THRESH]);

  return (
    <View
      style={[
        styles.stage,
        {
          height: cardHeight + (maxVisible - 1) * PEEK,
        },
      ]}
      // @ts-expect-error RN-web supports onWheel on View
      onWheel={Platform.OS === "web" ? onWheel : undefined}
    >
      {visible.map((cardIndex, renderPos) => {
        // renderPos is *visual* stack position for what we render.
        const stackPos = Math.min(renderPos, maxVisible - 1);
        const isTop = renderPos === 0;
        const spec = cards[cardIndex];

        const cardStyle = useAnimatedStyle(() => {
          const y = dragY.value;
          const tNext = clamp(-y / THRESH, 0, 1);
          const tPrev = clamp(y / THRESH, 0, 1);
          const t = y < 0 ? tNext : tPrev;

          // Default “peeking” base.
          const baseY = stackPos * PEEK;
          const baseScale = 1 - stackPos * 0.035;
          const baseOpacity = 1 - stackPos * 0.12;

          // During drag, shift stack slightly to preview next/prev.
          // Top follows finger/wheel impulse.
          let ty = baseY;
          if (isTop) {
            ty = y;
          } else {
            // When going next, cards move up one slot.
            // When going prev, cards move down one slot.
            const dir = y < 0 ? -1 : 1;
            const targetPos = clamp(stackPos + dir, 0, maxVisible - 1);
            const targetY = targetPos * PEEK;
            ty = baseY + (targetY - baseY) * t;
          }

          // Fade the top card as it leaves, to sell the “swap”.
          const topFade = isTop
            ? interpolate(Math.abs(y), [0, EXIT * 0.85], [1, 0.0])
            : baseOpacity;

          return {
            transform: [{ translateY: ty }, { scale: isTop ? 1 : baseScale }],
            opacity: isTop ? topFade : baseOpacity,
          };
        }, [PEEK, THRESH, EXIT, maxVisible]);

        return (
          <Animated.View
            key={spec.key}
            style={[
              styles.card,
              {
                height: cardHeight,
                zIndex: 100 - renderPos,
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                backgroundColor: isDark ? "rgba(30,30,30,0.92)" : "rgba(255,255,255,0.92)",
              },
              cardStyle,
            ]}
            pointerEvents={isTop ? "auto" : "none"}
          >
            {/* Handle (always visible) */}
            <GestureDetector gesture={pan}>
              <View
                style={[
                  styles.handleRow,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" },
                ]}
              >
                <View
                  style={[
                    styles.handleDot,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)" },
                  ]}
                />
                <View
                  style={[
                    styles.handleDot,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)" },
                  ]}
                />
                <View
                  style={[
                    styles.handleDot,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)" },
                  ]}
                />
              </View>
            </GestureDetector>

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
                  {renderPos === 0 ? "Active" : ""}
                </Animated.Text>
              </View>
            </View>

            {/* Body (top card only) */}
            <View style={styles.body}>{isTop ? spec.render() : null}</View>
          </Animated.View>
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
  card: {
    position: "absolute",
    width: "92%",
    maxWidth: 720,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  handleRow: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  handleDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
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
});
