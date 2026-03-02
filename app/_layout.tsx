import "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeProvider } from "@/providers/ThemeProvider";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
