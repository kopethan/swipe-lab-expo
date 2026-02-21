import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Text, useColorScheme, View } from "react-native";
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

// ---- Multi-deck model ----
const DECK_COUNT = 3;
const CARDS_PER_DECK = 10;

// ---- Intent tuning ----
const LOCK_DISTANCE = 10; // px before we lock intent
const ANGLE_SWIPE_DEG = 40; // swipe is easier to win
const ANGLE_SCROLL_DEG = 72; // scroll requires stricter vertical
const VERTICAL_DOMINANCE = 1.6; // must be much more vertical to force scroll
// Increase "swing area" from the left edge: starting a gesture here biases toward SWIPE_NEXT
const LEFT_SWIPE_ZONE_PX = 72;
const LEFT_ZONE_LOCK_DISTANCE = 6; // lock earlier in the zone
const LEFT_ZONE_ANGLE_SWIPE_DEG = 55; // allow more vertical drift and still count as swipe
// Allow "\\" diagonal swipes closer to vertical (while keeping true vertical scroll)
const ANGLE_BACKSLASH_SWIPE_DEG = 86;
const BACKSLASH_VERTICAL_DOMINANCE = 2.25;

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

type Card = { id: string; title: string; body: string };
type Deck = { id: string; title: string; cards: Card[] };
type Pos = { d: number; c: number };

// Border color: half-transparent white (we keep per-layer alpha feel by scaling into 0..0.5)
function rgbaBorder(alpha: number) {
  return `rgba(255,255,255,${Math.max(0, Math.min(0.5, alpha * 0.5))})`;
}

// "\\" diagonal: top-left -> bottom-right (dx and dy same sign)
function isBackslashDiagonal(dx: number, dy: number) {
  "worklet";
  return dx * dy > 0;
}

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

function SwipeDeckInstance({
  decks,
  deckIndex,
  header,
  surface,
  text,
  muted,
  onOpenCard,
}: {
  decks: Deck[];
  deckIndex: number;
  header: string;
  surface: string;
  text: string;
  muted: string;
  onOpenCard: (id: string) => void;
}) {
  const CARD_SIZE = Math.min(330, Math.floor(SCREEN_W * 0.88));

  // thresholds (px)
  const NEXT_DISMISS_X = CARD_SIZE * 0.32;
  const PREV_PULL_X = CARD_SIZE * 0.4;

  // diagonal rail strength for NEXT (always top-left)
  const RAIL_K = 0.7;

  // PREV: starts top-left (off-stage), comes diagonally into deck (toward 0,0)
  const PREV_START_X = -CARD_SIZE * 0.55;
  const PREV_START_Y = -Math.abs(PREV_START_X) * RAIL_K;

  const DISMISS_MS = 240;

  // ---- Atomic position (prevents deck/card desync) ----
  const [pos, setPos] = useState<Pos>({ d: deckIndex, c: 0 });

  const [ghostPos, setGhostPos] = useState<Pos | null>(null); // NEXT ghost-out (old current)
  
  // worklet-visible index + current id for tap navigation
  const deckSV = useSharedValue(pos.d);
  const cardSV = useSharedValue(pos.c);
  const currentIdSV = useSharedValue(decks[deckIndex]?.cards[0]?.id ?? "");
  useEffect(() => {
    deckSV.value = pos.d;
    cardSV.value = pos.c;
    currentIdSV.value = decks[pos.d]?.cards[pos.c]?.id ?? "";
  }, [pos, deckSV, cardSV, currentIdSV, decks]);

  const currentDeck = decks[pos.d] ?? decks[0];
  const currentCards = currentDeck?.cards ?? [];

  const posToCard = (p: Pos | null) => (p ? decks[p.d]?.cards[p.c] ?? null : null);

  // ---- Stop at the last card of the CURRENT deck ----
  const hasPrev = pos.c > 0;
  const hasNext = pos.c < CARDS_PER_DECK - 1;

  const getNextPosOffset = (k: number): Pos | null => {
    const c = pos.c + k;
    if (c < 0 || c > CARDS_PER_DECK - 1) return null;
    return { d: pos.d, c };
  };
  const next1 = posToCard(getNextPosOffset(1));
  const next2 = posToCard(getNextPosOffset(2));
  const next3 = posToCard(getNextPosOffset(3));

  const current = currentCards[pos.c] ?? currentCards[0];
  const next = hasNext ? posToCard({ d: pos.d, c: pos.c + 1 }) : null;

  // If we're on the last card, show no back stack at all (true "end card")
  const isLastCard = pos.c === CARDS_PER_DECK - 1;

  /**
   * Runout v2:
   * - Only background layers decrease at 8/9/10.
   * - Top layer border stays constant.
   */
  const remainingBehind = Math.max(0, (CARDS_PER_DECK - 1) - pos.c);
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

  // Top card motion while dragging (NEXT only)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Stack conveyor polish: back cards move forward on NEXT and backward on PREV.
  const stackShiftT = useSharedValue(0);
  const stackShiftDir = useSharedValue<1 | -1>(1);

  // PREV "incoming ghost"
  const ghostPrevX = useSharedValue(PREV_START_X);
  const ghostPrevY = useSharedValue(PREV_START_Y);
  const ghostPrevOpacity = useSharedValue(0);
  const ghostPrevScale = useSharedValue(1);

  // PREV mode flag
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

  const goPrevJS = () => {
    setPos((p) => {
      if (p.c > 0) return { d: p.d, c: p.c - 1 };
      return p;
    });
  };

  const goNextJS = () => {
    setPos((p) => {
      if (p.c < CARDS_PER_DECK - 1) return { d: p.d, c: p.c + 1 };
      return p;
    });
  };

  
  // Tap should open details, not swipe/scroll
  const tapGesture = Gesture.Tap()
    .maxDistance(6)
    .maxDuration(220)
    .onEnd(() => {
      runOnJS(onOpenCard)(currentIdSV.value);
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

  const snapStackShiftToZero = () => {
    "worklet";
    stackShiftT.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
  };

  const resetTopVisuals = () => {
    "worklet";
    scale.value = withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 });
    opacity.value = withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 });
  };

  const resetDragCard = () => {
    "worklet";
    tx.value = withSpring(0, { damping: 22, stiffness: 180, mass: 0.9 });
    ty.value = withSpring(0, { damping: 22, stiffness: 180, mass: 0.9 });
    resetTopVisuals();
    snapStackShiftToZero();
    intent.value = "UNDECIDED";
  };

  const resetPrevCard = () => {
    "worklet";
    prevMode.value = false;

    ghostPrevOpacity.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) });
    ghostPrevScale.value = withTiming(0.99, { duration: 140, easing: Easing.out(Easing.cubic) });
    snapStackShiftToZero();

    ghostPrevX.value = withTiming(PREV_START_X, { duration: 140, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(PREV_START_Y, { duration: 140, easing: Easing.out(Easing.cubic) });
    intent.value = "UNDECIDED";
  };

  // JS: accept NEXT immediately
  const acceptNextJS = (p: Pos) => {
    setGhostPos(p);
    goNextJS();
  };
  const clearGhostJS = () => setGhostPos(null);

  const startGhostDismiss = () => {
    "worklet";
    prevMode.value = false;
    ghostPrevX.value = PREV_START_X;
    ghostPrevY.value = PREV_START_Y;
    
    snapStackShiftToZero();

    ghostX.value = tx.value;
    ghostY.value = ty.value;
    ghostOpacity.value = opacity.value;
    ghostScale.value = scale.value;

    // Reset draggable card immediately
    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
    scale.value = 1;

    ghostOpacity.value = withTiming(0, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) });
    ghostScale.value = withTiming(0.985, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) });

    ghostX.value = withTiming(-SCREEN_W * 1.2, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) });
    ghostY.value = withTiming(-SCREEN_H * 0.45, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(clearGhostJS)();
    });
  };

  const commitPrevCard = () => {
    "worklet";
    // Bring incoming ghost to CENTER first, THEN swap index so content changes exactly when it lands.
    ghostPrevOpacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    ghostPrevScale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });

    stackShiftDir.value = -1;
    stackShiftT.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });

    ghostPrevX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) {
        runOnJS(goPrevJS)();
        stackShiftT.value = 0;
        prevMode.value = false;
        ghostPrevOpacity.value = 0;
        ghostPrevX.value = PREV_START_X;
        ghostPrevY.value = PREV_START_Y;
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
        const hasPrevNow = cardSV.value > 0;
        const hasNextNow = cardSV.value < CARDS_PER_DECK - 1;

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

      const diagMax = isBackslash ? ANGLE_BACKSLASH_SWIPE_DEG : ANGLE_SCROLL_DEG;

      if (angle <= diagMax) {
        const wantPrev = dx > 0;
        const hasPrevNow = cardSV.value > 0;
        const hasNextNow = cardSV.value < CARDS_PER_DECK - 1;

        if (isBackslash) {
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
        if (!(cardSV.value < CARDS_PER_DECK - 1)) return;

        stackShiftDir.value = 1;
        const x = Math.min(dx, 0);
        tx.value = x;

        stackShiftT.value = clamp(Math.abs(x) / NEXT_DISMISS_X, 0, 1);

        const railY = -Math.abs(x) * RAIL_K;
        const dyUpOnly = Math.min(dy, 0);
        ty.value = railY + dyUpOnly * 0.12;

        const p = clamp(Math.abs(x) / NEXT_DISMISS_X, 0, 1);
        const p2 = p * p;
        // Keep the card "solid" (Wallet-like): avoid early fade; let motion do the work.
        opacity.value = 1 - 0.10 * p2;
        scale.value = 1 - 0.02 * p;
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        if (!(cardSV.value > 0)) return;

        stackShiftDir.value = -1;

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
        const canNext = cardSV.value < CARDS_PER_DECK - 1;
        if (!canNext) {
          resetDragCard();
          return;
        }

        const leftEnough = tx.value < -NEXT_DISMISS_X;
        const fastLeft = vx < -900;

        if (leftEnough || fastLeft) {
          const d = pos.d;
          const c = Math.floor(cardSV.value);
          runOnJS(acceptNextJS)({ d, c });
          startGhostDismiss();
          intent.value = "UNDECIDED";
        } else {
          resetDragCard();
        }
        return;
      }

      if (intent.value === "SWIPE_PREV") {
        const canPrev = cardSV.value > 0;
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

  const cardGesture = Gesture.Simultaneous(tapGesture, pan);

  const currentCardStyle = useAnimatedStyle(() => {
    const rotate = (tx.value / SCREEN_W) * 4;
    // PREV conveyor: current card slides behind (toward STACK[2]) while PREV progresses.
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
    const rotate = (ghostX.value / SCREEN_W) * 4;
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
            borderColor: rgbaBorder(borderAlpha),
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

  const prevCard = hasPrev ? posToCard({ d: pos.d, c: pos.c - 1 }) : null;
  const ghost = posToCard(ghostPos);

  // ----- Animated back-layer transforms (stack conveyor polish) -----
  const back0Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = STACK[0];

    // PREV: farthest card fades/scales out to feel like it falls off.
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

  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>{header}</Text>
      <Text style={{ color: muted, marginTop: 6, lineHeight: 20, textAlign: "center" }}>
        • Left-ish / horizontal / "\\" diagonal → NEXT (top-left only){"\n"}
        • Pull right → PREV (diagonal from top-left){"\n"}
        • Vertical-ish or "/" diagonal → SCROLL{"\n"}
        • Tap card → open page
      </Text>

      <View style={{ height: 14 }} />

      <View style={{ width: STAGE_W, height: STAGE_H, position: "relative", marginTop: 10 }}>
        <View style={{ position: "absolute", left: ORIGIN_X, top: ORIGIN_Y, width: CARD_SIZE, height: CARD_SIZE }}>
          {/* Background stack shows UPCOMING cards (next1/next2/next3). */}
          {backCountFinal >= 3 && next3 ? (
            <CardShell borderAlpha={stackNow[0].borderA} style={back0Style} title={next3.title} body={next3.body} />
          ) : null}

          {backCountFinal >= 2 && next2 ? (
            <CardShell borderAlpha={stackNow[1].borderA} style={back1Style} title={next2.title} body={next2.body} />
          ) : null}

          {backCountFinal >= 1 && next1 ? (
            <CardShell borderAlpha={stackNow[2].borderA} style={back2Style} title={next1.title} body={next1.body} />
          ) : null}

          <CardShell
            borderAlpha={stackNow[3].borderA}
            style={currentCardStyle}
            gesture={cardGesture}
            title={current.title}
            body={`${current.body}${next ? `\n\nNext: ${next.title}` : "\n\nNo next card."}`}
          />

          {prevCard ? (
            <CardShell
              borderAlpha={stackNow[3].borderA}
              style={ghostPrevCardStyle}
              title={prevCard.title}
              body={prevCard.body}
            />
          ) : null}

          {ghost ? (
            <CardShell
              borderAlpha={stackNow[3].borderA}
              style={ghostCardStyle}
              title={ghost.title}
              body={ghost.body}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function SwipeLabScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme !== "light";
  const surface = isDark ? "#0b0d10" : "#ffffff";
  const text = isDark ? "#ffffff" : "#0a0a0a";
  const muted = isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.62)";

  const decks: Deck[] = useMemo(() => {
    const makeCard = (deckId: string, n: number): Card => {
      const id = `${deckId}-${n + 1}`;
      return {
        id,
        title: `Deck ${deckId.toUpperCase()} · Card ${n + 1}`,
        body:
          n === 0
            ? "Diagonal rail NEXT → top-left only. Tap to open."
            : n === 1
              ? 'Tier-2 arbitration: "/" scrolls, "\\\\" swipes.'
              : n === 2
                ? "Prev comes from top-left diagonally."
                : n === 8
                  ? "Deck is running low… (9/10)"
                  : n === 9
                    ? "Last card of this deck (10/10)."
                    : "Scroll rules still apply.",
      };
    };

    return Array.from({ length: DECK_COUNT }).map((_, di) => {
      const deckId = String.fromCharCode("a".charCodeAt(0) + di);
      return {
        id: deckId,
        title: `Deck ${deckId.toUpperCase()}`,
        cards: Array.from({ length: CARDS_PER_DECK }).map((__, ci) => makeCard(deckId, ci)),
      };
    });
  }, []);

  const feed = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        key: `feed-${i}`,
        deckIndex: i % DECK_COUNT,
        header: `Swipe Controls Lab · Deck ${String.fromCharCode("A".charCodeAt(0) + (i % DECK_COUNT))} · #${i + 1}`,
      })),
    []
  );

  const onOpenCard = (id: string) => {
    if (!id) return;
    router.push(`/card/${id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: surface }}>
      <FlatList
        data={feed}
        keyExtractor={(it) => it.key}
        contentContainerStyle={{ padding: 18, paddingBottom: 80, gap: 26 }}
        renderItem={({ item }) => (
          <SwipeDeckInstance
            decks={decks}
            deckIndex={item.deckIndex}
            header={item.header}
            surface={surface}
            text={text}
            muted={muted}
            onOpenCard={onOpenCard}
          />
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              marginVertical: 22,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            }}
          />
        )}
      />
    </View>
  );
}
