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

// ---- Multi-deck model ----
const DECK_COUNT = 3;
const CARDS_PER_DECK = 10;

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

type Card = { id: string; title: string; body: string };
type Deck = { id: string; title: string; cards: Card[] };
type Pos = { d: number; c: number };

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

  const decks: Deck[] = useMemo(() => {
    const makeCard = (deckId: string, n: number): Card => {
      const id = `${deckId}-${n + 1}`; // keep route compatible: /card/[id]
      return {
        id,
        title: `Deck ${deckId.toUpperCase()} · Card ${n + 1}`,
        body:
          n === 0
            ? 'Diagonal rail NEXT → top-left only. Tap to open.'
            : n === 1
            ? 'Tier-2 arbitration: "/" scrolls, "\\\\ swipes.'
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
      const deckId = String.fromCharCode("a".charCodeAt(0) + di); // a, b, c...
      return {
        id: deckId,
        title: `Deck ${deckId.toUpperCase()}`,
        cards: Array.from({ length: CARDS_PER_DECK }).map((__, ci) => makeCard(deckId, ci)),
      };
    });
  }, []);

  // ---- Atomic position (prevents deck/card desync) ----
  const [pos, setPos] = useState<Pos>({ d: 0, c: 0 });

  const [ghostPos, setGhostPos] = useState<Pos | null>(null); // NEXT ghost-out (old current)
  const [ghostPrevPos, setGhostPrevPos] = useState<Pos | null>(null); // PREV ghost-in (incoming)

  // worklet-visible index + current id for tap navigation
  const deckSV = useSharedValue(pos.d);
  const cardSV = useSharedValue(pos.c);
  const currentIdSV = useSharedValue(decks[0]?.cards[0]?.id ?? "");
  useEffect(() => {
    deckSV.value = pos.d;
    cardSV.value = pos.c;
    currentIdSV.value = decks[pos.d]?.cards[pos.c]?.id ?? "";
  }, [pos, deckSV, cardSV, currentIdSV, decks]);

  const currentDeck = decks[pos.d] ?? decks[0];
  const currentCards = currentDeck?.cards ?? [];

  const posToCard = (p: Pos | null) => (p ? decks[p.d]?.cards[p.c] ?? null : null);

  // ---- Stop at the last card of the CURRENT deck (no wrapping to next deck) ----
  const hasPrev = pos.c > 0;              // optional: only within deck
  const hasNext = pos.c < CARDS_PER_DECK - 1;

  const getPrevPos = (): Pos | null => {
    if (!hasPrev) return null;
    if (pos.c > 0) return { d: pos.d, c: pos.c - 1 };
    return null;
  };
  const getNextPos = (): Pos | null => {
    if (!hasNext) return null;
    if (pos.c < CARDS_PER_DECK - 1) return { d: pos.d, c: pos.c + 1 };
    return null;
  };

  const current = currentCards[pos.c] ?? currentCards[0];
  const prev = hasPrev ? posToCard(getPrevPos()) : null;
  const next = hasNext ? posToCard(getNextPos()) : null;

  // If we're on the last card, show no back stack at all (true "end card")
  const isLastCard = pos.c === CARDS_PER_DECK - 1;

  // Running-out visual (when remaining hits 3/2/1, reduce stack)
  const remainingInDeck = Math.max(0, CARDS_PER_DECK - pos.c);
  const backCount = remainingInDeck >= 4 ? 3 : Math.max(0, remainingInDeck - 1); // 3->2, 2->1, 1->0
  const runoutK = remainingInDeck >= 4 ? 1 : 0.25 + 0.25 * remainingInDeck; // 3->1.0, 2->0.75, 1->0.5
  const stackNow = STACK.map((s) => ({ ...s, borderA: s.borderA * runoutK }));

  // Force no background layers on the very last card
  const backCountFinal = isLastCard ? 0 : backCount;

  // Top card motion while dragging (NEXT only)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // PREV "incoming ghost" (mirror of NEXT ghost-out):
  // It moves from top-left -> center, and ONLY after it lands we swap index.
  const ghostPrevX = useSharedValue(PREV_START_X);
  const ghostPrevY = useSharedValue(PREV_START_Y);
  const ghostPrevOpacity = useSharedValue(1);
  const ghostPrevScale = useSharedValue(1);

  // PREV mode flag (also prevents stuck visuals)
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

  // ---- Atomic next/prev (no stale closure / no desync) ----
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

  const navigateToCard = (id: string) => {
    if (!id) return;
    router.push(`/card/${id}`);
  };
  
  const clearGhostPrevJS = () => setGhostPrevPos(null);

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

    ghostPrevOpacity.value = 1;
    ghostPrevScale.value = 1;

    ghostPrevX.value = withTiming(PREV_START_X, { duration: 140, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(PREV_START_Y, { duration: 140, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(clearGhostPrevJS)();
    });
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
    // Ensure PREV is dormant after NEXT (prevents top-left layer leak)
    prevMode.value = false;
    ghostPrevX.value = PREV_START_X;
    ghostPrevY.value = PREV_START_Y;
    runOnJS(clearGhostPrevJS)();

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
    // Bring incoming ghost to CENTER first (mirror of NEXT dismiss),
    // THEN swap index so content changes exactly when it lands.
    ghostPrevOpacity.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    ghostPrevScale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    ghostPrevX.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) {
        runOnJS(goPrevJS)();
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

      // Keep PREV dormant unless we explicitly enter SWIPE_PREV
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
        const hasPrevNow = deckSV.value > 0 || cardSV.value > 0;
        const hasNextNow = deckSV.value < DECK_COUNT - 1 || cardSV.value < CARDS_PER_DECK - 1;

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
        const hasPrevNow = deckSV.value > 0 || cardSV.value > 0;
        const hasNextNow = deckSV.value < DECK_COUNT - 1 || cardSV.value < CARDS_PER_DECK - 1;

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
        if (!(cardSV.value < CARDS_PER_DECK - 1)) return;

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
        if (!(cardSV.value > 0)) return;

        // pin current
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;

        // Arm PREV incoming ghost only when actively swiping PREV
        if (!prevMode.value) {
          prevMode.value = true;
          ghostPrevX.value = PREV_START_X;
          ghostPrevY.value = PREV_START_Y;
          ghostPrevOpacity.value = 1;
          ghostPrevScale.value = 1;
          // incoming is the logical prev position
          const d = Math.floor(deckSV.value);
          const c = Math.floor(cardSV.value);
          const p: Pos = { d, c: Math.max(0, c - 1) };
          runOnJS(setGhostPrevPos)(p);
        }

        const pull = clamp(dx, 0, PREV_PULL_X);
        const t = pull / PREV_PULL_X;

        // Follow diagonal from top-left into deck (to center at 0,0)
        ghostPrevX.value = PREV_START_X + (0 - PREV_START_X) * t;
        ghostPrevY.value = PREV_START_Y + (0 - PREV_START_Y) * t;

        // Optional "approach" feel (subtle)
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
          const d = Math.floor(deckSV.value);
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
      // Prev card stays in-stack (no animated offsets). Incoming motion is handled by ghostPrev.
      transform: [{ translateX: mid.dx }, { translateY: mid.dy }],
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

  const ghostPrev = posToCard(ghostPrevPos);
  const ghost = posToCard(ghostPos);

  return (
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: surface }}
        contentContainerStyle={{ padding: 24, paddingBottom: 80, alignItems: "center" }}
        scrollEventThrottle={16}
      >
        <Text style={{ color: text, fontSize: 20, fontWeight: "700" }}>
          Swipe Controls Lab · {currentDeck?.title ?? "Deck"}
        </Text>
        <Text style={{ color: muted, marginTop: 6, lineHeight: 20 }}>
          • Left-ish / horizontal / "\" diagonal → NEXT (top-left only){"\n"}
          • Pull right → PREV (diagonal from top-left){"\n"}
          • Vertical-ish or "/" diagonal → SCROLL{"\n"}
          • Tap card → open page
        </Text>

        <View style={{ height: 16 }} />

        <View style={{ width: STAGE_W, height: STAGE_H, position: "relative", marginTop: 10 }}>
          <View style={{ position: "absolute", left: ORIGIN_X, top: ORIGIN_Y, width: CARD_SIZE, height: CARD_SIZE }}>
            {/* Running-out effect: reduce visible back layers at remaining=3/2/1 */}
            {backCountFinal >= 1 ? <CardShell borderAlpha={stackNow[0].borderA} style={backStyle(STACK[0])} /> : null}
            {backCountFinal >= 2 ? <CardShell borderAlpha={stackNow[1].borderA} style={backStyle(STACK[1])} /> : null}

            {prev && backCountFinal >= 3 ? (
              <CardShell borderAlpha={stackNow[2].borderA} style={prevCardStyle} title={prev.title} body={prev.body} />
            ) : (
              // If no prev (start of all decks), show third layer only when we still have enough remaining
              backCountFinal >= 3 ? <CardShell borderAlpha={stackNow[2].borderA} style={backStyle(STACK[2])} /> : null
            )}

            <CardShell
              borderAlpha={stackNow[3].borderA}
              style={currentCardStyle}
              gesture={cardGesture}
              title={current.title}
              body={`${current.body}${next ? `\n\nNext: ${next.title}` : "\n\nNo next card."}`}
            />

            {ghostPrev ? (
              <CardShell borderAlpha={stackNow[3].borderA} style={ghostPrevCardStyle} title={ghostPrev.title} body={ghostPrev.body} />
            ) : null}

            {ghost ? (
              <CardShell borderAlpha={stackNow[3].borderA} style={ghostCardStyle} title={ghost.title} body={ghost.body} />
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
