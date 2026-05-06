import { useLocalSearchParams } from "expo-router";

import { TradeDetail } from "@/features/trade";

export default function TradeDetailRoute() {
  const { tradeId } = useLocalSearchParams<{ tradeId?: string }>();

  return <TradeDetail tradeId={tradeId ?? ""} />;
}
