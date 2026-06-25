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

export type PlanMode = "local" | "online" | "mixed";

export type PlanStatus = "draft" | "open" | "full" | "started" | "completed" | "cancelled";

export type PlanPlaceKind = "local_place" | "online_place";

export type PlaceLibrarySource = "my_place" | "starter_place";

export type PlaceLibraryFilterId = "all" | "offline" | "online";

export type PlaceLibraryFilter = {
  id: PlaceLibraryFilterId;
  label: string;
  helper: string;
};

export type PlaceLibraryVisibility = "public" | "private" | "verified_later";

export type PlaceLibraryItem = {
  id: string;
  source: PlaceLibrarySource;
  kind: PlanPlaceKind;
  title: string;
  category: string;
  categoryLabel: string;
  addressOrPlatform: string;
  areaLabel: string;
  description: string;
  imageLabels: string[];
  ownerName: string;
  visibility: PlaceLibraryVisibility;
  accessLabel: string;
  defaultTimeLabel: string;
  defaultDurationLabel?: string;
  defaultNote: string;
  tags?: string[];
  multilingualNote?: string;
  safetyLabel?: string;
  useLabel: string;
};

export type PlaceLibraryGroup = {
  id: PlaceLibrarySource;
  label: string;
  helper: string;
};

export type PlanPlacePreview = {
  id: string;
  libraryPlaceId?: string;
  placeSource?: PlaceLibrarySource;
  kind: PlanPlaceKind;
  order: number;
  title: string;
  addressOrPlatform: string;
  timeLabel: string;
  endTimeLabel?: string;
  durationLabel?: string;
  note: string;
  meetingInstruction?: string;
  imageLabel: string;
};

export type PlanPreview = {
  id: string;
  category: string;
  title: string;
  status: PlanStatus;
  mode: PlanMode;
  summary: string;
  ownerName: string;
  startLabel: string;
  finalEndLabel?: string;
  joinDeadlineLabel?: string;
  durationLabel?: string;
  placeSummary: string;
  places: PlanPlacePreview[];
  joinedCount: number;
  joinedPreview: string[];
  capacityLabel: string;
  joinLabel: string;
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
