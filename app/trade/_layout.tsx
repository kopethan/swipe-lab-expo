import { Stack } from "expo-router";

import { TradeStoreProvider } from "@/features/trade/state";

export default function TradeLayout() {
  return (
    <TradeStoreProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </TradeStoreProvider>
  );
}
