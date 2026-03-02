import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import {
  resolveSettingsWalletContentOwnerKeySet,
  type SettingsWalletRenderItem,
  type SettingsWalletRenderRole,
} from './settingsWalletStack.contentOwner';

export type SettingsDeckCardSpec = {
  key: string;
  title: string;
  render: () => React.ReactNode;
  detailsEnabled?: boolean;
};

type WheelInputEvent = {
  deltaY?: number;
  deltaMode?: number;
};

export type SettingsWalletStackHandle = {
  goToIndex: (targetIndex: number) => void;
  step: (dir: 'next' | 'prev') => void;
  handleGlobalWheel: (e: WheelInputEvent) => void;
};

type Props = {
  cards: SettingsDeckCardSpec[];
  cardHeight?: number;
  cardWidthMax?: number;
  cardWidthRatio?: number;
  centerBiasY?: number;
  maxVisible?: number;
  onActiveIndexChange?: (index: number) => void;
  debug?: {
    useContentOwnerGating?: boolean;
    renderStackBodies?: boolean;
  };
};

function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, v));
}

type RenderItem = SettingsWalletRenderItem;

type WalletDeckCardProps = {
  it: RenderItem;
  spec: SettingsDeckCardSpec;
  cardW: number;
  cardHeight: number;
  baseLeft: number;
  baseTop: number;
  tailDepth: number;
  pan: any;
  PEEK_Y: number;
  EXIT: number;
  LIFT: number;
  LIFT_BACK: number;
  PIPE_HANDOFF_AT: number;
  progress: any;
  carryIdx: any;
  carryT: any;
  carryDir: any;
  enterIdx: any;
  enterT: any;
  isContentOwner: boolean;
  renderStackBodies: boolean;
};

function WalletDeckCard({
  it,
  spec,
  cardW,
  cardHeight,
  baseLeft,
  baseTop,
  tailDepth,
  pan,
  PEEK_Y,
  EXIT,
  LIFT,
  LIFT_BACK,
  PIPE_HANDOFF_AT,
  progress,
  carryIdx,
  carryT,
  carryDir,
  enterIdx,
  enterT,
  isContentOwner,
  renderStackBodies,
}: WalletDeckCardProps) {
  const isTop = it.role === 'top';
  const { palette } = useTheme();

  const androidDark = Platform.OS === 'android' && palette.mode === 'dark';

  const depthY = (d: number) => {
    'worklet';
    return d * PEEK_Y;
  };
  const depthScale = (d: number) => {
    'worklet';
    return 1 - d * 0.03;
  };
  const depthOpacity = (d: number) => {
    'worklet';
    // Android dark: avoid alpha blending artifacts (keep surfaces fully opaque).
    return androidDark ? 1 : 1 - d * 0.1;
  };

  const cardStyle = useAnimatedStyle(() => {
    const raw = progress.value;
    const p = clamp(raw, 0, 1);
    const q = clamp(-raw, 0, 1);

    const easeShift = (x: number) => {
      'worklet';
      return 1 - Math.pow(2, -8 * x);
    };
    const bumpMid = (t: number) => {
      'worklet';
      return 4 * t * (1 - t);
    };
    const tf = clamp(easeShift(p), 0, 1);
    const tb = clamp(easeShift(q), 0, 1);

    const d0 = it.depth;

    let y = depthY(d0);
    let s = depthScale(d0);
    let o = depthOpacity(d0);

    if (p > 0) {
      if (it.role === 'top') {
        const yTail = depthY(tailDepth);
        const sTail = depthScale(tailDepth);
        const oTail = depthOpacity(tailDepth);

        y = interpolate(p, [0, 0.65, 1], [0, -EXIT, yTail]);
        s = interpolate(p, [0, 1], [1, sTail]);
        o = interpolate(p, [0, 0.75, 1], [1, 0.94, oTail]);
      } else if (it.role === 'stack') {
        const d1 = clamp(d0 - 1, 0, tailDepth);
        const y1 = depthY(d1);
        const s1 = depthScale(d1);
        const o1 = depthOpacity(d1);

        y = y + (y1 - y) * tf - (d0 === 1 ? LIFT * tf : 0);
        if (y < y1) y = y1;
        s = s + (s1 - s) * tf;
        o = o + (o1 - o) * tf;
      } else if (it.role === 'incomingPrev') {
        o = 0;
      }
    }

    if (carryIdx.value === it.idx) {
      if (carryDir.value === 1) {
        const yTail = depthY(tailDepth);
        const yAt = interpolate(PIPE_HANDOFF_AT, [0, 0.65, 1], [0, -EXIT, yTail]);
        const delta = yAt - yTail;
        y = y + interpolate(carryT.value, [0, 1], [delta, 0]);
      } else if (carryDir.value === -1) {
        const yFinal = depthY(1);
        const yAt = yFinal * PIPE_HANDOFF_AT + LIFT_BACK * bumpMid(PIPE_HANDOFF_AT);
        const delta = yAt - yFinal;
        y = y + interpolate(carryT.value, [0, 1], [delta, 0]);
      }
    }

    if (q > 0) {
      if (it.role === 'incomingPrev') {
        y = interpolate(q, [0, 0.78, 1], [-EXIT, -10, 0]);
        s = interpolate(q, [0, 1], [0.995, 1]);
        o = interpolate(q, [0, 0.15, 1], [0, 1, 1]);
      } else if (it.role === 'top') {
        const y1 = depthY(1);
        const s1 = depthScale(1);
        const o1 = depthOpacity(1);
        y = y + (y1 - y) * tb + LIFT_BACK * bumpMid(tb);
        s = s + (s1 - s) * tb;
        o = o + (o1 - o) * tb;
      } else if (it.role === 'stack') {
        const d1 = clamp(d0 + 1, 0, tailDepth);
        const y1 = depthY(d1);
        const s1 = depthScale(d1);
        const o1 = depthOpacity(d1);

        y = y + (y1 - y) * tb;
        s = s + (s1 - s) * tb;
        o = o + (o1 - o) * tb;

        if (d0 === tailDepth) {
          o = o * (1 - tb);
        }
      }
    }

    if (enterIdx.value === it.idx && it.role === 'top') {
      const enterFrom = interpolate(PIPE_HANDOFF_AT, [0, 0.78], [-EXIT, -10]);
      y = y + interpolate(enterT.value, [0, 1], [enterFrom, 0]);
    }

    let z = 0;
    if (it.role === 'incomingPrev') {
      z = q > 0 ? 450 : -1;
    } else if (it.role === 'top') {
      z = p > 0.82 ? 60 : 420;
    } else {
      z = 300 - d0;
    }

    return {
      transform: [{ translateX: 0 }, { translateY: y }, { scale: s }],
      opacity: o,
      zIndex: z,
    };
  });

  
  const promoteWipeStyle = useAnimatedStyle(() => {
    const raw = progress.value;
    const p = clamp(raw, 0, 1);
    const isPromoting = it.role === 'stack' && it.depth === 1;
    if (!isPromoting || p <= 0) {
      return { height: 0 };
    }

    // Timing curve: hold [0..0.18], sweep [0.18..0.78] (easeOutCubic), settle [0.78..1]
    const holdEnd = 0.18;
    const sweepEnd = 0.78;
    let t = 0;
    if (p <= holdEnd) t = 0;
    else if (p >= sweepEnd) t = 1;
    else t = (p - holdEnd) / (sweepEnd - holdEnd);

    // easeOutCubic
    const e = 1 - Math.pow(1 - t, 3);
    return { height: cardHeight * e };
  });
  const borderColor = 'transparent';
  const walletRampDarkIOS = [
    palette.surface,
    '#101010',
    '#181818',
    '#202020',
    '#282828',
  ];
  const walletRampDarkAndroid = [
    palette.surface,
    '#141414',
    '#1d1d1d',
    '#262626',
    '#303030',
  ];
  const walletRampLight = [
    palette.surface,
    '#f6f6f6',
    '#efefef',
    '#e8e8e8',
    '#e1e1e1',
  ];
  const ramp =
    palette.mode === 'dark'
      ? Platform.OS === 'android'
        ? walletRampDarkAndroid
        : walletRampDarkIOS
      : walletRampLight;
  const bg = ramp[Math.min(it.depth, ramp.length - 1)];

  const webShadow =
    it.depth === 0
      ? '0 34px 98px rgba(0,0,0,0.56)'
      : it.depth === 1
        ? '0 26px 66px rgba(0,0,0,0.40)'
        : '0 20px 52px rgba(0,0,0,0.30)';

  const depthAllowsBody = renderStackBodies ? it.depth <= tailDepth : it.depth === 0;
  const shouldRenderBody = isContentOwner && depthAllowsBody;

  const node = (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          width: cardW,
          height: cardHeight,
          left: baseLeft,
          top: baseTop,
          borderColor,
          backgroundColor: bg,
          shadowColor: '#000',
          shadowOpacity: it.depth === 0 ? 0.18 : 0.1,
          shadowRadius: it.depth === 0 ? 22 : 12,
          shadowOffset: { width: 0, height: it.depth === 0 ? 14 : 9 },
          elevation: androidDark ? (it.depth === 0 ? 10 : 1) : it.depth === 0 ? 18 : 10,
        },
        Platform.OS === 'web' ? ({ boxShadow: webShadow } as any) : null,
        cardStyle,
      ]}
      pointerEvents={isTop ? 'auto' : 'none'}
    >
      <View style={styles.cardInner}>
        <Animated.View
          pointerEvents="none"
          style={[styles.promoteWipe, { backgroundColor: palette.surface }, promoteWipeStyle]}
        />
        <View style={styles.header}>
          <Animated.Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {spec.title}
          </Animated.Text>
        </View>

        <View style={styles.body}>{shouldRenderBody ? spec.render() : null}</View>
      </View>
    </Animated.View>
  );

  return isTop ? <GestureDetector gesture={pan}>{node}</GestureDetector> : node;
}

export const SettingsWalletStack = forwardRef<SettingsWalletStackHandle, Props>(
  function SettingsWalletStack(
    {
      cards,
      cardHeight = 520,
      cardWidthMax = 920,
      cardWidthRatio = 0.985,
      centerBiasY = 0,
      maxVisible = 5,
      onActiveIndexChange,
      debug,
    }: Props,
    ref,
  ) {
    const n = Math.max(1, cards.length);
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);
    const pendingHandoffRef = useRef(false);
    const [backContentActive, setBackContentActive] = useState(false);
    const backContentActiveRef = useRef(false);

    const [stageW, setStageW] = useState(0);
    const [stageH, setStageH] = useState(0);
    const [measuredOnce, setMeasuredOnce] = useState(false);

    const readyOpacity = useSharedValue(0);

    const progress = useSharedValue(0);
    const animLock = useSharedValue(0);

    const carryIdx = useSharedValue(-1);
    const carryT = useSharedValue(0);
    const carryDir = useSharedValue(0);
    const enterIdx = useSharedValue(-1);
    const enterT = useSharedValue(0);
    const activeIndexSV = useSharedValue(0);

    const queueRef = useRef<Array<'next' | 'prev'>>([]);
    const queueModeRef = useRef<'idle' | 'running'>('idle');
    const queueModeSV = useSharedValue(0);

    const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wheelRunning = useRef(false);

    const PEEK_Y = 26;
    const EXIT = Math.min(cardHeight * 0.75, 520);
    const LIFT = 34;
    const LIFT_BACK = 24;

    const DRAG_TO_PROGRESS = 400;
    const COMMIT_THRESH = 0.32;
    const FLICK_COMMIT_VELOCITY = 650;

    const TRACKPAD_TO_PROGRESS = 0.0032;
    const TRACKPAD_IDLE_SNAP_MS = 160;

    const WHEEL_STEP_MS = 560;
    const PIPE_HANDOFF_AT = 0.68;

    const SINGLE_COMMIT_MS = 460;
    const SINGLE_NEXT_COMMIT_MS = 560;
    const SINGLE_PREV_COMMIT_MS = 460;

    const PIPE_SEGMENT_FAST_MS = 170;
    const PIPE_CARRY_FAST_MS = 200;
    const PIPE_SEGMENT_MED_MS = 240;
    const PIPE_CARRY_MED_MS = 280;

    const pipeProfileRef = useRef<'fast' | 'medium'>('fast');
    const getPipeTimings = () =>
      pipeProfileRef.current === 'fast'
        ? { segment: PIPE_SEGMENT_FAST_MS, carry: PIPE_CARRY_FAST_MS }
        : { segment: PIPE_SEGMENT_MED_MS, carry: PIPE_CARRY_MED_MS };

    const visibleSlots = Math.max(1, Math.min(maxVisible, n));
    const tailDepth = Math.max(0, visibleSlots - 1);

    const setQueueMode = (mode: 'idle' | 'running') => {
      queueModeRef.current = mode;
      queueModeSV.value = mode === 'running' ? 1 : 0;
    };

    const rotate = (dir: 'next' | 'prev') => {
      if (n <= 1) return;
      const prev = activeIndexRef.current;
      const next = dir === 'next' ? (prev + 1) % n : (prev - 1 + n) % n;
      activeIndexRef.current = next;
      activeIndexSV.value = next;
      setActiveIndex(next);
    };

    // Handoff smoothing:
    // Reanimated callbacks finish on the UI thread, but React state commits on JS.
    // If we reset `progress` to 0 before the next activeIndex is committed, the UI
    // can show the previous card at rest for a frame ("refresh" flash). We defer
    // the reset/unlock until React commits the new activeIndex. useLayoutEffect
    // runs before paint, so the handoff becomes visually atomic.
    const rotateAndDeferReset = (dir: 'next' | 'prev') => {
      if (n <= 1) {
        progress.value = 0;
        unlockJS();
        return;
      }
      pendingHandoffRef.current = true;
      rotate(dir);
    };

    useEffect(() => {
      activeIndexRef.current = activeIndex;
      activeIndexSV.value = activeIndex;
      onActiveIndexChange?.(activeIndex);
    }, [activeIndex, onActiveIndexChange, activeIndexSV]);

    useLayoutEffect(() => {
      if (!pendingHandoffRef.current) return;
      pendingHandoffRef.current = false;
      progress.value = 0;
      unlockJS();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex]);

    useEffect(() => {
      return () => {
        if (wheelIdleTimer.current) {
          clearTimeout(wheelIdleTimer.current);
          wheelIdleTimer.current = null;
        }
      };
    }, []);

    const runNextQueuedStep = () => {
      if (animLock.value) return;
      const next = queueRef.current.shift();
      if (!next) {
        setQueueMode('idle');
        return;
      }
      if (next === 'next') commitToPipelinedNext();
      else commitToPipelinedPrev();
    };

    const unlockJS = () => {
      animLock.value = 0;
      if (queueModeRef.current === 'running') runNextQueuedStep();
    };

    const commitTo = (
      target: -1 | 0 | 1,
      opts?: { duration?: number; after?: () => void },
    ) => {
      if (animLock.value) return;
      animLock.value = 1;
      cancelAnimation(progress);
      const duration =
        opts?.duration ??
        (target > 0
          ? SINGLE_NEXT_COMMIT_MS
          : target < 0
            ? SINGLE_PREV_COMMIT_MS
            : SINGLE_COMMIT_MS);

      progress.value = withTiming(
        target,
        { duration, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && target !== 0) {
            runOnJS(rotateAndDeferReset)(target === 1 ? 'next' : 'prev');
            if (opts?.after) runOnJS(opts.after)();
            return;
          }
          progress.value = 0;
          if (opts?.after) runOnJS(opts.after)();
          runOnJS(unlockJS)();
        },
      );
    };

    const commitToPipelinedNext = () => {
      if (animLock.value) return;
      animLock.value = 1;

      const { segment, carry } = getPipeTimings();

      cancelAnimation(progress);
      cancelAnimation(carryT);

      carryIdx.value = -1;
      carryT.value = 0;
      carryDir.value = 0;
      enterIdx.value = -1;
      enterT.value = 0;

      progress.value = withTiming(
        PIPE_HANDOFF_AT,
        { duration: segment, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (!finished) return;

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
            },
          );

          progress.value = 0;
          runOnJS(rotate)('next');
          runOnJS(unlockJS)();
        },
      );
    };

    const commitToPipelinedPrev = () => {
      if (animLock.value) return;
      animLock.value = 1;

      const { segment, carry } = getPipeTimings();

      cancelAnimation(progress);
      cancelAnimation(carryT);
      cancelAnimation(enterT);

      carryIdx.value = -1;
      carryT.value = 0;
      carryDir.value = 0;
      enterIdx.value = -1;
      enterT.value = 0;

      progress.value = withTiming(
        -PIPE_HANDOFF_AT,
        { duration: segment, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (!finished) return;

          const outgoing = activeIndexSV.value;
          const incoming = (outgoing - 1 + n) % n;

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
            },
          );

          enterIdx.value = incoming;
          enterT.value = 0;
          enterT.value = withTiming(
            1,
            { duration: carry, easing: Easing.out(Easing.cubic) },
            (done) => {
              if (done) {
                enterIdx.value = -1;
              }
            },
          );

          progress.value = 0;
          runOnJS(rotate)('prev');
          runOnJS(unlockJS)();
        },
      );
    };

    const snapFromCurrent = () => {
      const p = progress.value;
      if (Math.abs(p) >= COMMIT_THRESH) commitTo(p > 0 ? 1 : -1);
      else commitTo(0);
    };

    const stepOnce = (dir: 'next' | 'prev', speed: 'normal' | 'fast' = 'normal') => {
      if (animLock.value) return;
      if (queueModeRef.current === 'running') return;
      commitTo(dir === 'next' ? 1 : -1, {
        duration:
          speed === 'fast'
            ? 320
            : dir === 'next'
              ? SINGLE_NEXT_COMMIT_MS
              : SINGLE_PREV_COMMIT_MS,
      });
    };

    const goToIndex = (targetIndex: number) => {
      const t = Math.max(0, Math.min(n - 1, targetIndex));
      if (t === activeIndex || n <= 1) return;

      const dir: 'next' | 'prev' = t > activeIndex ? 'next' : 'prev';
      const steps = Math.abs(t - activeIndex);

      if (steps <= 1) {
        commitTo(dir === 'next' ? 1 : -1, {
          duration: dir === 'next' ? SINGLE_NEXT_COMMIT_MS : SINGLE_PREV_COMMIT_MS,
        });
        return;
      }

      pipeProfileRef.current = steps >= 3 ? 'fast' : 'medium';

      queueRef.current = Array.from({ length: steps }, () => dir);
      setQueueMode('running');
      runNextQueuedStep();
    };

    const step = (dir: 'next' | 'prev') => stepOnce(dir, 'normal');

    const handleGlobalWheel = (e: WheelInputEvent) => {
      if (Platform.OS !== 'web') return;
      if (queueModeRef.current === 'running') return;

      const dy = Number(e?.deltaY ?? 0);
      if (!dy) return;

      const abs = Math.abs(dy);
      const deltaMode = Number(e?.deltaMode ?? 0);
      const isLikelyMouseWheel = deltaMode === 1 || abs >= 60;

      if (isLikelyMouseWheel) {
        const dir: 'next' | 'prev' = dy >= 0 ? 'next' : 'prev';
        if (animLock.value) return;
        if (wheelRunning.current) return;
        wheelRunning.current = true;

        commitTo(dir === 'next' ? 1 : -1, {
          duration: WHEEL_STEP_MS,
          after: () => {
            wheelRunning.current = false;
          },
        });
        return;
      }

      if (animLock.value) return;
      cancelAnimation(progress);

      const dyClamped = clamp(dy, -35, 35);
      const nextTarget = clamp(progress.value + dyClamped * TRACKPAD_TO_PROGRESS, -1, 1);

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
      const endWithVelocity = (velocityY: number) => {
        if (Math.abs(velocityY) >= FLICK_COMMIT_VELOCITY) {
          commitTo(velocityY < 0 ? 1 : -1);
          return;
        }
        snapFromCurrent();
      };

      return Gesture.Pan()
        .activeOffsetY([-4, 4])
        .failOffsetX([-34, 34])
        .minDistance(2)
        .onUpdate((ev) => {
          if (animLock.value) return;
          if (queueModeSV.value === 1) return;
          const p = clamp(-ev.translationY / DRAG_TO_PROGRESS, -1, 1);
          progress.value = p;
        })
        .onEnd((ev) => {
          if (animLock.value) return;
          if (queueModeSV.value === 1) return;
          runOnJS(endWithVelocity)(ev.velocityY);
        });
    }, [
      DRAG_TO_PROGRESS,
      FLICK_COMMIT_VELOCITY,
      animLock,
      commitTo,
      progress,
      queueModeSV,
      snapFromCurrent,
    ]);

    useImperativeHandle(
      ref,
      () => ({ goToIndex, step, handleGlobalWheel }),
      [activeIndex, n],
    );

    const cardW = useMemo(() => {
      const MIN_W = 280;
      const safeStage = stageW ? Math.max(1, stageW - 12) : 0;

      if (!stageW) {
        return Math.max(MIN_W, Math.min(cardWidthMax, 760));
      }

      const desired = stageW * cardWidthRatio;
      const capped = Math.min(cardWidthMax, desired);
      if (safeStage <= MIN_W) {
        return safeStage;
      }
      return Math.max(MIN_W, Math.min(capped, safeStage));
    }, [cardWidthMax, cardWidthRatio, stageW]);

    const baseLeft = stageW ? (stageW - cardW) / 2 : 0;

    const stackH = cardHeight + tailDepth * PEEK_Y;
    const baseTop = stageH ? (stageH - stackH) / 2 + centerBiasY : 0;
    const stageReady = measuredOnce && stageW > 0;

    useEffect(() => {
      if (stageReady) {
        readyOpacity.value = withTiming(1, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        });
        return;
      }

      readyOpacity.value = 0;
      const t = setTimeout(() => {
        readyOpacity.value = withTiming(1, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        });
      }, 250);
      return () => clearTimeout(t);
    }, [stageReady, readyOpacity]);

    const stageFade = useAnimatedStyle(() => {
      return { opacity: readyOpacity.value };
    });

    const setBackContentActiveJS = (next: boolean) => {
      if (backContentActiveRef.current === next) return;
      backContentActiveRef.current = next;
      setBackContentActive(next);
    };

    useAnimatedReaction(
      () => {
        const backDragActive = progress.value < -0.001;
        const backCarryActive = carryDir.value === -1 && carryIdx.value >= 0;
        const backEnterActive = enterIdx.value >= 0;
        return backDragActive || backCarryActive || backEnterActive;
      },
      (next, prev) => {
        if (next === prev) return;
        runOnJS(setBackContentActiveJS)(next);
      },
    );

    const items: RenderItem[] = useMemo(() => {
      if (n <= 1) {
        return [{ key: `${cards[0]?.key ?? 'card'}`, idx: 0, depth: 0, role: 'top' }];
      }

      const order = Array.from({ length: n }, (_, k) => (activeIndex + k) % n);

      let show: number[];
      if (n <= visibleSlots) {
        show = order.slice(0, visibleSlots);
      } else if (visibleSlots >= 3) {
        show = [...order.slice(0, visibleSlots - 1), order[n - 1]];
      } else {
        show = order.slice(0, visibleSlots);
      }

      const out: RenderItem[] = show.map((idx, depth) => ({
        key: `${cards[idx].key}`,
        idx,
        depth,
        role: (depth === 0 ? 'top' : 'stack') as SettingsWalletRenderRole,
      }));

      const prevIdx = (activeIndex - 1 + n) % n;
      out.push({
        key: `${cards[prevIdx].key}-incomingPrev`,
        idx: prevIdx,
        depth: 0,
        role: 'incomingPrev',
      });

      return out;
    }, [activeIndex, cards, n, visibleSlots]);

    const contentOwnerKeys = useMemo(
      () =>
        resolveSettingsWalletContentOwnerKeySet({
          items,
          backActive: backContentActive,
        }),
      [backContentActive, items],
    );

    // Debug toggles (lab only usage)
    const useContentOwnerGating = debug?.useContentOwnerGating ?? true;
    const renderStackBodies = debug?.renderStackBodies ?? true;

    return (
      <Animated.View
        style={[
          styles.stage,
          Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : null,
          stageFade,
        ]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;

          if (!measuredOnce) setMeasuredOnce(true);
          if (width > 0) setStageW(width);
          if (height > 0) setStageH(height);
        }}
      >
        {items
          .slice()
          .sort((a, b) => b.depth - a.depth)
          .map((it) => (
            <WalletDeckCard
              key={it.key}
              it={it}
              spec={cards[it.idx]}
              cardW={cardW}
              cardHeight={cardHeight}
              baseLeft={baseLeft}
              baseTop={baseTop}
              tailDepth={tailDepth}
              pan={pan}
              PEEK_Y={PEEK_Y}
              EXIT={EXIT}
              LIFT={LIFT}
              LIFT_BACK={LIFT_BACK}
              PIPE_HANDOFF_AT={PIPE_HANDOFF_AT}
              progress={progress}
              carryIdx={carryIdx}
              carryT={carryT}
              carryDir={carryDir}
              enterIdx={enterIdx}
              enterT={enterT}
              isContentOwner={useContentOwnerGating ? contentOwnerKeys.has(it.key) : true}
              renderStackBodies={renderStackBodies}
            />
          ))}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOuter: {
    position: 'absolute',
    borderRadius: 26,
    borderWidth: 0,
  },
  cardInner: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  promoteWipe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
});
