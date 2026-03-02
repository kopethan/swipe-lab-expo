import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  DISMISS_MS,
  NEXT_DISMISS_X_RATIO,
  NEXT_FAST_SWIPE_VX,
  NEXT_RAIL_K,
  PREV_COMMIT_MS,
  PREV_FAST_SWIPE_MAX_ABS_VY,
  PREV_FAST_SWIPE_VX,
  PREV_PULL_COMMIT_RATIO,
  PREV_PULL_X_RATIO,
  PREV_RESET_MS,
  PREV_START_X_RATIO,
  STACK_SHIFT_SNAP_MS,
  TAP_MAX_DISTANCE,
  TAP_MAX_DURATION_MS,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_RADIUS,
} from '../deck.constants';
import type { Intent, SwipeDeckProps, TailTransition } from '../deck.types';
import {
  buildStackLayers,
  clamp,
  classifyPanIntent,
  getBackLayerVisibilityModel,
  getNextCardIndex,
  getPreviousCardIndex,
  getRunoutState,
  getStageBounds,
  resolveCardSize,
  resolveStackOffsets,
  shouldStabilizeTailRunoutTransition,
} from '../deck.utils';
import {
  getNextGhostLaunchPose,
  getPreloadedPrevIndex,
  resolvePreloadedPrevSync,
  shouldAbortPrevHandoff,
  shouldFinalizePrevHandoff,
} from '../swipeDeck.handoff';
import {
  resolveSwipeDeckContentOwnerKeySet,
  type SwipeDeckContentOwnerEntry,
} from '../swipeDeck.contentOwner';
import { DeckCardShell } from './DeckCardShell';
import { useTheme } from '../../../providers/ThemeProvider';

const SPRING_CONFIG = { damping: 18, stiffness: 240 };

export function SwipeDeck<T>({
  cards,
  renderCard,
  onIndexChange,
  onEndReached,
  onCardPress,
  disableNextAtEnd = true,
  initialIndex = 0,
  sizes,
  onDragStateChange,
  debug,
}: SwipeDeckProps<T>) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { palette } = useTheme();
  const isLightMode = palette.mode === 'light';
  const androidDark = Platform.OS === 'android' && palette.mode === 'dark';

  // Feed deck depth ramp (match web). Top card stays pure surface.
  // Opaque only; no gradients; no transparency.
  const deckSurface0 = palette.surface;
  const deckSurface1 = isLightMode ? '#f6f6f6' : androidDark ? '#141414' : '#101010';
  const deckSurface2 = isLightMode ? '#efefef' : androidDark ? '#1d1d1d' : '#181818';
  const deckSurface3 = isLightMode ? '#e8e8e8' : androidDark ? '#262626' : '#202020';

  const stack = useMemo(() => buildStackLayers(resolveStackOffsets(sizes?.stackOffsets)), [sizes?.stackOffsets]);
  const cardSize = resolveCardSize(screenWidth, sizes?.cardSize);
  const borderWidth = sizes?.borderWidth ?? DEFAULT_BORDER_WIDTH;
  const radius = sizes?.radius ?? DEFAULT_RADIUS;
  const stageBounds = useMemo(() => getStageBounds(stack, cardSize), [cardSize, stack]);

  // Debug toggles (lab only usage)
  const renderBackCardBodies = debug?.renderBackCardBodies ?? true;
  const useContentOwnerGating = debug?.useContentOwnerGating ?? true;

  const diagonalOverlayBaseStyle = useMemo(() => {
    const size = cardSize * 2.8;
    const offset = (cardSize - size) / 2;
    return {
      position: 'absolute' as const,
      left: offset,
      top: offset,
      width: size,
      height: size,
    };
  }, [cardSize]);

  const nextDismissX = cardSize * NEXT_DISMISS_X_RATIO;
  const prevPullX = cardSize * PREV_PULL_X_RATIO;
  const prevStartX = cardSize * PREV_START_X_RATIO;
  const prevStartY = -Math.abs(prevStartX) * NEXT_RAIL_K;

  const cardsRef = useRef(cards);
  const draggingRef = useRef(false);
  const ghostPrevActiveRef = useRef(false);
  const ghostNextActiveRef = useRef(false);
  const prevCommitPendingRef = useRef(false);
  const prevCommitFromIndexRef = useRef<number | null>(null);
  const prevCommitToIndexRef = useRef<number | null>(null);

  const initialClampedIndex = clamp(initialIndex, 0, Math.max(cards.length - 1, 0));
  const initialGhostPrevIndex = getPreloadedPrevIndex(initialClampedIndex, cards.length);
  const [index, setIndex] = useState(() => initialClampedIndex);
  const [ghostIndex, setGhostIndex] = useState<number | null>(null);
  const [ghostPrevIndex, setGhostPrevIndex] = useState<number | null>(initialGhostPrevIndex);
  const [ghostPrevActive, setGhostPrevActive] = useState(false);
  const [ghostNextActive, setGhostNextActive] = useState(false);
  const ghostPrevIndexRef = useRef<number | null>(initialGhostPrevIndex);
  const [tailTransition, setTailTransition] = useState<TailTransition | null>(null);

  const indexSV = useSharedValue(index);
  const cardCountSV = useSharedValue(cards.length);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const stackShiftT = useSharedValue(0);
  const stackShiftDir = useSharedValue<1 | -1>(1);

  const ghostPrevX = useSharedValue(prevStartX);
  const ghostPrevY = useSharedValue(prevStartY);
  const ghostPrevOpacity = useSharedValue(0);
  const ghostPrevScale = useSharedValue(1);

  const prevMode = useSharedValue(false);

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(1);
  const ghostScale = useSharedValue(1);
  const tailFade = useSharedValue(0);

  const intent = useSharedValue<Intent>('UNDECIDED');
  const startAbsX = useSharedValue(0);
  const startAbsY = useSharedValue(0);
  const transitionLock = useSharedValue(false);

  const setDraggingState = useCallback(
    (next: boolean) => {
      if (draggingRef.current === next) return;
      draggingRef.current = next;
      onDragStateChange?.(next);
    },
    [onDragStateChange],
  );

  const setGhostPrevActiveJS = useCallback((next: boolean) => {
    if (ghostPrevActiveRef.current === next) return;
    ghostPrevActiveRef.current = next;
    setGhostPrevActive(next);
  }, []);

  const setGhostNextActiveJS = useCallback((next: boolean) => {
    if (ghostNextActiveRef.current === next) return;
    ghostNextActiveRef.current = next;
    setGhostNextActive(next);
  }, []);

  const clearGhostJS = useCallback(() => {
    setGhostIndex(null);
    setGhostNextActiveJS(false);
    setTailTransition(null);
    setDraggingState(false);
  }, [setDraggingState, setGhostNextActiveJS]);

  const clearGhostPrevJS = useCallback(() => {
    setGhostPrevActiveJS(false);
    setDraggingState(false);
  }, [setDraggingState, setGhostPrevActiveJS]);

  const clearTailTransitionJS = useCallback(() => {
    setTailTransition(null);
  }, []);

  const emitIndexChangeJS = useCallback(
    (nextIndex: number) => {
      const nextCard = cardsRef.current[nextIndex];
      if (!nextCard) return;
      onIndexChange?.(nextIndex, nextCard);
      if (nextIndex === cardsRef.current.length - 1) {
        onEndReached?.(nextIndex, nextCard);
      }
    },
    [onEndReached, onIndexChange],
  );

  const emitEndReachedJS = useCallback(() => {
    const lastIndex = cardsRef.current.length - 1;
    if (lastIndex < 0) return;
    const lastCard = cardsRef.current[lastIndex];
    if (!lastCard) return;
    onEndReached?.(lastIndex, lastCard);
  }, [onEndReached]);

  const syncGhostPrevIndexJS = useCallback((currentIndex: number) => {
    const { nextPreloadedPrevIndex, changed } = resolvePreloadedPrevSync({
      currentPreloadedPrevIndex: ghostPrevIndexRef.current,
      currentIndex,
      cardsLength: cardsRef.current.length,
    });
    if (!changed) return;
    ghostPrevIndexRef.current = nextPreloadedPrevIndex;
    setGhostPrevIndex(nextPreloadedPrevIndex);
  }, []);

  const acceptNextJS = useCallback(
    (fromIndex: number) => {
      const nextIndex = getNextCardIndex(fromIndex, cardsRef.current.length, disableNextAtEnd);
      if (nextIndex === fromIndex) {
        emitEndReachedJS();
        return;
      }

      if (shouldStabilizeTailRunoutTransition(fromIndex, nextIndex, cardsRef.current.length)) {
        setTailTransition({ fromIndex, toIndex: nextIndex });
      } else {
        setTailTransition(null);
      }

      setGhostIndex(fromIndex);
      setGhostNextActiveJS(true);
      syncGhostPrevIndexJS(nextIndex);
      setIndex(nextIndex);
      emitIndexChangeJS(nextIndex);
    },
    [disableNextAtEnd, emitEndReachedJS, emitIndexChangeJS, setGhostNextActiveJS, syncGhostPrevIndexJS],
  );

  const startPrevCommitJS = useCallback((fromIndex: number) => {
    const prevIndex = getPreviousCardIndex(fromIndex);
    if (prevIndex === fromIndex) {
      setTailTransition(null);
      return;
    }

    if (shouldStabilizeTailRunoutTransition(fromIndex, prevIndex, cardsRef.current.length)) {
      setTailTransition({ fromIndex, toIndex: prevIndex });
    } else {
      setTailTransition(null);
    }
  }, []);

  const finalizePrevCommitJS = useCallback(
    (fromIndex: number) => {
      const prevIndex = getPreviousCardIndex(fromIndex);
      if (prevIndex === fromIndex) {
        prevCommitPendingRef.current = false;
        prevCommitFromIndexRef.current = null;
        prevCommitToIndexRef.current = null;
        setGhostPrevActiveJS(false);
        setDraggingState(false);
        return;
      }

      prevCommitPendingRef.current = true;
      prevCommitFromIndexRef.current = fromIndex;
      prevCommitToIndexRef.current = prevIndex;
      syncGhostPrevIndexJS(prevIndex);
      setIndex(prevIndex);
      emitIndexChangeJS(prevIndex);
      setDraggingState(false);
    },
    [emitIndexChangeJS, setDraggingState, setGhostPrevActiveJS, syncGhostPrevIndexJS],
  );

  const handleCardPressJS = useCallback(
    (currentIndex: number) => {
      if (!onCardPress) return;
      const card = cardsRef.current[currentIndex];
      if (!card) return;
      onCardPress(currentIndex, card);
    },
    [onCardPress],
  );

  useEffect(() => {
    cardsRef.current = cards;
    cardCountSV.value = cards.length;
  }, [cardCountSV, cards]);

  useEffect(() => {
    indexSV.value = index;
  }, [index, indexSV]);

  useEffect(() => {
    ghostPrevX.value = prevStartX;
    ghostPrevY.value = prevStartY;
  }, [ghostPrevX, ghostPrevY, prevStartX, prevStartY]);

  useEffect(() => {
    syncGhostPrevIndexJS(index);
  }, [cards.length, index, syncGhostPrevIndexJS]);

  useEffect(() => {
    if (ghostIndex != null) return;
    setGhostNextActiveJS(false);
  }, [ghostIndex, setGhostNextActiveJS]);

  useEffect(() => {
    if (ghostPrevIndex != null) return;
    setGhostPrevActiveJS(false);
  }, [ghostPrevIndex, setGhostPrevActiveJS]);

  useEffect(() => {
    if (cards.length === 0) {
      setIndex(0);
      setGhostIndex(null);
      ghostPrevIndexRef.current = null;
      setGhostPrevIndex(null);
      setGhostPrevActiveJS(false);
      setGhostNextActiveJS(false);
      setTailTransition(null);
      setDraggingState(false);
      return;
    }
    setIndex((curr) => clamp(curr, 0, cards.length - 1));
    setGhostIndex((curr) => (curr != null && curr >= cards.length ? null : curr));
    setGhostPrevIndex((curr) => {
      const next = curr != null && curr >= cards.length ? null : curr;
      ghostPrevIndexRef.current = next;
      return next;
    });
    setTailTransition((curr) => {
      if (!curr) return null;
      if (curr.fromIndex >= cards.length || curr.toIndex >= cards.length) return null;
      return curr;
    });
  }, [cards.length, setDraggingState, setGhostNextActiveJS, setGhostPrevActiveJS]);

  useEffect(() => {
    return () => {
      setDraggingState(false);
    };
  }, [setDraggingState]);

  useLayoutEffect(() => {
    const validHandoffToIndex =
      prevCommitToIndexRef.current != null && prevCommitToIndexRef.current >= 0 && prevCommitToIndexRef.current < cards.length
        ? prevCommitToIndexRef.current
        : null;
    const shouldAbort = shouldAbortPrevHandoff({
      pending: prevCommitPendingRef.current,
      handoffFromIndex: prevCommitFromIndexRef.current,
      handoffToIndex: validHandoffToIndex,
      cardsLength: cards.length,
    });
    if (shouldAbort) {
      prevCommitPendingRef.current = false;
      prevCommitFromIndexRef.current = null;
      prevCommitToIndexRef.current = null;
      transitionLock.value = false;
      stackShiftT.value = 0;
      prevMode.value = false;
      intent.value = 'UNDECIDED';
      ghostPrevOpacity.value = 0;
      ghostPrevScale.value = 1;
      ghostPrevX.value = prevStartX;
      ghostPrevY.value = prevStartY;
      setGhostPrevActiveJS(false);
      return;
    }
    const shouldFinalize = shouldFinalizePrevHandoff({
      pending: prevCommitPendingRef.current,
      handoffFromIndex: prevCommitFromIndexRef.current,
      handoffToIndex: validHandoffToIndex,
      currentIndex: index,
    });
    if (!shouldFinalize) return;

    prevCommitPendingRef.current = false;
    prevCommitFromIndexRef.current = null;
    prevCommitToIndexRef.current = null;

    transitionLock.value = false;
    stackShiftT.value = 0;
    prevMode.value = false;
    intent.value = 'UNDECIDED';
    ghostPrevOpacity.value = 0;
    ghostPrevScale.value = 1;
    ghostPrevX.value = prevStartX;
    ghostPrevY.value = prevStartY;
    setGhostPrevActiveJS(false);
  }, [
    cards.length,
    ghostPrevOpacity,
    ghostPrevScale,
    ghostPrevX,
    ghostPrevY,
    index,
    intent,
    prevMode,
    prevStartX,
    prevStartY,
    setGhostPrevActiveJS,
    stackShiftT,
    transitionLock,
  ]);

  const snapStackShiftToZero = () => {
    'worklet';
    stackShiftT.value = withTiming(0, { duration: STACK_SHIFT_SNAP_MS, easing: Easing.out(Easing.quad) });
  };

  const resetTopVisuals = () => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
  };

  const resetDragCard = () => {
    'worklet';
    transitionLock.value = false;
    tailFade.value = 0;
    tx.value = withSpring(0, SPRING_CONFIG);
    ty.value = withSpring(0, SPRING_CONFIG);
    resetTopVisuals();
    snapStackShiftToZero();
    intent.value = 'UNDECIDED';
    runOnJS(setDraggingState)(false);
  };

  const resetPrevCard = () => {
    'worklet';
    transitionLock.value = false;
    prevMode.value = false;
    tailFade.value = 0;
    ghostPrevScale.value = 1;
    snapStackShiftToZero();

    ghostPrevX.value = withTiming(prevStartX, { duration: PREV_RESET_MS, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(prevStartY, { duration: PREV_RESET_MS, easing: Easing.out(Easing.cubic) }, (fin?: boolean) => {
      if (fin) {
        ghostPrevOpacity.value = 0;
        runOnJS(clearGhostPrevJS)();
      }
    });
    intent.value = 'UNDECIDED';
  };

  const startGhostDismiss = () => {
    'worklet';
    transitionLock.value = true;
    prevMode.value = false;
    ghostPrevX.value = prevStartX;
    ghostPrevY.value = prevStartY;
    ghostPrevOpacity.value = 0;
    // Commit NEXT should immediately settle stack layers so upcoming cards
    // promote by one without a post-commit snap animation.
    stackShiftT.value = 0;

    const launch = getNextGhostLaunchPose({
      currentX: tx.value,
      currentY: ty.value,
      cardSize,
      nextDismissX,
      railK: NEXT_RAIL_K,
    });
    ghostX.value = launch.x;
    ghostY.value = launch.y;
    ghostOpacity.value = opacity.value;
    ghostScale.value = scale.value;

    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
    scale.value = 1;

    tailFade.value = 1;
    tailFade.value = withTiming(0, { duration: DISMISS_MS, easing: Easing.out(Easing.quad) }, (fin?: boolean) => {
      if (fin) runOnJS(clearTailTransitionJS)();
    });

    ghostOpacity.value = withTiming(0, { duration: DISMISS_MS, easing: Easing.out(Easing.quad) });
    ghostScale.value = withTiming(0.96, { duration: DISMISS_MS, easing: Easing.out(Easing.quad) });
    ghostX.value = withTiming(-screenWidth * 1.2, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) });
    ghostY.value = withTiming(-screenHeight * 0.45, { duration: DISMISS_MS, easing: Easing.out(Easing.cubic) }, (fin?: boolean) => {
      transitionLock.value = false;
      if (fin) runOnJS(clearGhostJS)();
    });
  };

  const commitPrevCard = () => {
    'worklet';
    transitionLock.value = true;
    runOnJS(setGhostPrevActiveJS)(true);
    runOnJS(startPrevCommitJS)(Math.floor(indexSV.value));
    ghostPrevOpacity.value = withTiming(1, { duration: STACK_SHIFT_SNAP_MS, easing: Easing.out(Easing.quad) });
    ghostPrevScale.value = withTiming(1, { duration: STACK_SHIFT_SNAP_MS, easing: Easing.out(Easing.quad) });

    tailFade.value = 1;
    tailFade.value = withTiming(0, { duration: PREV_COMMIT_MS + STACK_SHIFT_SNAP_MS, easing: Easing.out(Easing.quad) }, (fin?: boolean) => {
      if (fin) runOnJS(clearTailTransitionJS)();
    });

    stackShiftDir.value = -1;
    stackShiftT.value = withTiming(1, { duration: PREV_COMMIT_MS, easing: Easing.out(Easing.cubic) });

    ghostPrevX.value = withTiming(0, { duration: PREV_COMMIT_MS, easing: Easing.out(Easing.cubic) });
    ghostPrevY.value = withTiming(0, { duration: PREV_COMMIT_MS, easing: Easing.out(Easing.cubic) }, (fin?: boolean) => {
      if (fin) {
        runOnJS(finalizePrevCommitJS)(Math.floor(indexSV.value));
      } else {
        transitionLock.value = false;
      }
    });
  };

  const tapGesture = Gesture.Tap()
    .maxDistance(TAP_MAX_DISTANCE)
    .maxDuration(TAP_MAX_DURATION_MS)
    .onEnd(() => {
      runOnJS(handleCardPressJS)(Math.floor(indexSV.value));
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event: any) => {
      'worklet';
      if (transitionLock.value) return;
      const touch = event.allTouches[0];
      if (!touch) return;
      startAbsX.value = touch.absoluteX;
      startAbsY.value = touch.absoluteY;

      intent.value = 'UNDECIDED';
      prevMode.value = false;
      ghostPrevX.value = prevStartX;
      ghostPrevY.value = prevStartY;
      ghostPrevOpacity.value = 0;
      runOnJS(setGhostPrevActiveJS)(false);
      runOnJS(setDraggingState)(false);
    })
    .onTouchesMove((event: any, state: any) => {
      'worklet';
      if (transitionLock.value) {
        state.fail();
        return;
      }
      if (intent.value !== 'UNDECIDED') return;

      const touch = event.allTouches[0];
      if (!touch) return;
      const dx = touch.absoluteX - startAbsX.value;
      const dy = touch.absoluteY - startAbsY.value;
      const hasPrevNow = indexSV.value > 0;
      const hasNextNow = indexSV.value < cardCountSV.value - 1;

      const nextIntent = classifyPanIntent({
        dx,
        dy,
        startAbsX: startAbsX.value,
        hasPrev: hasPrevNow,
        hasNext: hasNextNow,
      });

      if (nextIntent === 'UNDECIDED') return;

      if (nextIntent === 'SCROLL') {
        intent.value = 'SCROLL';
        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;
        runOnJS(setDraggingState)(false);
        state.fail();
        return;
      }

      intent.value = nextIntent;
      runOnJS(setDraggingState)(true);
      state.activate();
    })
    .onUpdate((event: any) => {
      'worklet';
      if (transitionLock.value) return;
      const dx = event.translationX;
      const dy = event.translationY;

      if (intent.value === 'SCROLL') return;

      if (intent.value === 'SWIPE_NEXT') {
        if (!(indexSV.value < cardCountSV.value - 1)) return;

        stackShiftDir.value = 1;
        const x = Math.min(dx, 0);
        tx.value = x;

        stackShiftT.value = clamp(Math.abs(x) / nextDismissX, 0, 1);

        const railY = -Math.abs(x) * NEXT_RAIL_K;
        const dyUpOnly = Math.min(dy, 0);
        ty.value = railY + dyUpOnly * 0.12;

        const p = clamp(Math.abs(x) / nextDismissX, 0, 1);
        opacity.value = 1 - 0.35 * p;
        scale.value = 1 - 0.03 * p;
        return;
      }

      if (intent.value === 'SWIPE_PREV') {
        if (!(indexSV.value > 0)) return;

        stackShiftDir.value = -1;

        tx.value = 0;
        ty.value = 0;
        opacity.value = 1;
        scale.value = 1;

        if (!prevMode.value) {
          prevMode.value = true;
          runOnJS(setGhostPrevActiveJS)(true);
          ghostPrevX.value = prevStartX;
          ghostPrevY.value = prevStartY;
          ghostPrevOpacity.value = 1;
          ghostPrevScale.value = 1;
        }

        const pull = clamp(dx, 0, prevPullX);
        const t = pull / prevPullX;

        stackShiftT.value = clamp(t, 0, 1);
        ghostPrevX.value = prevStartX + (0 - prevStartX) * t;
        ghostPrevY.value = prevStartY + (0 - prevStartY) * t;
        ghostPrevScale.value = 0.985 + 0.015 * t;
        ghostPrevOpacity.value = 0.9 + 0.1 * t;
      }
    })
    .onEnd((event: any) => {
      'worklet';
      if (transitionLock.value) return;
      const vx = event.velocityX;
      const vy = event.velocityY;

      if (intent.value === 'SCROLL' || intent.value === 'UNDECIDED') {
        intent.value = 'UNDECIDED';
        runOnJS(setDraggingState)(false);
        return;
      }

      if (intent.value === 'SWIPE_NEXT') {
        const canNext = indexSV.value < cardCountSV.value - 1;
        if (!canNext) {
          resetDragCard();
          runOnJS(emitEndReachedJS)();
          return;
        }

        const leftEnough = tx.value < -nextDismissX;
        const fastLeft = vx < NEXT_FAST_SWIPE_VX;

        if (leftEnough || fastLeft) {
          runOnJS(acceptNextJS)(Math.floor(indexSV.value));
          startGhostDismiss();
          intent.value = 'UNDECIDED';
        } else {
          resetDragCard();
        }
        return;
      }

      if (intent.value === 'SWIPE_PREV') {
        const canPrev = indexSV.value > 0;
        if (!canPrev) {
          resetPrevCard();
          return;
        }

        const pulledEnough = event.translationX > prevPullX * PREV_PULL_COMMIT_RATIO;
        const fastRight = vx > PREV_FAST_SWIPE_VX && Math.abs(vy) < PREV_FAST_SWIPE_MAX_ABS_VY;

        if (pulledEnough || fastRight) {
          commitPrevCard();
        } else {
          resetPrevCard();
        }
      }
    });

  const cardGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const runoutState = getRunoutState(index, cards.length, stack);

  const currentCard = cards[index] ?? null;
  const topLayerKey = `top-${index}`;
  const backLayers = useMemo(
    () =>
      getBackLayerVisibilityModel({
        currentIndex: index,
        cardsLength: cards.length,
        topIndex: index,
        transition: tailTransition,
      }),
    [cards.length, index, tailTransition],
  );

  const ghostPrevCard = ghostPrevIndex != null ? cards[ghostPrevIndex] ?? null : null;
  const ghostCard = ghostIndex != null ? cards[ghostIndex] ?? null : null;
  const ghostPrevLayerKey = `ghost-prev-${ghostPrevIndex ?? -1}`;
  const ghostNextLayerKey = `card-ghost-${ghostIndex ?? -1}`;

  const backRenderLayers = useMemo(() => {
    const seen = new Set<number>();
    return backLayers.filter((layer) => {
      if (seen.has(layer.cardIndex)) return false;
      seen.add(layer.cardIndex);
      return true;
    });
  }, [backLayers]);

  const promoteCardIndex = useMemo(() => {
    const promoteLayer =
      backRenderLayers.find((l) => l.slot === 2 && l.phase !== 'exiting') ?? backRenderLayers.find((l) => l.slot === 2) ?? null;
    return promoteLayer?.cardIndex ?? null;
  }, [backRenderLayers]);

  const contentOwnerEntries = useMemo(() => {
    const entries: SwipeDeckContentOwnerEntry[] = backRenderLayers.map((layer) => ({
      key: `back-${layer.cardIndex}`,
      cardIndex: layer.cardIndex,
      role: 'back',
      phase: layer.phase,
      active: true,
    }));

    if (currentCard) {
      entries.push({
        key: topLayerKey,
        cardIndex: index,
        role: 'top',
        active: true,
      });
    }

    if (ghostPrevCard && ghostPrevIndex != null) {
      entries.push({
        key: ghostPrevLayerKey,
        cardIndex: ghostPrevIndex,
        role: 'ghostPrev',
        active: ghostPrevActive,
      });
    }

    if (ghostCard && ghostIndex != null) {
      entries.push({
        key: ghostNextLayerKey,
        cardIndex: ghostIndex,
        role: 'ghostNext',
        active: ghostNextActive,
      });
    }

    return entries;
  }, [
    backRenderLayers,
    currentCard,
    ghostCard,
    ghostIndex,
    ghostNextActive,
    ghostNextLayerKey,
    ghostPrevActive,
    ghostPrevCard,
    ghostPrevIndex,
    ghostPrevLayerKey,
    index,
    topLayerKey,
  ]);

  const contentOwnerKeys = useMemo(
    () => resolveSwipeDeckContentOwnerKeySet(contentOwnerEntries),
    [contentOwnerEntries],
  );

  const currentCardStyle = useAnimatedStyle(() => {
    const rotate = (tx.value / Math.max(1, screenWidth)) * 6;
    const t = stackShiftT.value;
    const isPrev = stackShiftDir.value < 0;
    const prevShiftX = isPrev ? stack[2].dx * t : 0;
    const prevShiftY = isPrev ? stack[2].dy * t : 0;

    return {
      zIndex: stack[3].z,
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
    const rotate = (ghostX.value / Math.max(1, screenWidth)) * 6;
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

  const back0Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = stack[0];
    const far = { dx: stack[0].dx + 4, dy: stack[0].dy + 4 };
    const b = dir > 0 ? stack[1] : far;
    const isPrev = dir < 0;
    const baseFarOpacity = isLightMode ? 0.72 : 1;
    const farOpacity = (isPrev ? 1 - 0.85 * t : 1) * baseFarOpacity;
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
    const a = stack[1];
    const b = dir > 0 ? stack[2] : stack[0];

    return {
      zIndex: a.z,
      opacity: isLightMode ? 0.8 : 1,
      transform: [
        { translateX: a.dx + (b.dx - a.dx) * t },
        { translateY: a.dy + (b.dy - a.dy) * t },
      ],
    };
  });

  const back2Style = useAnimatedStyle(() => {
    const t = stackShiftT.value;
    const dir = stackShiftDir.value;
    const a = stack[2];
    const b = dir > 0 ? stack[3] : stack[1];

    return {
      zIndex: a.z,
      opacity: isLightMode ? 0.88 : 1,
      transform: [
        { translateX: a.dx + (b.dx - a.dx) * t },
        { translateY: a.dy + (b.dy - a.dy) * t },
      ],
    };
  });


  const promoteDiagonalWipeStyle = useAnimatedStyle(() => {
    const dir = stackShiftDir.value;
    if (dir <= 0) {
      return { opacity: 0 };
    }

    const p = clamp(stackShiftT.value, 0, 1);
    const holdAt = 0.18;
    const doneAt = 0.78;
    const local = clamp((p - holdAt) / Math.max(0.001, doneAt - holdAt), 0, 1);
    const easeOutCubic = 1 - Math.pow(1 - local, 3);

    const travel = cardSize * 1.15;
    const offset = travel * (1 - easeOutCubic);

    return {
      opacity: easeOutCubic <= 0.001 ? 0 : 1,
      transform: [{ translateX: offset }, { translateY: offset }, { rotateZ: '-45deg' }],
    };
  });

  const backEnteringStyle = useAnimatedStyle(() => ({
    opacity: 1 - tailFade.value,
  }));

  const backExitingStyle = useAnimatedStyle(() => ({
    opacity: tailFade.value,
  }));

  const backLayerStyleBySlot = [back0Style, back1Style, back2Style] as const;

  if (!cards.length || !currentCard) {
    return <View style={styles.empty} />;
  }

  return (
    <View style={styles.wrap}>
      <View
        style={{
          width: stageBounds.width,
          height: stageBounds.height,
          position: 'relative',
          marginTop: 10,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: stageBounds.originX,
            top: stageBounds.originY,
            width: cardSize,
            height: cardSize,
          }}
        >
          {backRenderLayers.map((layer) => {
            const card = cards[layer.cardIndex];
            if (!card) return null;
            const layerKey = `back-${layer.cardIndex}`;

            const phaseStyle =
              layer.phase === 'entering' ? backEnteringStyle : layer.phase === 'exiting' ? backExitingStyle : null;

            const surfaceColor =
              layer.slot === 2 ? deckSurface1 : layer.slot === 1 ? deckSurface2 : deckSurface3;

            const overlay =
              layer.cardIndex === promoteCardIndex ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    diagonalOverlayBaseStyle,
                    { backgroundColor: deckSurface0 },
                    promoteDiagonalWipeStyle,
                  ]}
                />
              ) : null;

            return (
              <DeckCardShell
                key={layerKey}
                cardSize={cardSize}
                borderAlpha={runoutState.stackNow[layer.slot].borderA}
                borderWidth={borderWidth}
                radius={radius}
                surfaceColor={surfaceColor}
                overlay={overlay}
                style={
                  phaseStyle
                    ? [backLayerStyleBySlot[layer.slot], phaseStyle]
                    : backLayerStyleBySlot[layer.slot]
                }
                pointerEvents="none"
              >
                {renderBackCardBodies && (!useContentOwnerGating || contentOwnerKeys.has(layerKey))
                  ? renderCard({
                      card,
                      index: layer.cardIndex,
                      isTop: false,
                      isGhost: false,
                      isBackLayer: true,
                    })
                  : null}
              </DeckCardShell>
            );
          })}

          <DeckCardShell
            key={topLayerKey}
            cardSize={cardSize}
            borderAlpha={runoutState.stackNow[3].borderA}
            borderWidth={borderWidth}
            radius={radius}
            surfaceColor={deckSurface0}
            style={currentCardStyle}
            gesture={cardGesture}
          >
            {!useContentOwnerGating || contentOwnerKeys.has(topLayerKey)
              ? renderCard({
                  card: currentCard,
                  index,
                  isTop: true,
                  isGhost: false,
                  isBackLayer: false,
                })
              : null}
          </DeckCardShell>

          {ghostPrevCard ? (
            <DeckCardShell
              key={ghostPrevLayerKey}
              cardSize={cardSize}
              borderAlpha={runoutState.stackNow[3].borderA}
              borderWidth={borderWidth}
              radius={radius}
              style={ghostPrevCardStyle}
              pointerEvents="none"
            >
              {!useContentOwnerGating || contentOwnerKeys.has(ghostPrevLayerKey)
                ? renderCard({
                    card: ghostPrevCard,
                    index: ghostPrevIndex ?? 0,
                    isTop: false,
                    isGhost: true,
                    isBackLayer: false,
                  })
                : null}
            </DeckCardShell>
          ) : null}

          {ghostCard ? (
            <DeckCardShell
              key={ghostNextLayerKey}
              cardSize={cardSize}
              borderAlpha={runoutState.stackNow[3].borderA}
              borderWidth={borderWidth}
              radius={radius}
              style={ghostCardStyle}
              pointerEvents="none"
            >
              {!useContentOwnerGating || contentOwnerKeys.has(ghostNextLayerKey)
                ? renderCard({
                    card: ghostCard,
                    index: ghostIndex ?? 0,
                    isTop: false,
                    isGhost: true,
                    isBackLayer: false,
                  })
                : null}
            </DeckCardShell>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  empty: {
    width: '100%',
    aspectRatio: 1,
  },
});
