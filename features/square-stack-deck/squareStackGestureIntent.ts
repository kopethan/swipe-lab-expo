export type SquareStackGestureIntent = "UNDECIDED" | "SCROLL" | "SWIPE_NEXT" | "SWIPE_PREV";

type SquareStackPanIntentInput = {
  dx: number;
  dy: number;
  hasPrev: boolean;
  hasNext: boolean;
};

const LOCK_DISTANCE = 12;
const ANGLE_SWIPE_DEG = 36;
const ANGLE_SCROLL_DEG = 63;
const VERTICAL_DOMINANCE = 1.35;
const ANGLE_BACKSLASH_SWIPE_DEG = 62;
const BACKSLASH_VERTICAL_DOMINANCE = 1.85;

export function isBackslashDiagonal(dx: number, dy: number) {
  "worklet";
  return dx * dy > 0;
}

function intentForHorizontalDirection(dx: number, hasPrev: boolean, hasNext: boolean): SquareStackGestureIntent {
  "worklet";
  if (dx < 0) {
    return hasNext ? "SWIPE_NEXT" : "SCROLL";
  }
  if (dx > 0) {
    return hasPrev ? "SWIPE_PREV" : "SCROLL";
  }
  return "UNDECIDED";
}

export function classifySquareStackPanIntent({
  dx,
  dy,
  hasPrev,
  hasNext,
}: SquareStackPanIntentInput): SquareStackGestureIntent {
  "worklet";

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const distance = Math.hypot(dx, dy);

  if (distance < LOCK_DISTANCE) {
    return "UNDECIDED";
  }

  if (absX <= 0.001) {
    return "SCROLL";
  }

  const angleDeg = Math.atan2(absY, absX) * (180 / Math.PI);
  const backslash = isBackslashDiagonal(dx, dy);

  // Mostly vertical movement should always belong to the parent ScrollView.
  // This is intentionally stricter than the visual diagonal swipe so that a
  // user can scroll through the Plan feed by staying close to the vertical line.
  if (absY > absX * VERTICAL_DOMINANCE) {
    return "SCROLL";
  }

  // Mostly horizontal movement can still advance the deck, but the stronger
  // product gesture remains the backslash diagonal: bottom-right -> top-left
  // for next, and top-left -> bottom-right for previous.
  if (angleDeg <= ANGLE_SWIPE_DEG) {
    return intentForHorizontalDirection(dx, hasPrev, hasNext);
  }

  // The opposite diagonal family belongs to vertical page scrolling. This keeps
  // the deck from stealing natural up/down feed scrolls that drift sideways.
  if (!backslash) {
    return "SCROLL";
  }

  // Accept only a 45-ish backslash diagonal for deck movement. Steeper drags
  // are treated as page scrolls, which matches the Trade feed feel better than
  // accepting every diagonal-looking gesture.
  if (angleDeg <= ANGLE_BACKSLASH_SWIPE_DEG && absY <= absX * BACKSLASH_VERTICAL_DOMINANCE) {
    return intentForHorizontalDirection(dx, hasPrev, hasNext);
  }

  if (angleDeg >= ANGLE_SCROLL_DEG) {
    return "SCROLL";
  }

  return "SCROLL";
}
