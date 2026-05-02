import type React from "react";

export type SquareStackDeckCard = {
  id: string;
};

export type SquareStackDeckRenderArgs<TCard extends SquareStackDeckCard> = {
  card: TCard;
  index: number;
  total: number;
};

export type SquareStackDeckProps<TCard extends SquareStackDeckCard> = {
  cards: TCard[];
  initialIndex?: number;
  renderCard: (args: SquareStackDeckRenderArgs<TCard>) => React.ReactNode;
  onIndexChange?: (index: number, card: TCard) => void;
  /**
   * Optional measured space from the screen that owns the deck. The square deck
   * can calculate from the viewport, but a measured parent stage is more
   * reliable on phones because native headers, footers, and safe areas vary.
   */
  availableWidth?: number;
  availableHeight?: number;
  minCardSize?: number;
  maxCardSize?: number;
};
