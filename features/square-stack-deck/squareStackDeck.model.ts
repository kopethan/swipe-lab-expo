import { Extrapolation, interpolate } from "react-native-reanimated";

export const SQUARE_STACK_VISIBLE_BEFORE = 1;
// Keep one hidden tail card mounted so next-swipe depth can promote smoothly
// without making the idle stack look like more than four visible cards.
export const SQUARE_STACK_VISIBLE_AFTER = 4;

export const SQUARE_STACK_COMMIT_THRESHOLD = 0.36;
export const SQUARE_STACK_VELOCITY_THRESHOLD = 1.05;

export const SQUARE_STACK_DEPTH_ALLOWANCE_X = 72;
export const SQUARE_STACK_DEPTH_ALLOWANCE_Y = 72;
export const SQUARE_STACK_DEFAULT_MIN_CARD_SIZE = 248;
export const SQUARE_STACK_DEFAULT_MAX_CARD_SIZE = 390;

export type SquareStackLayoutInput = {
  availableWidth: number;
  availableHeight: number;
  minCardSize?: number;
  maxCardSize?: number;
};

export type SquareStackLayoutMetrics = {
  cardSize: number;
  stageWidth: number;
  stageHeight: number;
  depthAllowanceX: number;
  depthAllowanceY: number;
};

export function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

export function getSquareStackLayoutMetrics({
  availableWidth,
  availableHeight,
  minCardSize = SQUARE_STACK_DEFAULT_MIN_CARD_SIZE,
  maxCardSize = SQUARE_STACK_DEFAULT_MAX_CARD_SIZE,
}: SquareStackLayoutInput): SquareStackLayoutMetrics {
  const safeWidth = Math.max(0, availableWidth);
  const safeHeight = Math.max(0, availableHeight);

  const usableWidth = Math.max(180, safeWidth - SQUARE_STACK_DEPTH_ALLOWANCE_X);
  const usableHeight = Math.max(180, safeHeight - SQUARE_STACK_DEPTH_ALLOWANCE_Y);
  const naturalCardSize = Math.min(usableWidth, usableHeight, maxCardSize);

  // The lower bound should never force the card larger than the measured stage.
  // Small devices are allowed to go below the preferred min instead of clipping.
  const safeMinCardSize = Math.min(minCardSize, naturalCardSize);
  const cardSize = Math.round(clamp(naturalCardSize, safeMinCardSize, maxCardSize));

  return {
    cardSize,
    stageWidth: cardSize + SQUARE_STACK_DEPTH_ALLOWANCE_X,
    stageHeight: cardSize + SQUARE_STACK_DEPTH_ALLOWANCE_Y,
    depthAllowanceX: SQUARE_STACK_DEPTH_ALLOWANCE_X,
    depthAllowanceY: SQUARE_STACK_DEPTH_ALLOWANCE_Y,
  };
}

export function getVisibleSquareStackIndexes(activeIndex: number, total: number) {
  const indexes: number[] = [];
  const from = Math.max(0, activeIndex - SQUARE_STACK_VISIBLE_BEFORE);
  const to = Math.min(total - 1, activeIndex + SQUARE_STACK_VISIBLE_AFTER);

  for (let index = from; index <= to; index += 1) {
    indexes.push(index);
  }

  return indexes;
}

export function getSquareStackTransform(visualOffset: number, cardSize: number) {
  "worklet";

  const clampedOffset = clamp(visualOffset, -1, 4);
  const input = [-1, 0, 1, 2, 3, 4];

  // LAB3 keeps the physical model but makes the depth almost invisible. The
  // fourth-after card stays mounted as a hidden tail so it can slide into the
  // third depth slot during a next swipe instead of appearing after release.
  const translateX = interpolate(
    clampedOffset,
    input,
    [-cardSize * 0.62, 0, 7, 13, 19, 25],
    Extrapolation.CLAMP
  );
  const translateY = interpolate(
    clampedOffset,
    input,
    [-cardSize * 0.54, 0, 7, 13, 19, 25],
    Extrapolation.CLAMP
  );
  const scale = interpolate(clampedOffset, input, [0.985, 1, 0.988, 0.978, 0.97, 0.964], Extrapolation.CLAMP);
  const opacity = interpolate(clampedOffset, input, [0, 1, 0.965, 0.9, 0.78, 0], Extrapolation.CLAMP);

  return {
    translateX,
    translateY,
    scale,
    opacity,
  };
}


export function getSquareStackShadowStyle(visualOffset: number) {
  "worklet";

  const clampedOffset = clamp(visualOffset, -1, 4);
  const input = [-1, 0, 1, 2, 3, 4];

  return {
    shadowOpacity: interpolate(clampedOffset, input, [0.18, 0.2, 0.13, 0.08, 0.045, 0], Extrapolation.CLAMP),
    shadowRadius: interpolate(clampedOffset, input, [24, 26, 18, 12, 8, 0], Extrapolation.CLAMP),
    elevation: Math.round(interpolate(clampedOffset, input, [14, 16, 9, 5, 2, 0], Extrapolation.CLAMP)),
  };
}

export function getSquareStackZIndex(visualOffset: number) {
  "worklet";

  // Lower visual offsets are closer to the viewer. This makes the incoming
  // previous card sit above the current top while it travels from -1 -> 0.
  return Math.round(1000 - visualOffset * 40);
}

export function getCommitDuration(currentProgress: number, targetProgress: number) {
  "worklet";

  const remaining = Math.abs(targetProgress - currentProgress);
  return clamp(160 + remaining * 180, 120, 340);
}
