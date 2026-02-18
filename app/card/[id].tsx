import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";

export default function CardDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const scheme = useColorScheme();
  const isDark = scheme !== "light";
  const bg = isDark ? "#0b0d10" : "#ffffff";
  const fg = isDark ? "#ffffff" : "#0a0a0a";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";
  const teal = "rgba(44,229,255,0.95)";

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 20, paddingTop: 56 }}>
      <Pressable
        onPress={() => router.back()}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: teal,
        }}
      >
        <Text style={{ color: fg, fontWeight: "800" }}>Back</Text>
      </Pressable>

      <View style={{ height: 18 }} />

      <Text style={{ color: fg, fontSize: 22, fontWeight: "900" }}>Card details</Text>
      <Text style={{ color: muted, marginTop: 8 }}>id: {String(id ?? "")}</Text>
    </View>
  );
}
