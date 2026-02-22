import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
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

export type SettingsDeckCardSpec = {
  key: string;
  title: string;
  render: () => React.ReactNode;
  /** Hidden/disabled by default. Enable only when the card needs a details page. */
  detailsEnabled?: boolean;
};

export type SettingsWalletStackHandle = {
  /** Jump to an index with REAL step-through (no teleport). */
  goToIndex: (targetIndex: number) => void;
  /** One-step navigation (wheel / drag). */
  step: (dir: "next" | "prev") => void;
  /** Web-only: route global wheel events here (supports mouse wheel + trackpad). */
  handleGlobalWheel: (e: WheelEvent) => void;
};

type Props = {
  cards: SettingsDeckCardSpec[];
  cardHeight?: number;
  /** Max pixel width of the card (desktop). */
  cardWidthMax?: number;
  /** Stage width ratio for card width (responsive). */
  cardWidthRatio?: number;
  /** Optional vertical bias to nudge the whole stack up/down. */
  centerBiasY?: number;
  maxVisible?: number;
  accent: string;
  onActiveIndexChange?: (index: number) => void;
};

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, v));
}

type RenderRole = "top" | "stack" | "incomingPrev";

type RenderItem = {
  key: string;
  idx: number;
  depth: number; // 0 = active/top, larger = deeper
  role: RenderRole;
};

export const SettingsWalletStack = forwardRef<SettingsWalletStackHandle, Props>(
  function SettingsWalletStack(
    {
      cards,
      cardHeight = 520,
      cardWidthMax = 920,
      cardWidthRatio = 0.985,
      centerBiasY = 0,
      maxVisible = 5,
      accent,
      onActiveIndexChange,
    }: Props,
    ref
  ) {
    const n = Math.max(1, cards.length);
    const [activeIndex, setActiveIndex] = useState(0);

    // Stage measurement (for true centering).
    const [stageW, setStageW] = useState(0);
    const [stageH, setStageH] = useState(0);

    // Animation state.
    const progress = useSharedValue(0); // [-1..1]
    const animLock = useSharedValue(0);

    // Pipelined step-through: after a partial swipe, we hand off to the next
    // card (so the next swipe can start immediately) while the outgoing card
    // finishes settling into the back.
    const carryIdx = useSharedValue(-1);
    const carryT = useSharedValue(0);
    const carryDir = useSharedValue(0); // 1 = next, -1 = prev
    const enterIdx = useSharedValue(-1);
    const enterT = useSharedValue(0);
    const activeIndexSV = useSharedValue(0);

    // Step-through queue.
    const queueRef = useRef<Array<"next" | "prev">>([]);
    const queueModeRef = useRef<"idle" | "running">("idle");

    // Wheel / trackpad (web).
    const wheelIdleTimer = useRef<any>(null);
    const wheelRunning = useRef(false);

    // Visual knobs.
    const PEEK_Y = 26; // depth separation (downward peeks)
    const EXIT = Math.min(cardHeight * 0.75, 520); // how far the active card travels upward
    const LIFT = 34;
    // Backward swipe: we want the outgoing (current) top card to move to depth-1,
    // but NOT land too low. We'll use a mid-swipe bump that returns to 0 at the end.
    const LIFT_BACK = 24;

    // Input tuning
    const DRAG_TO_PROGRESS = 520;
    const COMMIT_THRESH = 0.46;

    // Trackpad: smooth proportional control, then snap.
    const TRACKPAD_TO_PROGRESS = 0.0032;
    const TRACKPAD_IDLE_SNAP_MS = 160;

    // Mouse wheel: fixed-speed, discrete steps (no delta-based acceleration).
    const WHEEL_STEP_MS = 560;

    // Pipelining: hand off early so next steps can start before the outgoing
    // card fully reaches its back position.
    const PIPE_HANDOFF_AT = 0.68;

    // Motion profiles
    // - Single-step (adjacent, wheel/drag) should feel slower/premium.
    // - Multi-step jumps (>= 3 sections) can stay aggressive.
    const SINGLE_COMMIT_MS = 460;
// Slightly slower for forward (next) single-step swipes to feel more premium.
const SINGLE_NEXT_COMMIT_MS = 560;
const SINGLE_PREV_COMMIT_MS = 460;

    const PIPE_SEGMENT_FAST_MS = 170;
    const PIPE_CARRY_FAST_MS = 200;
    const PIPE_SEGMENT_MED_MS = 240;
    const PIPE_CARRY_MED_MS = 280;

    const pipeProfileRef = useRef<"fast" | "medium">("fast");
    const getPipeTimings = () =>
      pipeProfileRef.current === "fast"
        ? { segment: PIPE_SEGMENT_FAST_MS, carry: PIPE_CARRY_FAST_MS }
        : { segment: PIPE_SEGMENT_MED_MS, carry: PIPE_CARRY_MED_MS };

    // How many cards are visibly rendered.
    const visibleSlots = Math.max(1, Math.min(maxVisible, n));
    const tailDepth = Math.max(0, visibleSlots - 1);

    const rotate = (dir: "next" | "prev") => {
      setActiveIndex((prev) => {
        if (n <= 1) return prev;
        const next = dir === "next" ? (prev + 1) % n : (prev - 1 + n) % n;
        activeIndexSV.value = next;
        onActiveIndexChange?.(next);
        return next;
      });
    };

    // Sync shared index (initial + external changes).
    useEffect(() => {
      activeIndexSV.value = activeIndex;
    }, [activeIndex]);

    const runNextQueuedStep = () => {
      if (animLock.value) return;
      const next = queueRef.current.shift();
      if (!next) {
        queueModeRef.current = "idle";
        return;
      }

      // Pipelined step-through: hand off early so the next step can start
      // before the outgoing card fully settles into its destination.
      if (next === "next") commitToPipelinedNext();
      else commitToPipelinedPrev();
    };

    const unlockJS = () => {
      animLock.value = 0;
      if (queueModeRef.current === "running") runNextQueuedStep();
    };

    const commitTo = (
      target: -1 | 0 | 1,
      opts?: { duration?: number; after?: () => void }
    ) => {
      if (animLock.value) return;
      animLock.value = 1;
      cancelAnimation(progress);
      const duration =
        opts?.duration ??
        (target > 0 ? SINGLE_NEXT_COMMIT_MS : target < 0 ? SINGLE_PREV_COMMIT_MS : SINGLE_COMMIT_MS);

      progress.value = withTiming(
        target,
        { duration, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && target !== 0) {
            runOnJS(rotate)(target === 1 ? "next" : "prev");
          }
          progress.value = 0;
          if (opts?.after) runOnJS(opts.after)();
          runOnJS(unlockJS)();
        }
      );
    };

    const commitToPipelinedNext = () => {
      if (animLock.value) return;
      animLock.value = 1;

      const { segment, carry } = getPipeTimings();

      cancelAnimation(progress);
      cancelAnimation(carryT);

      // Clear any previous carry.
      carryIdx.value = -1;
      carryT.value = 0;
      carryDir.value = 0;
      enterIdx.value = -1;
      enterT.value = 0;

      // Stage 1: animate to a handoff point (so next step can start early).
      progress.value = withTiming(
        PIPE_HANDOFF_AT,
        { duration: segment, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (!finished) return;

          // Outgoing card finishes settling into the back while we unlock.
          const outgoing = activeIndexSV.value;
          carryIdx.value = outgoing;
          carryDir.value = 1;
          carryT.value = 0;
          carryT.value = withTiming(
            1,
            { duration: carry, easing: Easing.out(Easing.cubic) },
            (done) => {
              if (done) {
                carryIdx.value = -1;
                carryDir.value = 0;
              }
            }
          );

          // Handoff: rotate + unlock now.
          progress.value = 0;
          runOnJS(rotate)("next");
          runOnJS(unlockJS)();
        }
      );
    };

    const commitToPipelinedPrev = () => {
      if (animLock.value) return;
      animLock.value = 1;

      const { segment, carry } = getPipeTimings();

      cancelAnimation(progress);
      cancelAnimation(carryT);
      cancelAnimation(enterT);

      // Clear any previous carry.
      carryIdx.value = -1;
      carryT.value = 0;
      carryDir.value = 0;
      enterIdx.value = -1;
      enterT.value = 0;

      // Stage 1: animate to a handoff point (incoming previous card is already
      // visible from the top), then rotate early so we can start the next step.
      progress.value = withTiming(
        -PIPE_HANDOFF_AT,
        { duration: segment, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (!finished) return;

          const outgoing = activeIndexSV.value;
          const incoming = (outgoing - 1 + n) % n;

          // Outgoing card settles into its new depth while we unlock.
          carryIdx.value = outgoing;
          carryDir.value = -1;
          carryT.value = 0;
          carryT.value = withTiming(
            1,
            { duration: carry, easing: Easing.out(Easing.cubic) },
            (done) => {
              if (done) {
                carryIdx.value = -1;
                carryDir.value = 0;
              }
            }
          );

          // Incoming previous card continues dropping into place.
          enterIdx.value = incoming;
          enterT.value = 0;
          enterT.value = withTiming(
            1,
            { duration: carry, easing: Easing.out(Easing.cubic) },
            (done) => {
              if (done) {
                enterIdx.value = -1;
              }
            }
          );

          // Handoff: rotate + unlock now.
          progress.value = 0;
          runOnJS(rotate)("prev");
          runOnJS(unlockJS)();
        }
      );
    };

    const snapFromCurrent = () => {
      const p = progress.value;
      if (Math.abs(p) >= COMMIT_THRESH) commitTo(p > 0 ? 1 : -1);
      else commitTo(0);
    };

    const stepOnce = (dir: "next" | "prev", speed: "normal" | "fast" = "normal") => {
      if (animLock.value) return;
      if (queueModeRef.current === "running") return;
      commitTo(dir === "next" ? 1 : -1, {
        duration:
          speed === "fast"
            ? 320
            : dir === "next"
              ? SINGLE_NEXT_COMMIT_MS
              : SINGLE_PREV_COMMIT_MS,
      });
    };

    const goToIndex = (targetIndex: number) => {
      const t = Math.max(0, Math.min(n - 1, targetIndex));
      if (t === activeIndex || n <= 1) return;

      // Sequential step-through by ordering (no wrap shortcuts).
      const dir: "next" | "prev" = t > activeIndex ? "next" : "prev";
      const steps = Math.abs(t - activeIndex);

      // Adjacent jump: slower, premium single-step animation (no need to pipeline).
      if (steps <= 1) {
        commitTo(dir === "next" ? 1 : -1, { duration: dir === "next" ? SINGLE_NEXT_COMMIT_MS : SINGLE_PREV_COMMIT_MS });
        return;
      }

      // Multi-step: keep aggressive only when skipping >= 3 sections.
      pipeProfileRef.current = steps >= 3 ? "fast" : "medium";

      queueRef.current = Array.from({ length: steps }, () => dir);
      queueModeRef.current = "running";
      runNextQueuedStep();
    };

    const step = (dir: "next" | "prev") => stepOnce(dir, "normal");

    const handleGlobalWheel = (e: WheelEvent) => {
      if (Platform.OS !== "web") return;
      if (queueModeRef.current === "running") return;

      const dy = Number((e as any)?.deltaY ?? 0);
      if (!dy) return;

      const abs = Math.abs(dy);
      const deltaMode = Number((e as any)?.deltaMode ?? 0);

      // Heuristic: big deltas (or line-based) are almost always a physical mouse wheel.
      const isLikelyMouseWheel = deltaMode === 1 || abs >= 60;

      if (isLikelyMouseWheel) {
        const dir: "next" | "prev" = dy >= 0 ? "next" : "prev";

        // Mouse wheel: always at most ONE swipe per gesture burst.
        // If the user spins the wheel multiple notches quickly, we ignore the extras.
        if (animLock.value) return;
        if (wheelRunning.current) return;
        wheelRunning.current = true;

        commitTo(dir === "next" ? 1 : -1, {
          duration: WHEEL_STEP_MS,
          after: () => {
            wheelRunning.current = false;
          },
        });
        return;
      }

      // Trackpad: smooth + proportional, then snap after a short idle.
      if (animLock.value) return;
      cancelAnimation(progress);

      const dyClamped = clamp(dy, -35, 35);
      const nextTarget = clamp(
        progress.value + dyClamped * TRACKPAD_TO_PROGRESS,
        -1,
        1
      );

      progress.value = withTiming(nextTarget, {
        duration: 70,
        easing: Easing.out(Easing.cubic),
      });

      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => {
        snapFromCurrent();
      }, TRACKPAD_IDLE_SNAP_MS);
    };

    const pan = useMemo(() => {
      return Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-34, 34])
        .minDistance(4)
        .onUpdate((ev) => {
          if (animLock.value) return;
          if (queueModeRef.current === "running") return;
          const p = clamp(-ev.translationY / DRAG_TO_PROGRESS, -1, 1);
          progress.value = p;
        })
        .onEnd(() => {
          if (animLock.value) return;
          if (queueModeRef.current === "running") return;
          snapFromCurrent();
        });
    }, [DRAG_TO_PROGRESS]);

    useImperativeHandle(ref, () => ({ goToIndex, step, handleGlobalWheel }), [
      activeIndex,
      n,
    ]);

    const cardW = useMemo(() => {
      if (!stageW) return Math.min(cardWidthMax, 760);
      return Math.min(cardWidthMax, Math.max(420, stageW * cardWidthRatio));
    }, [cardWidthMax, cardWidthRatio, stageW]);

    const baseLeft = stageW ? (stageW - cardW) / 2 : 0;

    // Center the WHOLE visible stack (not just the top card).
    // Since peeks extend downward, we center cardHeight + tailDepth*PEEK_Y.
    const stackH = cardHeight + tailDepth * PEEK_Y;
    const baseTop = stageH ? (stageH - stackH) / 2 + centerBiasY : 0;

    const items: RenderItem[] = useMemo(() => {
      if (n <= 1) {
        return [{ key: `${cards[0]?.key ?? "card"}-0`, idx: 0, depth: 0, role: "top" }];
      }

      // Stack order front->back in a circular queue: active, next, ..., last(prev).
      const order = Array.from({ length: n }, (_, k) => (activeIndex + k) % n);

      // Visible selection: show front cards AND always show the last card as the deepest slot
      // when there are more items than visible slots. This makes the "swiped" card become last.
      let show: number[];
      if (n <= visibleSlots) {
        show = order.slice(0, visibleSlots);
      } else if (visibleSlots >= 3) {
        show = [...order.slice(0, visibleSlots - 1), order[n - 1]];
      } else {
        show = order.slice(0, visibleSlots);
      }

      const out: RenderItem[] = show.map((idx, depth) => ({
        key: `${cards[idx].key}-d${depth}`,
        idx,
        depth,
        role: depth === 0 ? "top" : "stack",
      }));

      // Incoming previous card (only visible during backward swipe).
      const prevIdx = (activeIndex - 1 + n) % n;
      out.push({
        key: `${cards[prevIdx].key}-incomingPrev`,
        idx: prevIdx,
        depth: 0,
        role: "incomingPrev",
      });

      // Render back-to-front to avoid overdraw weirdness; zIndex still controls stacking.
      return out;
    }, [activeIndex, cards, n, visibleSlots]);

    // Helper functions for depth styling.
    const depthY = (d: number) => {
      "worklet";
      return d * PEEK_Y;
    };
    const depthScale = (d: number) => {
      "worklet";
      return 1 - d * 0.03;
    };
    const depthOpacity = (d: number) => {
      "worklet";
      return 1 - d * 0.10;
    };

    return (
      <View
        style={[styles.stage, Platform.OS === "web" ? (styles as any).webStage : null]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setStageW(width);
          setStageH(height);
        }}
      >
        {items
          .slice()
          // Draw deeper first.
          .sort((a, b) => b.depth - a.depth)
          .map((it) => {
            const spec = cards[it.idx];
            const isTop = it.role === "top";

            const cardStyle = useAnimatedStyle(() => {
              const raw = progress.value;
              const p = clamp(raw, 0, 1);
              const q = clamp(-raw, 0, 1);

              // Polish: move the stack "conveyor-style" so the next/prev card
              // begins filling the top position immediately. This prevents a
              // visible "gap" while the active card travels.
              const easeShift = (x: number) => {
                "worklet";
                // Fast-at-start curve (0..1).
                return 1 - Math.pow(2, -8 * x);
              };
              const bumpMid = (t: number) => {
                "worklet";
                // 0 at endpoints, peak at 0.5
                return 4 * t * (1 - t);
              };
              const tf = clamp(easeShift(p), 0, 1);
              const tb = clamp(easeShift(q), 0, 1);

              const d0 = it.depth;

              // Base pose (resting)
              let y = depthY(d0);
              let s = depthScale(d0);
              let o = depthOpacity(d0);

              // --- FORWARD (next) ---
              // Goal: active card lifts upward then becomes the deepest "tail" card.
              if (p > 0) {
                if (it.role === "top") {
                  const yTail = depthY(tailDepth);
                  const sTail = depthScale(tailDepth);
                  const oTail = depthOpacity(tailDepth);

                  y = interpolate(p, [0, 0.65, 1], [0, -EXIT, yTail]);
                  s = interpolate(p, [0, 1], [1, sTail]);
                  o = interpolate(p, [0, 0.75, 1], [1, 0.94, oTail]);
                } else if (it.role === "stack") {
                  // Everyone else shifts one slot toward the front.
                  const d1 = clamp(d0 - 1, 0, tailDepth);
                  const y1 = depthY(d1);
                  const s1 = depthScale(d1);
                  const o1 = depthOpacity(d1);

                  y = y + (y1 - y) * tf - (d0 === 1 ? LIFT * tf : 0);
                  // Keep the stack tight: don't overshoot above the target slot.
                  if (y < y1) y = y1;
                  s = s + (s1 - s) * tf;
                  o = o + (o1 - o) * tf;
                } else if (it.role === "incomingPrev") {
                  // hidden during forward
                  o = 0;
                }
              }

              // --- PIPELINED CARRY ---
              // After an early handoff in multi-step jumps, the outgoing card
              // finishes settling into the back while the next step begins.
              if (carryIdx.value === it.idx) {
                if (carryDir.value === 1) {
                  const yTail = depthY(tailDepth);
                  const yAt = interpolate(
                    PIPE_HANDOFF_AT,
                    [0, 0.65, 1],
                    [0, -EXIT, yTail]
                  );
                  const delta = yAt - yTail;
                  y = y + interpolate(carryT.value, [0, 1], [delta, 0]);
                } else if (carryDir.value === -1) {
                  // In backward pipelining, the outgoing (previous active) card
                  // should settle into depth 1 after the early handoff.
                  const yFinal = depthY(1);
                  const yAt = yFinal * PIPE_HANDOFF_AT + LIFT_BACK * bumpMid(PIPE_HANDOFF_AT);
                  const delta = yAt - yFinal;
                  y = y + interpolate(carryT.value, [0, 1], [delta, 0]);
                }
              }

              // --- BACKWARD (prev) ---
              // Goal: previous card appears from the top, then drops into place as active.
              if (q > 0) {
                if (it.role === "incomingPrev") {
                  y = interpolate(q, [0, 0.78, 1], [-EXIT, -10, 0]);
                  s = interpolate(q, [0, 1], [0.995, 1]);
                  o = interpolate(q, [0, 0.15, 1], [0, 1, 1]);
                } else if (it.role === "top") {
                  const y1 = depthY(1);
                  const s1 = depthScale(1);
                  const o1 = depthOpacity(1);
                  // Outgoing card slides toward depth-1. Add a mid-swipe bump for separation,
                  // but return to 0 at the end so it doesn't land too low.
                  y = y + (y1 - y) * tb + LIFT_BACK * bumpMid(tb);
                  s = s + (s1 - s) * tb;
                  o = o + (o1 - o) * tb;
                } else if (it.role === "stack") {
                  // Shift everyone one slot deeper.
                  const d1 = clamp(d0 + 1, 0, tailDepth);
                  const y1 = depthY(d1);
                  const s1 = depthScale(d1);
                  const o1 = depthOpacity(d1);

                  y = y + (y1 - y) * tb;
                  s = s + (s1 - s) * tb;
                  o = o + (o1 - o) * tb;

                  // Hide the deepest prev card during backward swipe to avoid duplication
                  // (incomingPrev represents it).
                  if (d0 === tailDepth) {
                    o = o * (1 - tb);
                  }
                }
              }

              // --- PIPELINED ENTER ---
              // After an early handoff in backward step-through, the incoming
              // previous card continues dropping into place while we unlock.
              if (enterIdx.value === it.idx && it.role === "top") {
                const enterFrom = interpolate(
                  PIPE_HANDOFF_AT,
                  [0, 0.78],
                  [-EXIT, -10]
                );
                y = y + interpolate(enterT.value, [0, 1], [enterFrom, 0]);
              }

              // zIndex: keep top above except when it becomes tail at end of forward swipe.
              let z = 0;
              if (it.role === "incomingPrev") {
                z = q > 0 ? 450 : -1;
              } else if (it.role === "top") {
                z = p > 0.82 ? 60 : 420;
              } else {
                z = 300 - d0;
              }

              return {
                transform: [{ translateX: 0 }, { translateY: y }, { scale: s }],
                opacity: o,
                zIndex: z,
              };
            }, [EXIT, LIFT, LIFT_BACK, tailDepth, PIPE_HANDOFF_AT]);

            const borderAlpha =
              it.depth === 0
                ? 0.52
                : it.depth === 1
                  ? 0.24
                  : it.depth === 2
                    ? 0.17
                    : 0.12;
            const borderColor = `rgba(255,255,255,${borderAlpha})`;
            const bg = it.depth === 0 ? "rgba(18,18,18,0.988)" : "rgba(18,18,18,0.92)";

            const webShadow =
              it.depth === 0
                ? "0 34px 98px rgba(0,0,0,0.56)"
                : it.depth === 1
                  ? "0 26px 66px rgba(0,0,0,0.40)"
                  : "0 20px 52px rgba(0,0,0,0.30)";

            const node = (
              <Animated.View
                style={[
                  styles.card,
                  {
                    width: cardW,
                    height: cardHeight,
                    left: baseLeft,
                    top: baseTop,
                    borderColor,
                    backgroundColor: bg,
                    shadowColor: it.depth === 0 ? accent : "#000",
                    shadowOpacity: it.depth === 0 ? 0.18 : 0.10,
                    shadowRadius: it.depth === 0 ? 22 : 12,
                    shadowOffset: { width: 0, height: it.depth === 0 ? 14 : 9 },
                    elevation: it.depth === 0 ? 18 : 10,
                  },
                  Platform.OS === "web"
                    ? // @ts-expect-error web-only
                      ({ boxShadow: webShadow } as any)
                    : null,
                  cardStyle,
                ]}
                pointerEvents={isTop ? "auto" : "none"}
              >
                <View style={styles.header}>
                  <Animated.Text style={styles.title} numberOfLines={1}>
                    {spec.title}
                  </Animated.Text>
                </View>

                <View style={styles.body}>{isTop ? spec.render() : null}</View>
              </Animated.View>
            );

            // Only the active/top card is interactive (drag on whole surface).
            return isTop ? (
              <GestureDetector key={it.key} gesture={pan}>
                {node}
              </GestureDetector>
            ) : (
              <React.Fragment key={it.key}>{node}</React.Fragment>
            );
          })}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    borderRadius: 26,
    borderWidth: 4,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  webStage: {
    // @ts-expect-error web-only
    touchAction: "none",
  },
});
