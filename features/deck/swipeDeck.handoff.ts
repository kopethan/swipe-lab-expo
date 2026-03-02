export function getPreloadedPrevIndex(currentIndex: number, cardsLength: number): number | null {
  'worklet';
  if (cardsLength <= 1) return null;
  if (currentIndex <= 0) return null;
  const maxIndex = Math.max(0, cardsLength - 1);
  const clamped = Math.max(0, Math.min(currentIndex, maxIndex));
  return clamped > 0 ? clamped - 1 : null;
}

export function resolvePreloadedPrevSync(params: {
  currentPreloadedPrevIndex: number | null;
  currentIndex: number;
  cardsLength: number;
}): { nextPreloadedPrevIndex: number | null; changed: boolean } {
  'worklet';
  const nextPreloadedPrevIndex = getPreloadedPrevIndex(params.currentIndex, params.cardsLength);
  return {
    nextPreloadedPrevIndex,
    changed: nextPreloadedPrevIndex !== params.currentPreloadedPrevIndex,
  };
}

type NextGhostLaunchPoseInput = {
  currentX: number;
  currentY: number;
  cardSize: number;
  nextDismissX: number;
  railK: number;
};

export function getNextGhostLaunchPose({
  currentX,
  currentY,
  cardSize,
  nextDismissX,
  railK,
}: NextGhostLaunchPoseInput): { x: number; y: number } {
  'worklet';
  const minLaunchAbs = Math.max(cardSize * 0.16, nextDismissX * 0.5);
  const x = Math.min(currentX, -minLaunchAbs);
  const railY = -Math.abs(x) * railK;
  const y = Math.min(currentY, railY);
  return { x, y };
}

export function shouldFinalizePrevHandoff(params: {
  pending: boolean;
  handoffFromIndex: number | null;
  handoffToIndex?: number | null;
  currentIndex: number;
}): boolean {
  'worklet';
  if (!params.pending) return false;
  if (params.handoffFromIndex == null) return false;
  if (params.handoffToIndex != null) {
    return params.currentIndex === params.handoffToIndex;
  }
  return params.currentIndex !== params.handoffFromIndex;
}

export function shouldAbortPrevHandoff(params: {
  pending: boolean;
  handoffFromIndex: number | null;
  handoffToIndex?: number | null;
  cardsLength: number;
}): boolean {
  'worklet';
  if (!params.pending) return false;
  if (params.handoffFromIndex == null) return false;
  if (params.handoffToIndex == null) return true;
  return params.handoffToIndex < 0 || params.handoffToIndex >= params.cardsLength;
}
