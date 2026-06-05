import React from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";

import { OnboardingGuideScreen } from "@/features/onboarding-guide";

export default function OnboardingGuideRoute() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const replayMode = replay === "1";

  const closeReplay = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/wallet");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Onboarding Guide", headerShown: false }} />
      <OnboardingGuideScreen replayMode={replayMode} onClose={replayMode ? closeReplay : undefined} />
    </>
  );
}
