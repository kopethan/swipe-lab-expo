import {
  ANGLE_BACKSLASH_SWIPE_DEG,
  ANGLE_SCROLL_DEG,
  ANGLE_SWIPE_DEG,
  BACKSLASH_VERTICAL_DOMINANCE,
  DEFAULT_CARD_MAX_SIZE,
  DEFAULT_CARD_WIDTH_RATIO,
  DEFAULT_STACK_BORDER_ALPHAS,
  DEFAULT_STACK_OFFSETS,
  LEFT_SWIPE_ZONE_PX,
  LEFT_ZONE_ANGLE_SWIPE_DEG,
  LEFT_ZONE_LOCK_DISTANCE,
  LOCK_DISTANCE,
  MAX_BACK_LAYERS,
  VERTICAL_DOMINANCE,
} from './deck.constants';
import type {
  BackLayerSlot,
  BackLayerVisibility,
  DeckLayer,
  DeckStackOffsets,
  Intent,
  RunoutState,
  StageBounds,
  TailTransition,
} from './deck.types';

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

export function rgbaBorder(alpha: number, mode: 'light' | 'dark' = 'dark') {
  if (mode === 'light') {
    return `rgba(0,0,0,${Math.max(0, Math.min(0.24, alpha * 0.24))})`;
  }
  return `rgba(255,255,255,${Math.max(0, Math.min(0.5, alpha * 0.5))})`;
}

export function isBackslashDiagonal(dx: number, dy: number) {
  'worklet';
  return dx * dy > 0;
}

export function resolveCardSize(screenWidth: number, override?: number) {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  return Math.min(DEFAULT_CARD_MAX_SIZE, Math.floor(screenWidth * DEFAULT_CARD_WIDTH_RATIO));
}

export function resolveStackOffsets(override?: DeckStackOffsets): DeckStackOffsets {
  if (override && override.length === 4) return override;
  return DEFAULT_STACK_OFFSETS;
}

export function buildStackLayers(
  offsets: DeckStackOffsets,
  borderAlphas: DeckStackOffsets = DEFAULT_STACK_BORDER_ALPHAS,
): DeckLayer[] {
  return offsets.map((offset, index) => ({
    dx: offset,
    dy: offset,
    z: index + 1,
    borderA: borderAlphas[index],
  }));
}

export function getStageBounds(stack: DeckLayer[], cardSize: number): StageBounds {
  const minDx = Math.min(...stack.map((s) => s.dx));
  const maxDx = Math.max(...stack.map((s) => s.dx));
  const minDy = Math.min(...stack.map((s) => s.dy));
  const maxDy = Math.max(...stack.map((s) => s.dy));

  return {
    originX: -minDx,
    originY: -minDy,
    width: cardSize + (maxDx - minDx),
    height: cardSize + (maxDy - minDy),
  };
}

export function getRunoutState(cardIndex: number, cardsLength: number, stack: DeckLayer[]): RunoutState {
  const lastIndex = Math.max(0, cardsLength - 1);
  const isLastCard = cardIndex >= lastIndex;

  const remainingBehind = Math.max(0, lastIndex - cardIndex);
  const backCount = Math.min(MAX_BACK_LAYERS, remainingBehind);
  const runoutFade =
    remainingBehind >= 3
      ? 1
      : remainingBehind === 2
        ? 0.85
        : remainingBehind === 1
          ? 0.65
          : 0;

  const topIndex = Math.max(0, stack.length - 1);
  const stackNow = stack.map((layer, i) => ({
    ...layer,
    borderA: i === topIndex ? stack[topIndex].borderA : layer.borderA * runoutFade,
  }));

  return {
    remainingBehind,
    backCount,
    backCountFinal: isLastCard ? 0 : backCount,
    runoutFade,
    isLastCard,
    stackNow,
  };
}

export function getNextCardIndex(currentIndex: number, cardsLength: number, disableNextAtEnd = true) {
  const maxIndex = Math.max(0, cardsLength - 1);
  if (cardsLength <= 1) return 0;
  if (currentIndex < maxIndex) return currentIndex + 1;
  return disableNextAtEnd ? currentIndex : maxIndex;
}

export function getPreviousCardIndex(currentIndex: number) {
  'worklet';
  return Math.max(0, currentIndex - 1);
}

export function getUpcomingCardIndices(currentIndex: number, cardsLength: number) {
  const indices: number[] = [];
  for (let step = 1; step <= MAX_BACK_LAYERS; step += 1) {
    const idx = currentIndex + step;
    if (idx > cardsLength - 1) break;
    indices.push(idx);
  }
  return indices;
}

export function shouldStabilizeTailRunoutTransition(fromIndex: number, toIndex: number, cardsLength: number) {
  const lastIndex = Math.max(0, cardsLength - 1);
  const remainingFrom = Math.max(0, lastIndex - fromIndex);
  const remainingTo = Math.max(0, lastIndex - toIndex);
  return Math.min(remainingFrom, remainingTo) <= 2;
}

function getBackLayerMap(baseIndex: number, cardsLength: number, topIndex: number) {
  const entries: Array<[BackLayerSlot, number]> = [
    [2, baseIndex + 1],
    [1, baseIndex + 2],
    [0, baseIndex + 3],
  ];

  const out = new Map<number, BackLayerSlot>();
  for (const [slot, cardIndex] of entries) {
    if (cardIndex < 0 || cardIndex >= cardsLength) continue;
    if (cardIndex === topIndex) continue;
    out.set(cardIndex, slot);
  }
  return out;
}

export function getBackLayerVisibilityModel(params: {
  currentIndex: number;
  cardsLength: number;
  topIndex: number;
  transition?: TailTransition | null;
}): BackLayerVisibility[] {
  const { currentIndex, cardsLength, topIndex, transition } = params;

  const stableNow = getBackLayerMap(currentIndex, cardsLength, topIndex);
  if (!transition || !shouldStabilizeTailRunoutTransition(transition.fromIndex, transition.toIndex, cardsLength)) {
    return Array.from(stableNow.entries())
      .map(([cardIndex, slot]) => ({ slot, cardIndex, phase: 'stable' as const }))
      .sort((a, b) => a.slot - b.slot || a.cardIndex - b.cardIndex);
  }

  const fromMap = getBackLayerMap(transition.fromIndex, cardsLength, topIndex);
  const toMap = getBackLayerMap(transition.toIndex, cardsLength, topIndex);

  const out: BackLayerVisibility[] = [];
  for (const [cardIndex, slot] of toMap.entries()) {
    out.push({
      slot,
      cardIndex,
      phase: fromMap.has(cardIndex) ? 'stable' : 'entering',
    });
  }
  for (const [cardIndex, slot] of fromMap.entries()) {
    if (toMap.has(cardIndex)) continue;
    out.push({
      slot,
      cardIndex,
      phase: 'exiting',
    });
  }

  const phaseOrder: Record<BackLayerVisibility['phase'], number> = {
    exiting: 0,
    stable: 1,
    entering: 2,
  };

  return out.sort((a, b) => a.slot - b.slot || phaseOrder[a.phase] - phaseOrder[b.phase] || a.cardIndex - b.cardIndex);
}

type ClassifyPanIntentInput = {
  dx: number;
  dy: number;
  startAbsX: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function classifyPanIntent(params: ClassifyPanIntentInput): Intent {
  'worklet';
  const { dx, dy, startAbsX, hasPrev, hasNext } = params;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  const inLeftZone = startAbsX <= LEFT_SWIPE_ZONE_PX;
  const lockDist = inLeftZone ? LEFT_ZONE_LOCK_DISTANCE : LOCK_DISTANCE;
  if (Math.hypot(ax, ay) < lockDist) return 'UNDECIDED';

  const verticalDominance = inLeftZone ? VERTICAL_DOMINANCE * 1.35 : VERTICAL_DOMINANCE;
  const isBackslash = isBackslashDiagonal(dx, dy);
  const dominance = isBackslash ? BACKSLASH_VERTICAL_DOMINANCE : verticalDominance;

  if (ay > ax * dominance) {
    return 'SCROLL';
  }

  const angle = (Math.atan2(ay, ax) * 180) / Math.PI;
  const angleSwipeDeg = inLeftZone ? LEFT_ZONE_ANGLE_SWIPE_DEG : ANGLE_SWIPE_DEG;

  if (angle < angleSwipeDeg) {
    const wantPrev = dx > 0;
    if (wantPrev && !hasPrev) return 'SCROLL';
    if (!wantPrev && !hasNext) return 'SCROLL';
    return wantPrev ? 'SWIPE_PREV' : 'SWIPE_NEXT';
  }

  const diagMax = isBackslash ? ANGLE_BACKSLASH_SWIPE_DEG : ANGLE_SCROLL_DEG;
  if (angle <= diagMax) {
    if (isBackslash) {
      const wantPrev = dx > 0;
      if (wantPrev && !hasPrev) return 'SCROLL';
      if (!wantPrev && !hasNext) return 'SCROLL';
      return wantPrev ? 'SWIPE_PREV' : 'SWIPE_NEXT';
    }
    return 'SCROLL';
  }

  return 'SCROLL';
}
