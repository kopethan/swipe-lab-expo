export type NavLabTabId = "plans" | "me" | "trade";

export type MeHubSectionId = "activity" | "plans" | "tools" | "account";

export type NavLabTab = {
  id: NavLabTabId;
  label: string;
  tagline: string;
};

export type MeHubItem = {
  id: string;
  label: string;
  count?: number;
  subtitle?: string;
};

export type MeHubSection = {
  id: MeHubSectionId;
  title: string;
  eyebrow: string;
  summary: string;
  items: MeHubItem[];
};

export type PlanPreview = {
  id: string;
  category: string;
  title: string;
  status: string;
  summary: string;
  needs: string[];
  offers: string[];
  interestedCount: number;
  joinedCount: number;
  nextStep: string;
};

export type TradeFilterId = "all" | "trades" | "needs" | "offers";

export type TradeFilter = {
  id: TradeFilterId;
  label: string;
  helper: string;
};

export type TradeFeedItemType = "trade" | "open_need" | "open_offer" | "starter";

export type TradePreview = {
  id: string;
  type: TradeFeedItemType;
  needTitle?: string;
  offerTitle?: string;
  title?: string;
  meta: string;
  footerLabel: string;
  placementNote?: string;
};
