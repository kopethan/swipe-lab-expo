import type { ReactNode } from 'react';

export type Intent = 'UNDECIDED' | 'SCROLL' | 'SWIPE_NEXT' | 'SWIPE_PREV';

export type DeckStackOffsets = readonly [number, number, number, number];

export type DeckLayer = {
  dx: number;
  dy: number;
  z: number;
  borderA: number;
};

export type StageBounds = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type RunoutState = {
  remainingBehind: number;
  backCount: number;
  backCountFinal: number;
  runoutFade: number;
  isLastCard: boolean;
  stackNow: DeckLayer[];
};

export type BackLayerSlot = 0 | 1 | 2;
export type BackLayerPhase = 'stable' | 'entering' | 'exiting';

export type BackLayerVisibility = {
  slot: BackLayerSlot;
  cardIndex: number;
  phase: BackLayerPhase;
};

export type TailTransition = {
  fromIndex: number;
  toIndex: number;
};

export type DeckSizes = {
  cardSize?: number;
  borderWidth?: number;
  radius?: number;
  stackOffsets?: DeckStackOffsets;
};

export type RenderCardArgs<T> = {
  card: T;
  index: number;
  isTop: boolean;
  isGhost: boolean;
  isBackLayer: boolean;
};

export type SwipeDeckDebugOptions = {
  /**
   * If false, back-layer cards render shells only (no body). Useful to reproduce
   * "content appears late" / remount glitches.
   */
  renderBackCardBodies?: boolean;
  /**
   * If false, bypass content-owner gating and always render bodies for the
   * layers allowed by other options.
   */
  useContentOwnerGating?: boolean;
};

export type SwipeDeckProps<T> = {
  cards: T[];
  renderCard: (args: RenderCardArgs<T>) => ReactNode;
  onIndexChange?: (nextIndex: number, card: T) => void;
  onEndReached?: (lastIndex: number, card: T) => void;
  onCardPress?: (index: number, card: T) => void;
  disableNextAtEnd?: boolean;
  initialIndex?: number;
  sizes?: DeckSizes;
  onDragStateChange?: (dragging: boolean) => void;
  debug?: SwipeDeckDebugOptions;
};
