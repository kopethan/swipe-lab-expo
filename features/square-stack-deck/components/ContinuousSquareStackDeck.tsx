import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  clamp,
  getCommitDuration,
  getSquareStackLayoutMetrics,
  getSquareStackShadowStyle,
  getSquareStackTransform,
  getSquareStackZIndex,
  getVisibleSquareStackIndexes,
  SQUARE_STACK_COMMIT_THRESHOLD,
  SQUARE_STACK_VELOCITY_THRESHOLD,
} from "../squareStackDeck.model";
import type { SquareStackDeckCard, SquareStackDeckProps } from "../squareStackDeck.types";
import { classifySquareStackPanIntent, type SquareStackGestureIntent } from "../squareStackGestureIntent";
import { SquareStackCardShell } from "./SquareStackCardShell";

type LayerProps<TCard extends SquareStackDeckCard> = {
  card: TCard;
  index: number;
  total: number;
  size: number;
  committedIndex: number;
  baseIndex: SharedValue<number>;
  progress: SharedValue<number>;
  renderCard: SquareStackDeckProps<TCard>["renderCard"];
  depthEffect: SquareStackDeckProps<TCard>["depthEffect"];
};

function SquareStackLayerInner<TCard extends SquareStackDeckCard>({
  card,
  index,
  total,
  size,
  committedIndex,
  baseIndex,
  progress,
  renderCard,
  depthEffect,
}: LayerProps<TCard>) {
  const depthOffset = index - committedIndex;
  const isCommittedTopLayer = depthOffset === 0;
  const isIncomingPreviousLayer = depthOffset === -1;

  const animatedStyle = useAnimatedStyle(() => {
    const visualOffset = index - baseIndex.value - progress.value;
    const pose = getSquareStackTransform(visualOffset, size, depthEffect ?? "flat");
    let layerOpacity = pose.opacity;

    // Resting decks are forward-only: the previous card is mounted only so it
    // can enter during a back gesture, but it stays invisible at idle.
    if (index < baseIndex.value && progress.value >= 0) {
      layerOpacity = 0;
    }

    // Keep the readable card opaque while it is moving. This prevents lower
    // layers from flashing through during the diagonal promotion.
    if ((isCommittedTopLayer && visualOffset < 0) || (isIncomingPreviousLayer && progress.value < 0 && visualOffset < 0)) {
      layerOpacity = 1;
    }

    return {
      opacity: layerOpacity,
      zIndex: getSquareStackZIndex(visualOffset),
      transform: [{ translateX: pose.translateX }, { translateY: pose.translateY }, { scale: pose.scale }],
    };
  }, [depthEffect, index, isCommittedTopLayer, isIncomingPreviousLayer, size]);

  const shadowStyle = useAnimatedStyle(() => {
    const visualOffset = index - baseIndex.value - progress.value;
    return getSquareStackShadowStyle(visualOffset, depthEffect ?? "flat");
  }, [depthEffect, index]);

  return (
    <Animated.View pointerEvents="box-none" style={[styles.layer, animatedStyle]}>
      <Animated.View
        style={[
          styles.shadowLayer,
          {
            width: size,
            height: size,
            borderRadius: Math.max(24, Math.round(size * 0.075)),
          },
          shadowStyle,
        ]}
      >
        <SquareStackCardShell size={size}>{renderCard({ card, index, total })}</SquareStackCardShell>
      </Animated.View>
    </Animated.View>
  );
}

const SquareStackLayer = memo(SquareStackLayerInner) as typeof SquareStackLayerInner;

export function ContinuousSquareStackDeck<TCard extends SquareStackDeckCard>({
  cards,
  initialIndex = 0,
  renderCard,
  onIndexChange,
  onSwipeStart,
  onSwipeEnd,
  availableWidth,
  availableHeight,
  minCardSize,
  maxCardSize,
  renderWindow = "visible",
  showDebugBadge = false,
  depthEffect = "motionOnly",
}: SquareStackDeckProps<TCard>) {
  const { width, height } = useWindowDimensions();
  const layoutMetrics = useMemo(
    () =>
      getSquareStackLayoutMetrics({
        // Prefer the measured screen stage when the route provides it. Fall back
        // to conservative viewport estimates while the first layout pass happens.
        availableWidth: availableWidth && availableWidth > 0 ? availableWidth : width - 36,
        availableHeight: availableHeight && availableHeight > 0 ? availableHeight : height * 0.54,
        minCardSize,
        maxCardSize,
      }),
    [availableHeight, availableWidth, height, maxCardSize, minCardSize, width]
  );
  const { cardSize, stageHeight, stageWidth } = layoutMetrics;

  const safeInitialIndex = Math.min(Math.max(initialIndex, 0), Math.max(cards.length - 1, 0));
  const [committedIndex, setCommittedIndex] = useState(safeInitialIndex);
  const lastNotifiedIndexRef = useRef(safeInitialIndex);

  const baseIndex = useSharedValue(safeInitialIndex);
  const progress = useSharedValue(0);
  const gestureIntent = useSharedValue<SquareStackGestureIntent>("UNDECIDED");
  const gestureStartAbsX = useSharedValue(0);
  const gestureStartAbsY = useSharedValue(0);
  const deckSwipeActive = useSharedValue(false);

  useEffect(() => {
    const nextIndex = Math.min(committedIndex, Math.max(cards.length - 1, 0));
    if (nextIndex !== committedIndex) {
      setCommittedIndex(nextIndex);
    }
    baseIndex.value = nextIndex;
    progress.value = 0;
  }, [baseIndex, cards.length, committedIndex, progress]);

  useEffect(() => {
    const nextCard = cards[committedIndex];
    if (!nextCard || lastNotifiedIndexRef.current === committedIndex) {
      return;
    }

    lastNotifiedIndexRef.current = committedIndex;
    onIndexChange?.(committedIndex, nextCard);
  }, [cards, committedIndex, onIndexChange]);

  const visibleIndexes = useMemo(() => {
    if (renderWindow === "all") {
      return cards.map((_, cardIndex) => cardIndex);
    }

    return getVisibleSquareStackIndexes(committedIndex, cards.length);
  }, [cards, cards.length, committedIndex, renderWindow]);

  const commitIndex = useCallback(
    (direction: -1 | 1) => {
      setCommittedIndex((current) => Math.min(Math.max(current + direction, 0), Math.max(cards.length - 1, 0)));
    },
    [cards.length]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((event: any) => {
          const touch = event.allTouches[0];
          if (!touch) {
            return;
          }

          gestureStartAbsX.value = touch.absoluteX;
          gestureStartAbsY.value = touch.absoluteY;
          gestureIntent.value = "UNDECIDED";
        })
        .onTouchesMove((event: any, state: any) => {
          if (gestureIntent.value !== "UNDECIDED") {
            return;
          }

          const touch = event.allTouches[0];
          if (!touch) {
            return;
          }

          const dx = touch.absoluteX - gestureStartAbsX.value;
          const dy = touch.absoluteY - gestureStartAbsY.value;
          const nextIntent = classifySquareStackPanIntent({
            dx,
            dy,
            hasPrev: baseIndex.value > 0,
            hasNext: baseIndex.value < cards.length - 1,
          });

          if (nextIntent === "UNDECIDED") {
            return;
          }

          gestureIntent.value = nextIntent;

          if (nextIntent === "SCROLL") {
            progress.value = withTiming(0, { duration: 90, easing: Easing.out(Easing.quad) });
            state.fail();
            return;
          }

          if (onSwipeStart) {
            deckSwipeActive.value = true;
            runOnJS(onSwipeStart)();
          }

          state.activate();
        })
        .onUpdate((event) => {
          if (gestureIntent.value !== "SWIPE_NEXT" && gestureIntent.value !== "SWIPE_PREV") {
            return;
          }

          const diagonalDrag = event.translationX + event.translationY * 0.9;
          const rawProgress = -diagonalDrag / (cardSize * 0.76);

          const canGoNext = baseIndex.value < cards.length - 1;
          const canGoPrev = baseIndex.value > 0;
          const resisted =
            (rawProgress > 0 && !canGoNext) || (rawProgress < 0 && !canGoPrev) ? rawProgress * 0.18 : rawProgress;

          progress.value = clamp(resisted, -1, 1);
        })
        .onEnd((event) => {
          const endingIntent = gestureIntent.value;
          gestureIntent.value = "UNDECIDED";

          if (endingIntent !== "SWIPE_NEXT" && endingIntent !== "SWIPE_PREV") {
            progress.value = withTiming(0, { duration: 90, easing: Easing.out(Easing.quad) });
            return;
          }

          const velocityProgress = -(event.velocityX + event.velocityY * 0.9) / (cardSize * 0.76);
          const currentProgress = progress.value;
          const canGoNext = baseIndex.value < cards.length - 1;
          const canGoPrev = baseIndex.value > 0;

          let direction: -1 | 0 | 1 = 0;
          if (
            endingIntent === "SWIPE_NEXT" &&
            (currentProgress > SQUARE_STACK_COMMIT_THRESHOLD || velocityProgress > SQUARE_STACK_VELOCITY_THRESHOLD) &&
            canGoNext
          ) {
            direction = 1;
          } else if (
            endingIntent === "SWIPE_PREV" &&
            (currentProgress < -SQUARE_STACK_COMMIT_THRESHOLD || velocityProgress < -SQUARE_STACK_VELOCITY_THRESHOLD) &&
            canGoPrev
          ) {
            direction = -1;
          }

          const targetProgress = direction === 0 ? 0 : direction;
          const duration = getCommitDuration(currentProgress, targetProgress);

          progress.value = withTiming(
            targetProgress,
            { duration, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (!finished) {
                return;
              }

              if (direction !== 0) {
                // Important: this is the invisible rebase. At progress = +/-1,
                // baseIndex + direction with progress = 0 is the same visual pose.
                baseIndex.value = baseIndex.value + direction;
                progress.value = 0;
                runOnJS(commitIndex)(direction);
                return;
              }

              progress.value = 0;
            }
          );
        })
        .onFinalize(() => {
          if (deckSwipeActive.value) {
            deckSwipeActive.value = false;
            if (onSwipeEnd) {
              runOnJS(onSwipeEnd)();
            }
          }
          gestureIntent.value = "UNDECIDED";
        }),
    [baseIndex, cardSize, cards.length, commitIndex, deckSwipeActive, gestureIntent, gestureStartAbsX, gestureStartAbsY, onSwipeEnd, onSwipeStart, progress]
  );

  if (cards.length === 0) {
    return <View style={[styles.empty, { width: stageWidth, height: stageHeight }]} />;
  }

  return (
    <View style={[styles.root, { width: stageWidth, height: stageHeight }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.gestureSurface, { width: stageWidth, height: stageHeight }]}>
          {showDebugBadge ? (
            <View pointerEvents="none" style={styles.debugBadge}>
              <View style={styles.debugDot} />
            </View>
          ) : null}
          {visibleIndexes.map((cardIndex) => {
            const card = cards[cardIndex];
            return (
              <SquareStackLayer
                key={card.id}
                card={card}
                index={cardIndex}
                total={cards.length}
                size={cardSize}
                committedIndex={committedIndex}
                baseIndex={baseIndex}
                progress={progress}
                renderCard={renderCard}
                depthEffect={depthEffect}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  gestureSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  shadowLayer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  debugBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2000,
  },
  debugDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
});
