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
   * By default the square deck only mounts the active card and nearby depth
   * layers. Use "all" for small feeds where back-list cards should already
   * have their real content mounted.
   */
  renderWindow?: "visible" | "all";
  /**
   * Lab screens can keep the tiny debug dot. Product/feature surfaces can hide it.
   */
  showDebugBadge?: boolean;
  /**
   * "flat" keeps cards mounted and ready, but removes the heavy gray frame /
   * shadow trail while swiping. Use "stacked" only when a lab explicitly needs
   * the older depth visualization. "motionOnly" keeps the diagonal swipe/fade
   * motion but removes the delayed frame/shadow artifact.
   */
  depthEffect?: "flat" | "stacked" | "motionOnly";
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
