import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Text, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Intent = "UNDECIDED" | "SCROLL" | "SWIPE_NEXT" | "SWIPE_PREV";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ---- Intent tuning ----
const LOCK_DISTANCE = 10; // px before we lock intent
const ANGLE_SWIPE_DEG = 40; // swipe is easier to win
const ANGLE_SCROLL_DEG = 72; // scroll requires stricter vertical
const VERTICAL_DOMINANCE = 1.6; // must be much more vertical to force scroll

// ---- Deck look ----
const BORDER_W = 4;
const RADIUS = 22;

// Back cards sit slightly bottom-right. Front card is most top-left and aligned at (0,0).
const STACK = [
  { dx: 18, dy: 18, z: 1, borderA: 0.22 },
  { dx: 12, dy: 12, z: 2, borderA: 0.35 },
  { dx: 6, dy: 6, z: 3, borderA: 0.55 },
  { dx: 0, dy: 0, z: 4, borderA: 0.95 },
];

function rgbaTeal(alpha: number) {
  return `rgba(44,229,255,${alpha})`;
}

// "\" diagonal: top-left -> bottom-right (dx and dy same sign)
function isBackslashDiagonal(dx: number, dy: number) {
  "worklet";
  return dx * dy > 0;
}

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

export default function SwipeLabScreen() {
  const router = useRouter();

  const scheme = useColorScheme();
  const isDark = scheme !== "light";
  const surface = isDark ? "#0b0d10" : "#ffffff";
  const text = isDark ? "#ffffff" : "#0a0a0a";
  const muted = isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.62)";

  const CARD_SIZE = Math.min(330, Math.floor(SCREEN_W * 0.88));

  // thresholds (px)
  const NEXT_DISMISS_X = CARD_SIZE * 0.32;
  const PREV_PULL_X = CARD_SIZE * 0.4;

  // diagonal rail strength for NEXT (always top-left)
  const RAIL_K = 0.7;

  // PREV: starts top-left (off-stage), comes diagonally into deck (toward 0,0)
  const PREV_START_X = -CARD_SIZE * 0.55;
  const PREV_START_Y = -Math.abs(PREV_START_X) * RAIL_K;

  const DISMISS_MS = 160;

  const cards = useMemo(
    () => [
      { id: "1", title: "Card 1", body: 'Diagonal rail NEXT → top-left only.' },
      { id: "2", title: "Card 2", body: "Scroll rules still apply." },
      { id: "3", title: "Card 3", body: "Prev comes from top-left diagonally." },
      { id: "4", title: "Card 4", body: "No stuck top-left artifacts." },
      { id: "5", title: "Card 5", body: 'Tier-2 arbitration: / scrolls, "\\\\ swipes.' },
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);

  // worklet-visible index + current id for tap navigation
  const indexSV = useSharedValue(index);
  const currentIdSV = useSharedValue(cards[0]?.id ?? "");
  useEffect(() => {
    indexSV.value = index;
    currentIdSV.value = cards[index]?.id ?? "";
  }, [index, indexSV, currentIdSV, cards]);

  const hasPrev = index > 0;
  const current = cards[index] ?? cards[0];
  const prev = hasPrev ? cards[index - 1] : null;
  const next = index + 1 < cards.length ? cards[index + 1] : null;

  // Top card motion while dragging (NEXT only)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // PREV pull-in offsets (dormant = 0,0 to prevent top-left artifact)
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);
  const prevMode = useSharedValue(false);

  // Ghost dismissal (NEXT accepted)
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(1);
  const ghostScale = useSharedValue(1);

  const intent = useSharedValue<Intent>("UNDECIDED");

  // Manual-activation arbitration helpers
  const startAbsX = useSharedValue(0);
  const startAbsY = useSharedValue(0);

  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const navigateToCard = (id: string) => {
    if (!id) return;
    router.push(`/card/${id}`);
  };
  
  // Tap should open details, not swipe/scroll
  const tapGesture = Gesture.Tap()
    .maxDistance(6)      // stricter so tiny drift doesn’t count as tap
    .maxDuration(220)    // optional
    .onEnd(() => {
      runOnJS(navigateToCard)(currentIdSV.value);
    });

  // --- Deck stage bounds (keeps offsets inside stage) ---
  const minDx = Math.min(...STACK.map((s) => s.dx));
  const maxDx = Math.max(...STACK.map((s) => s.dx));
  const minDy = Math.min(...STACK.map((s) => s.dy));
  const maxDy = Math.max(...STACK.map((s) => s.dy));
  const ORIGIN_X = -minDx;
  const ORIGIN_Y = -minDy;
  const STAGE_W = CARD_SIZE + (maxDx - minDx);
  const STAGE_H = CARD_SIZE + (maxDy - minDy);

  const resetTopVisuals = () => {
    "worklet";
    scale.value = withSpring(1, { damping: 18, stiffness: 240 });
    opacity.value = withSpring(1, { damping: 18, stiffness: 240 });
  };

  const resetDragCard = () => {
    "worklet";
    tx.value = withSpring(0, { damping: 18, stiffness: 240 });
    ty.value = withSpring(0, { damping: 18, stiffness: 240 });
    resetTopVisuals();
    intent.value = "UNDECIDED";
  };

  const resetPrevCard = () => {
    "worklet";
    prevMode.value = false;
    prevX.value = withSpring(0, { damping: 18, stiffness: 240 });
    prevY.value = withSpring(0, { damping: 18, stiffness: 240 });
    intent.value = "UNDECIDED";
  };

  // JS: accept NEXT immediately
  const acceptNextJS = (i: number) => {
    setGhostIndex(i);
    setIndex((cur) => Math.min(cur + 1, cards.length - 1));
  };
  const clearGhostJS = () => setGhostIndex(null);

  const startGhostDismiss = () => {
    "worklet";
    // Ensure PREV is dormant after NEXT (prevents top-left layer leak)
    prevMode.value = false;
    prevX.value = 0;
    prevY.value = 0;

    ghostX.value = tx.value;
    ghostY.value = ty.value;
    ghostOpacity.value = opacity.value;
    ghostScale.value = scale.value;

    // Reset draggable card immediately (new current is already shown)
    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
    scale.value = 1;

    ghostOpacity.value = withTiming(0, { duration: DISMISS_MS, easing: Easing.out(Easing.quad) });
    ghostScale.value = withTiming(0.96, { duration: DISMISS_MS, easing: Easing.out(Easing.quad) });

    ghostX.value = withTiming(-SCREEN_W * 1.2, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) });
    ghostY.value = withTiming(-SCREEN_H * 0.45, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(clearGhostJS)();
    });
  };

  const commitPrevCard = () => {
    "worklet";
    prevX.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    prevY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) {
        runOnJS(goPrev)();
        prevMode.value = false;
        prevX.value = 0;
        prevY.value = 0;
        intent.value = "UNDECIDED";
      }
    });
  };

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      "worklet";
      const t0 = e.allTouches[0];
      startAbsX.value = t0.absoluteX;
      startAbsY.value = t0.absoluteY;

      intent.value = "UNDECIDED";

      // Keep PREV dormant unless we explicitly enter SWIPE_PREV
      prevMode.value = false;
      prevX.value = 0;
      prevY.value = 0;
    })
    .onTouchesMove((e, state) => {
      "worklet";
      if (intent.value !== "UNDECIDED") return;

      const t0 = e.allTouches[0];
      const dx = t0.absoluteX - startAbsX.value;
      const dy = t0.absoluteY - startAbsY.value;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (Math.hypot(ax, ay) < LOCK_DISTANCE) return;

      // 1) SUPER vertical dominance => always scroll
      if (ay > ax * VERTICAL_DOMINANCE) {
        intent.value = "SCROLL";
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;
        state.fail();
        return;
      }

      const angle = (Math.atan2(ay, ax) * 180) / Math.PI;

      // 2) Horizontal-ish => swipe
      if (angle < ANGLE_SWIPE_DEG) {
        const wantPrev = dx > 0;
        const hasPrevNow = indexSV.value > 0;
        const hasNextNow = indexSV.value < cards.length - 1;

        if (wantPrev && !hasPrevNow) {
          intent.value = "SCROLL";
          state.fail();
          return;
        }
        if (!wantPrev && !hasNextNow) {
          intent.value = "SCROLL";
          state.fail();
          return;
        }

        intent.value = wantPrev ? "SWIPE_PREV" : "SWIPE_NEXT";
        state.activate();
        return;
      }

      // 3) Mid-angle band: "\" = swipe, "/" = scroll
      if (angle <= ANGLE_SCROLL_DEG) {
        const wantPrev = dx > 0;
        const hasPrevNow = indexSV.value > 0;
        const hasNextNow = indexSV.value < cards.length - 1;

        if (isBackslashDiagonal(dx, dy)) {
          if (wantPrev && !hasPrevNow) {
            intent.value = "SCROLL";
            state.fail();
            return;
          }
          if (!wantPrev && !hasNextNow) {
            intent.value = "SCROLL";
            state.fail();
            return;
          }

          intent.value = wantPrev ? "SWIPE_PREV" : "SWIPE_NEXT";
          state.activate();
          return;
        } else {
          intent.value = "SCROLL";
          tx.value = 0;
          ty.value = 0;
          opacity.value = 1;
          scale.value = 1;
          state.fail();
          return;
        }
      }

      // 4) Strict vertical-ish => scroll
      intent.value = "SCROLL";
      tx.value = 0;
      ty.value = 0;
      opacity.value = 1;
      scale.value = 1;
      state.fail();
    })
    .onUpdate((e) => {
      "worklet";
      const dx = e.translationX;
      const dy = e.translationY;

      if (intent.value === "SCROLL") return;

      if (intent.value === "SWIPE_NEXT") {
        // NEXT only to top-left
        if (!(indexSV.value < cards.length - 1)) return;

        const x = Math.min(dx, 0);
        tx.value = x;

        const railY = -Math.abs(x) * RAIL_K;
        const dyUpOnly = Math.min(dy, 0);
        ty.value = railY + dyUpOnly * 0.12;

        const p = clamp(Math.abs(x) / NEXT_DISMISS_X, 0, 1);
        opacity.value = 1 - 0.35 * p;
        scale.value = 1 - 0.03 * p;
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        if (!(indexSV.value > 0)) return;

        // pin current
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;

        // Arm PREV only when actively swiping PREV
        if (!prevMode.value) {
          prevMode.value = true;
          prevX.value = PREV_START_X;
          prevY.value = PREV_START_Y;
        }

        const pull = clamp(dx, 0, PREV_PULL_X);
        const t = pull / PREV_PULL_X;

        prevX.value = PREV_START_X + (0 - PREV_START_X) * t;
        prevY.value = PREV_START_Y + (0 - PREV_START_Y) * t;
      }
    })
    .onEnd((e) => {
      "worklet";
      const vx = e.velocityX;
      const vy = e.velocityY;

      if (intent.value === "SCROLL" || intent.value === "UNDECIDED") {
        intent.value = "UNDECIDED";
        return;
      }

      if (intent.value === "SWIPE_NEXT") {
        const canNext = indexSV.value < cards.length - 1;
        if (!canNext) {
          resetDragCard();
          return;
        }

        const leftEnough = tx.value < -NEXT_DISMISS_X;
        const fastLeft = vx < -900;

        if (leftEnough || fastLeft) {
          runOnJS(acceptNextJS)(indexSV.value);
          startGhostDismiss();
          intent.value = "UNDECIDED";
        } else {
          resetDragCard();
        }
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        const canPrev = indexSV.value > 0;
        if (!canPrev) {
          resetPrevCard();
          return;
        }

        const pulledEnough = e.translationX > PREV_PULL_X * 0.25;
        const fastRight = vx > 750 && Math.abs(vy) < 1200;

        if (pulledEnough || fastRight) commitPrevCard();
        else resetPrevCard();
      }
    });

  const front = STACK[3];
  const mid = STACK[2];

  const cardGesture = Gesture.Simultaneous(tapGesture, pan);

  const currentCardStyle = useAnimatedStyle(() => {
    const rotate = (tx.value / SCREEN_W) * 6;
    return {
      zIndex: front.z,
      opacity: opacity.value,
      transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotateZ: `${rotate}deg` }, { scale: scale.value }],
    };
  });

  const prevCardStyle = useAnimatedStyle(() => {
    return {
      zIndex: mid.z,
      transform: [{ translateX: mid.dx + prevX.value }, { translateY: mid.dy + prevY.value }],
    };
  });

  const ghostCardStyle = useAnimatedStyle(() => {
    const rotate = (ghostX.value / SCREEN_W) * 6;
    return {
      zIndex: 999,
      opacity: ghostOpacity.value,
      transform: [
        { translateX: ghostX.value },
        { translateY: ghostY.value },
        { rotateZ: `${rotate}deg` },
        { scale: ghostScale.value },
      ],
    };
  });

  const backStyle = (layer: typeof STACK[number]) => ({
    zIndex: layer.z,
    transform: [{ translateX: layer.dx }, { translateY: layer.dy }],
  });

  const CardShell = ({
    title,
    body,
    borderAlpha,
    style,
    gesture,
  }: {
    title?: string;
    body?: string;
    borderAlpha: number;
    style?: any;
    gesture?: any;
  }) => {
    const node = (
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: CARD_SIZE,
            height: CARD_SIZE,
            borderRadius: RADIUS,
            backgroundColor: surface,
            borderWidth: BORDER_W,
            borderColor: rgbaTeal(borderAlpha),
            padding: 18,
            justifyContent: "center",
          },
          style,
        ]}
      >
        {title ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: text, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 }}>{title}</Text>
            <Text style={{ color: muted, fontSize: 13.5, lineHeight: 18 }}>{body}</Text>
          </View>
        ) : null}
      </Animated.View>
    );

    return gesture ? <GestureDetector gesture={gesture}>{node}</GestureDetector> : node;
  };

  const ghost = ghostIndex !== null ? cards[ghostIndex] : null;

  return (
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: surface }}
        contentContainerStyle={{ padding: 24, paddingBottom: 80, alignItems: "center" }}
        scrollEventThrottle={16}
      >
        <Text style={{ color: text, fontSize: 20, fontWeight: "700" }}>Swipe Controls Lab</Text>
        <Text style={{ color: muted, marginTop: 6, lineHeight: 20 }}>
          • Left-ish / horizontal / "\" diagonal → NEXT (top-left only){"\n"}
          • Pull right → PREV (diagonal from top-left){"\n"}
          • Vertical-ish or "/" diagonal → SCROLL{"\n"}
          • Tap card → open page
        </Text>

        <View style={{ height: 16 }} />

        <View style={{ width: STAGE_W, height: STAGE_H, position: "relative", marginTop: 10 }}>
          <View style={{ position: "absolute", left: ORIGIN_X, top: ORIGIN_Y, width: CARD_SIZE, height: CARD_SIZE }}>
            <CardShell borderAlpha={STACK[0].borderA} style={backStyle(STACK[0])} />
            <CardShell borderAlpha={STACK[1].borderA} style={backStyle(STACK[1])} />

            {prev ? (
              <CardShell borderAlpha={STACK[2].borderA} style={prevCardStyle} title={prev.title} body={prev.body} />
            ) : (
              <CardShell borderAlpha={STACK[2].borderA} style={backStyle(STACK[2])} />
            )}

            <CardShell
              borderAlpha={STACK[3].borderA}
              style={currentCardStyle}
              gesture={cardGesture}
              title={current.title}
              body={`${current.body}${next ? `\n\nNext: ${next.title}` : "\n\nNo next card."}`}
            />

            {ghost ? (
              <CardShell borderAlpha={STACK[3].borderA} style={ghostCardStyle} title={ghost.title} body={ghost.body} />
            ) : null}
          </View>
        </View>

        <View style={{ height: 24 }} />

        <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>Scroll content below</Text>
        {Array.from({ length: 10 }).map((_, idx) => (
          <View
            key={idx}
            style={{
              width: "100%",
              maxWidth: 480,
              height: 56,
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              marginTop: 10,
              justifyContent: "center",
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: muted }}>Row #{idx + 1}</Text>
          </View>
        ))}
      </Animated.ScrollView>
  );
}
