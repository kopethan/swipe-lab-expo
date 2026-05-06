import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { TRADE_FEED_MOCK_ITEMS, TRADE_NEED_MOCK_ITEMS, TRADE_OFFER_MOCK_ITEMS } from "../data";
import type {
  TradeExpirationMode,
  TradeFeedItem,
  TradeNeedItem,
  TradeNeedSummary,
  TradeOfferItem,
  TradeOfferSummary,
  TradeParticipantSummary,
  TradeStatus,
} from "../types";

export type CreateTradeNeedInput = Omit<TradeNeedItem, "id" | "owner" | "status" | "createdAt"> & {
  id?: string;
  owner?: TradeParticipantSummary;
  status?: TradeStatus;
  createdAt?: string;
};

export type CreateTradeOfferInput = Omit<TradeOfferItem, "id" | "owner" | "status" | "createdAt"> & {
  id?: string;
  owner?: TradeParticipantSummary;
  status?: TradeStatus;
  createdAt?: string;
};

export type CreateTradeInput = {
  needId?: string;
  offerId?: string;
  need?: TradeNeedItem;
  offer?: TradeOfferItem;
  id?: string;
  matchScore?: number;
  status?: TradeStatus;
  publishedAt?: string;
  expiresAt?: string;
  expirationMode?: TradeExpirationMode;
  closedAt?: string;
};

type TradeStoreContextValue = {
  currentOwner: TradeParticipantSummary;
  feedItems: TradeFeedItem[];
  tradeItems: TradeFeedItem[];
  needs: TradeNeedItem[];
  offers: TradeOfferItem[];
  createNeed: (input: CreateTradeNeedInput) => TradeNeedItem;
  createOffer: (input: CreateTradeOfferInput) => TradeOfferItem;
  createTrade: (input: CreateTradeInput) => TradeFeedItem | null;
  closeTrade: (id: string) => void;
  findNeedById: (id: string) => TradeNeedItem | undefined;
  findOfferById: (id: string) => TradeOfferItem | undefined;
  findTradeById: (id: string) => TradeFeedItem | undefined;
};

const CURRENT_OWNER: TradeParticipantSummary = {
  id: "me",
  name: "You",
  locationLabel: "Remote",
};

const TradeStoreContext = createContext<TradeStoreContextValue | null>(null);

function isExpiredTrade(item: TradeFeedItem, nowMs = Date.now()) {
  if (!item.expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(item.expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs;
}

function isPublicFeedTrade(item: TradeFeedItem) {
  if (item.status !== "active") {
    return false;
  }

  return !isExpiredTrade(item);
}

let generatedIdCounter = 0;

function createLocalId(prefix: string) {
  generatedIdCounter += 1;
  return `${prefix}-${Date.now()}-${generatedIdCounter}`;
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function toNeedSummary(need: TradeNeedItem): TradeNeedSummary {
  return {
    id: need.id,
    title: need.title,
    category: need.category,
    timing: need.timing,
    mode: need.mode,
    urgency: need.urgency,
    locationLabel: need.locationLabel,
    shortDescription: need.shortDescription,
    tags: need.tags,
  };
}

function toOfferSummary(offer: TradeOfferItem): TradeOfferSummary {
  return {
    id: offer.id,
    title: offer.title,
    category: offer.category,
    availability: offer.availability,
    mode: offer.mode,
    includes: offer.includes,
    locationLabel: offer.locationLabel,
    shortDescription: offer.shortDescription,
    tags: offer.tags,
  };
}

export function TradeStoreProvider({ children }: PropsWithChildren) {
  const [needs, setNeeds] = useState<TradeNeedItem[]>(TRADE_NEED_MOCK_ITEMS);
  const [offers, setOffers] = useState<TradeOfferItem[]>(TRADE_OFFER_MOCK_ITEMS);
  const [tradeItems, setTradeItems] = useState<TradeFeedItem[]>(TRADE_FEED_MOCK_ITEMS);

  const findNeedById = useCallback((id: string) => needs.find((item) => item.id === id), [needs]);
  const findOfferById = useCallback((id: string) => offers.find((item) => item.id === id), [offers]);
  const findTradeById = useCallback((id: string) => tradeItems.find((item) => item.id === id), [tradeItems]);
  const feedItems = useMemo(() => tradeItems.filter(isPublicFeedTrade), [tradeItems]);

  const createNeed = useCallback((input: CreateTradeNeedInput) => {
    const nextNeed: TradeNeedItem = {
      ...input,
      id: input.id ?? createLocalId("need"),
      owner: input.owner ?? CURRENT_OWNER,
      status: input.status ?? "active",
      createdAt: input.createdAt ?? todayLabel(),
    };

    setNeeds((current) => [nextNeed, ...current]);
    return nextNeed;
  }, []);

  const createOffer = useCallback((input: CreateTradeOfferInput) => {
    const nextOffer: TradeOfferItem = {
      ...input,
      id: input.id ?? createLocalId("offer"),
      owner: input.owner ?? CURRENT_OWNER,
      status: input.status ?? "active",
      createdAt: input.createdAt ?? todayLabel(),
    };

    setOffers((current) => [nextOffer, ...current]);
    return nextOffer;
  }, []);

  const createTrade = useCallback(
    (input: CreateTradeInput) => {
      const need = input.need ?? (input.needId ? needs.find((item) => item.id === input.needId) : undefined);
      const offer = input.offer ?? (input.offerId ? offers.find((item) => item.id === input.offerId) : undefined);

      if (!need || !offer) {
        return null;
      }

      const nextTrade: TradeFeedItem = {
        id: input.id ?? createLocalId("trade"),
        participant: need.owner ?? offer.owner ?? CURRENT_OWNER,
        need: toNeedSummary(need),
        offer: toOfferSummary(offer),
        matchScore: input.matchScore ?? 72,
        status: input.status ?? "active",
        publishedAt: input.publishedAt ?? new Date().toISOString(),
        expiresAt: input.expiresAt,
        expirationMode: input.expirationMode ?? "duration",
        closedAt: input.closedAt,
      };

      setTradeItems((current) => [nextTrade, ...current]);
      return nextTrade;
    },
    [needs, offers]
  );

  const closeTrade = useCallback((id: string) => {
    setTradeItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "closed", closedAt: new Date().toISOString() } : item
      )
    );
  }, []);

  const value = useMemo<TradeStoreContextValue>(
    () => ({
      currentOwner: CURRENT_OWNER,
      feedItems,
      tradeItems,
      needs,
      offers,
      createNeed,
      createOffer,
      createTrade,
      closeTrade,
      findNeedById,
      findOfferById,
      findTradeById,
    }),
    [
      closeTrade,
      createNeed,
      createOffer,
      createTrade,
      feedItems,
      tradeItems,
      findNeedById,
      findOfferById,
      findTradeById,
      needs,
      offers,
    ]
  );

  return <TradeStoreContext.Provider value={value}>{children}</TradeStoreContext.Provider>;
}

export function useTradeStore() {
  const value = useContext(TradeStoreContext);

  if (!value) {
    throw new Error("useTradeStore must be used inside TradeStoreProvider");
  }

  return value;
}
