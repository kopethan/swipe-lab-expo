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

// This component is a single-deck extraction of the exact gesture + stack behavior
// from app/SwipeLabScreen.tsx. It lets screens render their own card content.

type Intent = "UNDECIDED" | "SCROLL" | "SWIPE_NEXT" | "SWIPE_PREV";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ---- Intent tuning (from SwipeLabScreen.tsx) ----
const LOCK_DISTANCE = 10;
const ANGLE_SWIPE_DEG = 40;
const ANGLE_SCROLL_DEG = 72;
const VERTICAL_DOMINANCE = 1.6;
const LEFT_SWIPE_ZONE_PX = 72;
const LEFT_ZONE_LOCK_DISTANCE = 6;
const LEFT_ZONE_ANGLE_SWIPE_DEG = 55;
const ANGLE_BACKSLASH_SWIPE_DEG = 86;
const BACKSLASH_VERTICAL_DOMINANCE = 2.25;

// ---- Deck look (from SwipeLabScreen.tsx) ----
const BORDER_W = 4;
const RADIUS = 22;
const STACK = [
  { dx: 18, dy: 18, z: 1, borderA: 0.22 },
  { dx: 12, dy: 12, z: 2, borderA: 0.35 },
  { dx: 6, dy: 6, z: 3, borderA: 0.55 },
  { dx: 0, dy: 0, z: 4, borderA: 0.95 },
];

type Pos = { c: number };

function rgbaBorder(alpha: number) {
  return `rgba(255,255,255,${Math.max(0, Math.min(0.5, alpha * 0.5))})`;
}

function isBackslashDiagonal(dx: number, dy: number) {
  "worklet";
  return dx * dy > 0;
}

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

export type SwipeDeckCard<T> = { id: string; data: T };

export function SwipeDeck<T>({
  header,
  cards,
  onOpenCard,
  renderCard,
  renderBackCard,
  cardSize,
}: {
  header?: string;
  cards: SwipeDeckCard<T>[];
  onOpenCard?: (id: string) => void;
  renderCard: (args: { card: SwipeDeckCard<T>; isTop: boolean }) => React.ReactNode;
  renderBackCard?: (args: { card: SwipeDeckCard<T>; layer: 1 | 2 | 3 }) => React.ReactNode;
  cardSize?: number;
}) {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";
  const surface = isDark ? "#0b0d10" : "#ffffff";
  const text = isDark ? "#ffffff" : "#0a0a0a";
  const muted = isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.62)";

  const CARD_SIZE = cardSize ?? Math.min(330, Math.floor(SCREEN_W * 0.88));
  const CARD_COUNT = cards.length;

  // thresholds
  const NEXT_DISMISS_X = CARD_SIZE * 0.32;
  const PREV_PULL_X = CARD_SIZE * 0.4;
  const RAIL_K = 0.7;
  const PREV_START_X = -CARD_SIZE * 0.55;
  const PREV_START_Y = -Math.abs(PREV_START_X) * RAIL_K;
  const DISMISS_MS = 160;

  const [pos, setPos] = useState<Pos>({ c: 0 });
  const [ghostPos, setGhostPos] = useState<Pos | null>(null);
  const [ghostPrevPos, setGhostPrevPos] = useState<Pos | null>(null);

  const cardSV = useSharedValue(pos.c);
  const currentIdSV = useSharedValue(cards[0]?.id ?? "");
  useEffect(() => {
    cardSV.value = pos.c;
    currentIdSV.value = cards[pos.c]?.id ?? "";
  }, [pos, cardSV, currentIdSV, cards]);

  const hasPrev = pos.c > 0;
  const hasNext = pos.c < CARD_COUNT - 1;

  const getPosOffset = (k: number): Pos | null => {
    const c = pos.c + k;
    if (c < 0 || c > CARD_COUNT - 1) return null;
    return { c };
  };

  const posToCard = (p: Pos | null) => (p ? cards[p.c] ?? null : null);

  const next1 = posToCard(getPosOffset(1));
  const next2 = posToCard(getPosOffset(2));
  const next3 = posToCard(getPosOffset(3));
  const current = cards[pos.c] ?? cards[0];
  const isLastCard = pos.c === CARD_COUNT - 1;

  // Runout fade
  const remainingBehind = Math.max(0, (CARD_COUNT - 1) - pos.c);
  const backCount = Math.min(3, remainingBehind);
  const runoutFade =
    remainingBehind >= 3
      ? 1
      : remainingBehind === 2
        ? 0.85
        : remainingBehind === 1
          ? 0.65
          : 0;
  const stackNow = STACK.map((s, i) => ({
    ...s,
    borderA: i === 3 ? STACK[3].borderA : s.borderA * runoutFade,
  }));
  const backCountFinal = isLastCard ? 0 : backCount;

  // Top card motion
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Stack conveyor
  const stackShiftT = useSharedValue(0);
  const stackShiftDir = useSharedValue<1 | -1>(1);

  // PREV ghost
  const ghostPrevX = useSharedValue(PREV_START_X);
  const ghostPrevY = useSharedValue(PREV_START_Y);
  const ghostPrevOpacity = useSharedValue(1);
  const ghostPrevScale = useSharedValue(1);
  const prevMode = useSharedValue(false);

  // NEXT ghost
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(1);
  const ghostScale = useSharedValue(1);

  const intent = useSharedValue<Intent>("UNDECIDED");
  const startAbsX = useSharedValue(0);
  const startAbsY = useSharedValue(0);

  const goPrevJS = () => setPos((p) => (p.c > 0 ? { c: p.c - 1 } : p));
  const goNextJS = () => setPos((p) => (p.c < CARD_COUNT - 1 ? { c: p.c + 1 } : p));
  const clearGhostPrevJS = () => setGhostPrevPos(null);
  const clearGhostJS = () => setGhostPos(null);

  const tapGesture = Gesture.Tap()
    .maxDistance(6)
    .maxDuration(220)
    .onEnd(() => {
      if (!onOpenCard) return;
      runOnJS(onOpenCard)(currentIdSV.value);
    });

  // Stage bounds
  const minDx = Math.min(...STACK.map((s) => s.dx));
  const maxDx = Math.max(...STACK.map((s) => s.dx));
  const minDy = Math.min(...STACK.map((s) => s.dy));
  const maxDy = Math.max(...STACK.map((s) => s.dy));
  const ORIGIN_X = -minDx;
  const ORIGIN_Y = -minDy;
  const STAGE_W = CARD_SIZE + (maxDx - minDx);
  const STAGE_H = CARD_SIZE + (maxDy - minDy);

  const snapStackShiftToZero = () => {
    "worklet";
    stackShiftT.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
  };

  const resetDragCard = () => {
    "worklet";
    tx.value = withSpring(0, { damping: 18, stiffness: 240 });
    ty.value = withSpring(0, { damping: 18, stiffness: 240 });
    scale.value = withSpring(1, { damping: 18, stiffness: 240 });
    opacity.value = withSpring(1, { damping: 18, stiffness: 240 });
    snapStackShiftToZero();
    intent.value = "UNDECIDED";
  };

  const resetPrevCard = () => {
    "worklet";
    prevMode.value = false;
    ghostPrevOpacity.value = 1;
    ghostPrevScale.value = 1;
    snapStackShiftToZero();

    ghostPrevX.value = withTiming(PREV_START_X, { duration: 140, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(PREV_START_Y, { duration: 140, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(clearGhostPrevJS)();
    });
    intent.value = "UNDECIDED";
  };

  const acceptNextJS = (p: Pos) => {
    setGhostPos(p);
    goNextJS();
  };

  const startGhostDismiss = () => {
    "worklet";
    prevMode.value = false;
    ghostPrevX.value = PREV_START_X;
    ghostPrevY.value = PREV_START_Y;
    runOnJS(clearGhostPrevJS)();
    snapStackShiftToZero();

    ghostX.value = tx.value;
    ghostY.value = ty.value;
    ghostOpacity.value = opacity.value;
    ghostScale.value = scale.value;

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
    ghostPrevOpacity.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    ghostPrevScale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });

    stackShiftDir.value = -1;
    stackShiftT.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });

    ghostPrevX.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) {
        runOnJS(goPrevJS)();
        stackShiftT.value = 0;
        prevMode.value = false;
        runOnJS(clearGhostPrevJS)();
        intent.value = "UNDECIDED";
      }
    });
  };

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      "worklet";
      const t0 = e.allTouches[0];
      if (!t0) return;
      startAbsX.value = t0.absoluteX;
      startAbsY.value = t0.absoluteY;
      intent.value = "UNDECIDED";

      prevMode.value = false;
      ghostPrevX.value = PREV_START_X;
      ghostPrevY.value = PREV_START_Y;
      runOnJS(clearGhostPrevJS)();
    })
    .onTouchesMove((e, state) => {
      "worklet";
      if (intent.value !== "UNDECIDED") return;

      const t0 = e.allTouches[0];
      if (!t0) return;
      const dx = t0.absoluteX - startAbsX.value;
      const dy = t0.absoluteY - startAbsY.value;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      const inLeftZone = startAbsX.value <= LEFT_SWIPE_ZONE_PX;
      const lockDist = inLeftZone ? LEFT_ZONE_LOCK_DISTANCE : LOCK_DISTANCE;
      if (Math.hypot(ax, ay) < lockDist) return;

      const verticalDominance = inLeftZone ? VERTICAL_DOMINANCE * 1.35 : VERTICAL_DOMINANCE;
      const isBackslash = isBackslashDiagonal(dx, dy);
      const vd = isBackslash ? BACKSLASH_VERTICAL_DOMINANCE : verticalDominance;

      if (ay > ax * vd) {
        intent.value = "SCROLL";
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;
        state.fail();
        return;
      }

      const angle = (Math.atan2(ay, ax) * 180) / Math.PI;
      const angleSwipeDeg = inLeftZone ? LEFT_ZONE_ANGLE_SWIPE_DEG : ANGLE_SWIPE_DEG;

      if (angle < angleSwipeDeg) {
        const wantPrev = dx > 0;
        if (wantPrev && !hasPrev) {
          intent.value = "SCROLL";
          state.fail();
          return;
        }
        if (!wantPrev && !hasNext) {
          intent.value = "SCROLL";
          state.fail();
          return;
        }
        intent.value = wantPrev ? "SWIPE_PREV" : "SWIPE_NEXT";
        state.activate();
        return;
      }

      const diagMax = isBackslash ? ANGLE_BACKSLASH_SWIPE_DEG : ANGLE_SCROLL_DEG;
      if (angle <= diagMax) {
        const wantPrev = dx > 0;
        if (isBackslash) {
          if (wantPrev && !hasPrev) {
            intent.value = "SCROLL";
            state.fail();
            return;
          }
          if (!wantPrev && !hasNext) {
            intent.value = "SCROLL";
            state.fail();
            return;
          }
          intent.value = wantPrev ? "SWIPE_PREV" : "SWIPE_NEXT";
          state.activate();
          return;
        }

        intent.value = "SCROLL";
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;
        state.fail();
        return;
      }

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
        if (!hasNext) return;
        stackShiftDir.value = 1;
        const x = Math.min(dx, 0);
        tx.value = x;
        stackShiftT.value = clamp(Math.abs(x) / NEXT_DISMISS_X, 0, 1);

        const railY = -Math.abs(x) * RAIL_K;
        const dyUpOnly = Math.min(dy, 0);
        ty.value = railY + dyUpOnly * 0.12;

        const p = clamp(Math.abs(x) / NEXT_DISMISS_X, 0, 1);
        opacity.value = 1 - 0.35 * p;
        scale.value = 1 - 0.03 * p;
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        if (!hasPrev) return;
        stackShiftDir.value = -1;

        // current stays fixed while prev card is pulled in
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;

        if (!prevMode.value) {
          prevMode.value = true;
          ghostPrevX.value = PREV_START_X;
          ghostPrevY.value = PREV_START_Y;
          ghostPrevOpacity.value = 1;
          ghostPrevScale.value = 1;

          const c = Math.floor(cardSV.value);
          runOnJS(setGhostPrevPos)({ c: Math.max(0, c - 1) });
        }

        const pull = clamp(dx, 0, PREV_PULL_X);
        const t = pull / PREV_PULL_X;
        stackShiftT.value = clamp(t, 0, 1);

        ghostPrevX.value = PREV_START_X + (0 - PREV_START_X) * t;
        ghostPrevY.value = PREV_START_Y + (0 - PREV_START_Y) * t;
        ghostPrevScale.value = 0.985 + 0.015 * t;
        ghostPrevOpacity.value = 0.9 + 0.1 * t;
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
        if (!hasNext) {
          resetDragCard();
          return;
        }
        const leftEnough = tx.value < -NEXT_DISMISS_X;
        const fastLeft = vx < -900;
        if (leftEnough || fastLeft) {
          const c = Math.floor(cardSV.value);
          runOnJS(acceptNextJS)({ c });
          startGhostDismiss();
          intent.value = "UNDECIDED";
        } else {
          resetDragCard();
        }
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        if (!hasPrev) {
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
  const cardGesture = Gesture.Simultaneous(tapGesture, pan);

  const currentCardStyle = useAnimatedStyle(() => {
    const rotate = (tx.value / SCREEN_W) * 6;
    const t = stackShiftT.value;
    const isPrev = stackShiftDir.value < 0;
    const prevShiftX = isPrev ? STACK[2].dx * t : 0;
    const prevShiftY = isPrev ? STACK[2].dy * t : 0;
    return {
      zIndex: front.z,
      opacity: opacity.value,
      transform: [
        { translateX: tx.value + prevShiftX },
        { translateY: ty.value + prevShiftY },
        { rotateZ: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const ghostPrevCardStyle = useAnimatedStyle(() => {
    return {
      zIndex: 1200,
      opacity: ghostPrevOpacity.value,
      transform: [
        { translateX: ghostPrevX.value },
        { translateY: ghostPrevY.value },
        { scale: ghostPrevScale.value },
      ],
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

  // Animated back-layer transforms
  const back0Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = STACK[0];
    const STACK_FAR = { dx: STACK[0].dx + 4, dy: STACK[0].dy + 4 };
    const b = dir > 0 ? STACK[1] : STACK_FAR;
    const isPrev = dir < 0;
    const farOpacity = isPrev ? 1 - 0.85 * t : 1;
    const farScale = isPrev ? 1 - 0.03 * t : 1;
    return {
      zIndex: a.z,
      opacity: farOpacity,
      transform: [
        { translateX: a.dx + (b.dx - a.dx) * t },
        { translateY: a.dy + (b.dy - a.dy) * t },
        { scale: farScale },
      ],
    };
  });

  const back1Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = STACK[1];
    const b = dir > 0 ? STACK[2] : STACK[0];
    return {
      zIndex: a.z,
      transform: [
        { translateX: a.dx + (b.dx - a.dx) * t },
        { translateY: a.dy + (b.dy - a.dy) * t },
      ],
    };
  });

  const back2Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = STACK[2];
    const b = dir > 0 ? STACK[3] : STACK[1];
    return {
      zIndex: a.z,
      transform: [
        { translateX: a.dx + (b.dx - a.dx) * t },
        { translateY: a.dy + (b.dy - a.dy) * t },
      ],
    };
  });

  const CardShell = ({
    borderAlpha,
    style,
    gesture,
    children,
  }: {
    borderAlpha: number;
    style?: any;
    gesture?: any;
    children?: React.ReactNode;
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
            borderColor: rgbaBorder(borderAlpha),
            padding: 18,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
    return gesture ? <GestureDetector gesture={gesture}>{node}</GestureDetector> : node;
  };

  const ghostPrev = posToCard(ghostPrevPos);
  const ghost = posToCard(ghostPos);

  const BackCard = ({ card, layer }: { card: SwipeDeckCard<T>; layer: 1 | 2 | 3 }) => {
    if (renderBackCard) return <>{renderBackCard({ card, layer })}</>;
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ color: text, fontSize: 16, fontWeight: "800" }} numberOfLines={2}>
          {card.id}
        </Text>
        <Text style={{ color: muted, fontSize: 12.5, marginTop: 8 }} numberOfLines={3}>
          Swipe for next / prev.
        </Text>
      </View>
    );
  };

  return (
    <View style={{ alignItems: "center" }}>
      {!!header && (
        <Text style={{ color: text, fontSize: 18, fontWeight: "800", marginBottom: 14 }}>{header}</Text>
      )}

      <View style={{ width: STAGE_W, height: STAGE_H, position: "relative" }}>
        <View style={{ position: "absolute", left: ORIGIN_X, top: ORIGIN_Y, width: CARD_SIZE, height: CARD_SIZE }}>
          {backCountFinal >= 3 && next3 ? (
            <CardShell borderAlpha={stackNow[0].borderA} style={back0Style}>
              <BackCard card={next3} layer={3} />
            </CardShell>
          ) : null}
          {backCountFinal >= 2 && next2 ? (
            <CardShell borderAlpha={stackNow[1].borderA} style={back1Style}>
              <BackCard card={next2} layer={2} />
            </CardShell>
          ) : null}
          {backCountFinal >= 1 && next1 ? (
            <CardShell borderAlpha={stackNow[2].borderA} style={back2Style}>
              <BackCard card={next1} layer={1} />
            </CardShell>
          ) : null}

          {current ? (
            <CardShell borderAlpha={stackNow[3].borderA} style={currentCardStyle} gesture={cardGesture}>
              {renderCard({ card: current, isTop: true })}
            </CardShell>
          ) : null}

          {ghostPrev ? (
            <CardShell borderAlpha={stackNow[3].borderA} style={ghostPrevCardStyle}>
              {renderCard({ card: ghostPrev, isTop: true })}
            </CardShell>
          ) : null}

          {ghost ? (
            <CardShell borderAlpha={stackNow[3].borderA} style={ghostCardStyle}>
              {renderCard({ card: ghost, isTop: true })}
            </CardShell>
          ) : null}
        </View>
      </View>
    </View>
  );
}
