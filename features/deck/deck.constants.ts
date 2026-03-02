import type { DeckStackOffsets } from './deck.types';

export const LOCK_DISTANCE = 10;
export const ANGLE_SWIPE_DEG = 40;
export const ANGLE_SCROLL_DEG = 72;
export const VERTICAL_DOMINANCE = 1.6;
export const LEFT_SWIPE_ZONE_PX = 72;
export const LEFT_ZONE_LOCK_DISTANCE = 6;
export const LEFT_ZONE_ANGLE_SWIPE_DEG = 55;
export const ANGLE_BACKSLASH_SWIPE_DEG = 86;
export const BACKSLASH_VERTICAL_DOMINANCE = 2.25;

export const DEFAULT_STACK_OFFSETS: DeckStackOffsets = [18, 12, 6, 0];
export const DEFAULT_STACK_BORDER_ALPHAS: DeckStackOffsets = [0.22, 0.35, 0.55, 0.95];
export const MAX_BACK_LAYERS = 3;

export const DEFAULT_CARD_MAX_SIZE = 330;
export const DEFAULT_CARD_WIDTH_RATIO = 0.88;
export const DEFAULT_BORDER_WIDTH = 4;
export const DEFAULT_RADIUS = 22;

export const NEXT_RAIL_K = 0.7;
export const NEXT_DISMISS_X_RATIO = 0.32;
export const PREV_PULL_X_RATIO = 0.4;
export const PREV_START_X_RATIO = -0.55;
export const PREV_PULL_COMMIT_RATIO = 0.25;

export const DISMISS_MS = 160;
export const STACK_SHIFT_SNAP_MS = 120;
export const PREV_RESET_MS = 140;
export const PREV_COMMIT_MS = 150;

export const NEXT_FAST_SWIPE_VX = -900;
export const PREV_FAST_SWIPE_VX = 750;
export const PREV_FAST_SWIPE_MAX_ABS_VY = 1200;

export const TAP_MAX_DISTANCE = 6;
export const TAP_MAX_DURATION_MS = 220;

