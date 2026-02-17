import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Platform, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

type Intent = "UNDECIDED" | "SCROLL" | "SWIPE";

const { width: SCREEN_W } = Dimensions.get("window");

// ---- Tuning knobs ----
const LOCK_DISTANCE = 10; // px before we lock intent
const ANGLE_SCROLL_DEG = 60; // >60° => vertical-ish => scroll
const ANGLE_SWIPE_DEG = 35; // <35° => horizontal-ish => swipe

const CARD_SIZE = Math.min(320, Math.floor(SCREEN_W * 0.82));
const SWIPE_DISMISS_X = CARD_SIZE * 0.35; // distance to dismiss

function isBackslashDiagonal(dx: number, dy: number) {
  "worklet";
  return (dx > 0 && dy < 0) || (dx < 0 && dy > 0);
}

export default function SwipeLabScreen() {
  const initialCards = useMemo(
    () => [
      { id: "1", title: "Card 1" },
      { id: "2", title: "Card 2" },
      { id: "3", title: "Card 3" },
      { id: "4", title: "Card 4" },
    ],
    []
  );

  const [cards, setCards] = useState(initialCards);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const intent = useSharedValue<Intent>("UNDECIDED");

  const onDismissTop = () => setCards((prev) => prev.slice(1));

  const resetCard = () => {
    "worklet";
    tx.value = withSpring(0, { damping: 18, stiffness: 180 });
    ty.value = withSpring(0, { damping: 18, stiffness: 180 });
    intent.value = "UNDECIDED";
  };

  const dismissCard = (direction: "left" | "right") => {
    "worklet";
    const targetX = direction === "right" ? SCREEN_W * 1.2 : -SCREEN_W * 1.2;
    tx.value = withSpring(targetX, { damping: 18, stiffness: 140 }, (fin) => {
      if (fin) {
        tx.value = 0;
        ty.value = 0;
        intent.value = "UNDECIDED";
        runOnJS(onDismissTop)();
      }
    });
    ty.value = withSpring(ty.value * 1.1, { damping: 18, stiffness: 140 });
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      intent.value = "UNDECIDED";
    })
    .onUpdate((e) => {
      const dx = e.translationX;
      const dy = e.translationY;

      if (intent.value === "UNDECIDED") {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);

        if (Math.hypot(ax, ay) < LOCK_DISTANCE) return;

        const angle = (Math.atan2(ay, ax) * 180) / Math.PI; // 0=horizontal, 90=vertical

        if (angle > ANGLE_SCROLL_DEG) {
          intent.value = "SCROLL";
          return;
        }

        if (angle < ANGLE_SWIPE_DEG) {
          intent.value = "SWIPE";
        } else {
          // diagonal band: only swipe if "\" corridor
          intent.value = isBackslashDiagonal(dx, dy) ? "SWIPE" : "SCROLL";
          if (intent.value === "SCROLL") return;
        }
      }

      if (intent.value === "SWIPE") {
        tx.value = dx;
        const allowFullDiagonal = isBackslashDiagonal(dx, dy);
        ty.value = allowFullDiagonal ? dy : dy * 0.35;
      }
    })
    .onEnd((e) => {
      if (intent.value !== "SWIPE") {
        intent.value = "UNDECIDED";
        return;
      }

      const dx = tx.value;
      const vx = e.velocityX;

      const shouldDismiss =
        Math.abs(dx) > SWIPE_DISMISS_X || Math.abs(vx) > 900;

      if (shouldDismiss) {
        dismissCard(dx >= 0 ? "right" : "left");
      } else {
        resetCard();
      }
    });

    useEffect(() => {
        // This should exist in a proper native reanimated setup
        console.log("Reanimated native?", !!(global as any)._REANIMATED_VERSION);
        console.log("Platform:", Platform.OS);
    }, []);

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = (tx.value / SCREEN_W) * 8; // degrees
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotateZ: `${rotate}deg` },
      ],
    };
  });

  const stack = cards.slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0b0c" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      scrollEventThrottle={16}
    >
      <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
        Swipe Controls Lab
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, lineHeight: 20 }}>
        • Horizontal-ish OR "\" diagonal = move card{"\n"}
        • Vertical-ish = scroll page{"\n"}
        • Intent locks after ~{LOCK_DISTANCE}px
      </Text>

      <View style={{ height: 24 }} />

      <View
        style={{
          height: CARD_SIZE + 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: CARD_SIZE, height: CARD_SIZE, position: "relative" }}>
          {stack
            .map((c, i) => ({ ...c, index: i }))
            .reverse()
            .map((c) => {
              const isTop = c.index === 0;
              const offset = c.index * 8;

              const baseStyle = {
                position: "absolute" as const,
                left: 0,
                top: 0,
                width: CARD_SIZE,
                height: CARD_SIZE,
                borderRadius: 18,
                backgroundColor: "#15161a",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                padding: 16,
                justifyContent: "space-between" as const,
              };

              if (!isTop) {
                return (
                  <View
                    key={c.id}
                    style={[
                      baseStyle,
                      {
                        transform: [
                          { translateY: offset },
                          { scale: 1 - c.index * 0.03 },
                        ],
                        opacity: 0.9,
                      },
                    ]}
                  >
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                      {c.title}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.65)" }}>
                      (Stack card)
                    </Text>
                  </View>
                );
              }

              return (
                <GestureDetector key={c.id} gesture={pan}>
                  <Animated.View style={[baseStyle, topCardStyle]}>
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
                      {c.title} (Top)
                    </Text>

                    <View>
                      <Text style={{ color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>
                        Try:
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.65)", lineHeight: 18 }}>
                        • drag mostly vertical → scroll{"\n"}
                        • drag mostly horizontal → swipe{"\n"}
                        • drag along "\" diagonal → swipe{"\n"}
                        • drag along "/" diagonal → scroll (by design)
                      </Text>
                    </View>
                  </Animated.View>
                </GestureDetector>
              );
            })}
        </View>
      </View>

      <View style={{ height: 28 }} />

      <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
        Scroll content below
      </Text>

      {Array.from({ length: 18 }).map((_, idx) => (
        <View
          key={idx}
          style={{
            height: 56,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            marginTop: 10,
            justifyContent: "center",
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.75)" }}>
            Row #{idx + 1}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
