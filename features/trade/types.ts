export type TradeTabKey = "feed" | "needs" | "offers" | "trades";

export type TradeTab = {
  key: TradeTabKey;
  label: string;
  description: string;
};

export const TRADE_TABS: TradeTab[] = [
  {
    key: "feed",
    label: "Feed",
    description: "Swipe through complete Need ↔ Offer trade cards.",
  },
  {
    key: "needs",
    label: "Needs",
    description: "Track what people are asking for.",
  },
  {
    key: "offers",
    label: "Offers",
    description: "Track what people can give in exchange.",
  },
  {
    key: "trades",
    label: "My Trades",
    description: "Private management for trades you published.",
  },
];

export type TradeServiceMode = "remote" | "local" | "hybrid";

export type TradeAvailabilityWindow =
  | "today"
  | "this-week"
  | "weekend"
  | "flexible"
  | "scheduled";

export type TradeUrgency = "low" | "medium" | "high" | "urgent";

export type TradeStatus = "draft" | "active" | "paused" | "matched" | "expired" | "closed";

export type TradeExpirationMode = "duration" | "manual";
export type TradeDurationOption = "24h" | "3d" | "7d" | "14d" | "manual";

export type TradeCategory =
  | "design"
  | "development"
  | "marketing"
  | "writing"
  | "photo-video"
  | "language"
  | "home-help"
  | "teaching"
  | "business"
  | "other";

export type TradeParticipantSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
  locationLabel?: string;
  rating?: number;
};

export type TradeNeedSummary = {
  id: string;
  title: string;
  category: TradeCategory;
  timing: string;
  mode: TradeServiceMode;
  urgency?: TradeUrgency;
  locationLabel?: string;
  shortDescription?: string;
  tags?: string[];
};

export type TradeOfferSummary = {
  id: string;
  title: string;
  category: TradeCategory;
  availability: string;
  mode: TradeServiceMode;
  includes: string;
  locationLabel?: string;
  shortDescription?: string;
  tags?: string[];
};

export type TradeFeedItem = {
  id: string;
  participant: TradeParticipantSummary;
  need: TradeNeedSummary;
  offer: TradeOfferSummary;
  matchScore?: number;
  status: TradeStatus;
  publishedAt?: string;
  expiresAt?: string;
  expirationMode?: TradeExpirationMode;
  closedAt?: string;
};

export type TradeNeedItem = TradeNeedSummary & {
  owner: TradeParticipantSummary;
  desiredExchange?: string;
  status: TradeStatus;
  createdAt: string;
};

export type TradeOfferItem = TradeOfferSummary & {
  owner: TradeParticipantSummary;
  preferredExchange?: string;
  status: TradeStatus;
  createdAt: string;
};
