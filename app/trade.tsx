import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { SwipeDeck, type SwipeDeckCard } from "@/components/swipe-deck";

type TabKey = "TRADES" | "MY_TRADES" | "NEEDS" | "OFFERS";

const TABS: { key: TabKey; label: string }[] = [
  { key: "TRADES", label: "Trades" },
  { key: "MY_TRADES", label: "My Trades" },
  { key: "NEEDS", label: "Needs" },
  { key: "OFFERS", label: "Offers" },
];

type Trade = {
  id: string;
  needTitle: string;
  offerTitle: string;
  needTags?: string[];
  offerTags?: string[];
  proposalsCount?: number;
  messagesCount?: number;
  // If present => countdown. If null/undefined => show a label.
  deadlineAt?: number | null;
  label?: string;
};

type LibraryItem = {
  id: string;
  title: string;
  details?: string;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatCountdown(deadlineAt: number, now: number) {
  const ms = Math.max(0, deadlineAt - now);
  const totalSec = Math.floor(ms / 1000);

  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const totalHr = Math.floor(totalMin / 60);
  const hr = totalHr % 24;
  const days = Math.floor(totalHr / 24);

  // Format: DD:HH:MM:SS (days can exceed 99, we still keep 2 digits minimum)
  const dd = days < 100 ? pad2(days) : String(days);
  return `${dd}:${pad2(hr)}:${pad2(min)}:${pad2(sec)}`;
}

function formatTags(tags?: string[]) {
  if (!tags?.length) return "";
  const clean = tags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
  if (!clean.length) return "";
  const firstTwo = clean.slice(0, 2);
  const rest = clean.length - firstTwo.length;
  return rest > 0 ? `${firstTwo.join(" ")} +${rest}` : firstTwo.join(" ");
}

function TradeRect({
  title,
  tags,
  isDark,
}: {
  title: string;
  tags?: string[];
  isDark: boolean;
}) {
  const tagsText = formatTags(tags);
  return (
    <View
      style={[
        styles.rect,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
        },
      ]}
    >
      <Text
        style={{
          color: isDark ? "rgba(255,255,255,0.94)" : "#0b0d0e",
          fontSize: 15,
          fontWeight: "900",
          letterSpacing: -0.2,
          lineHeight: 18,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>

      {!!tagsText && (
        <Text
          style={{
            marginTop: 10,
            color: isDark ? "rgba(255,255,255,0.60)" : "rgba(0,0,0,0.55)",
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 0.1,
          }}
          numberOfLines={1}
        >
          {tagsText}
        </Text>
      )}
    </View>
  );
}

function TradeIcon({ isDark }: { isDark: boolean }) {
  return (
    <View style={styles.iconRow}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      >
        <MaterialIcons
          name="sync-alt"
          size={18}
          color={isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.75)"}
        />
      </View>
    </View>
  );
}

function TradeCardBody({
  trade,
  now,
  isDark,
}: {
  trade: Trade;
  now: number;
  isDark: boolean;
}) {
  const timerText =
    typeof trade.deadlineAt === "number"
      ? formatCountdown(trade.deadlineAt, now)
      : trade.label ?? "No deadline";

  const proposals = trade.proposalsCount ?? 0;
  const messages = trade.messagesCount ?? 0;

  return (
    <View style={styles.cardBody}>
      {/* Header strip (trade-level info) */}
      <View style={styles.headerRow}>
        <Text
          style={{
            color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.80)",
            fontSize: 15,
            fontWeight: "900",
            letterSpacing: 0.4,
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
        >
          {timerText}
        </Text>

        <View style={styles.chipsRow}>
          {proposals > 0 ? (
            <View
              style={[
                styles.chip,
                {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.10)",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              <MaterialIcons
                name="local-offer"
                size={14}
                color={isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.72)"}
              />
              <Text
                style={{
                  color: isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.78)",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {proposals}
              </Text>
            </View>
          ) : null}

          {messages > 0 ? (
            <View
              style={[
                styles.chip,
                {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.10)",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              <MaterialIcons
                name="chat"
                size={14}
                color={isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.72)"}
              />
              <Text
                style={{
                  color: isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.78)",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {messages}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.centerZone}>
        <TradeRect title={trade.needTitle} tags={trade.needTags} isDark={isDark} />
        <TradeIcon isDark={isDark} />
        <TradeRect title={trade.offerTitle} tags={trade.offerTags} isDark={isDark} />
      </View>
    </View>
  );
}

function TradeBackPreview({
  trade,
  isDark,
}: {
  trade: Trade;
  isDark: boolean;
}) {
  // Back cards should be *quiet* but still show the same structure.
  return (
    <View style={styles.backPreview}>
      <View
        style={{
          width: "88%",
          height: 66,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      />
      <View style={{ height: 12 }} />
      <View
        style={{
          width: "88%",
          height: 66,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      />

      {/* tiny hint line so it doesn’t look empty on back cards */}
      <Text
        style={{
          marginTop: 14,
          width: "88%",
          color: isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.42)",
          fontSize: 11,
          fontWeight: "800",
        }}
        numberOfLines={1}
      >
        {trade.needTitle} ⇄ {trade.offerTitle}
      </Text>
    </View>
  );
}

function TopTabs({
  tab,
  setTab,
  isDark,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      }}
    >
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: 999,
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
              backgroundColor: active
                ? isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)"
                : "transparent",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                color: active
                  ? isDark
                    ? "rgba(255,255,255,0.92)"
                    : "#0b0d0e"
                  : isDark
                    ? "rgba(255,255,255,0.62)"
                    : "#4b5563",
                fontWeight: "900",
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BubbleItem({
  title,
  details,
  isDark,
}: {
  title: string;
  details?: string;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={{
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <Text
          style={{
            color: isDark ? "rgba(255,255,255,0.94)" : "#0b0d0e",
            fontWeight: "900",
            fontSize: 15,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)", fontWeight: "900" }}>
          {open ? "^" : "˅"}
        </Text>
      </View>
      {open && details ? (
        <Text
          style={{
            marginTop: 10,
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
            lineHeight: 18,
          }}
          numberOfLines={7}
        >
          {details}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function TradeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";

  const [tab, setTab] = useState<TabKey>("TRADES");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const surface = isDark ? "#0b0d10" : "#ffffff";

  const trades: SwipeDeckCard<Trade>[] = useMemo(() => {
    const mk = (t: Trade): SwipeDeckCard<Trade> => ({ id: t.id, data: t });
    const base = Date.now();
    return [
      mk({
        id: "t-01",
        needTitle: "Learn Spanish",
        offerTitle: "Video editing",
        needTags: ["language", "weekly", "remote"],
        offerTags: ["editing", "captions", "fast"],
        proposalsCount: 3,
        messagesCount: 1,
        deadlineAt: base + 1000 * 60 * 60 * 8,
      }),
      mk({
        id: "t-02",
        needTitle: "Gym training buddy",
        offerTitle: "Meal plan help",
        needTags: ["fitness", "routine"],
        offerTags: ["nutrition", "bulk"],
        proposalsCount: 1,
        messagesCount: 0,
        deadlineAt: base + 1000 * 60 * 60 * 36,
      }),
      mk({
        id: "t-03",
        needTitle: "Help with React Native",
        offerTitle: "Design feedback",
        needTags: ["expo", "debug"],
        offerTags: ["ui", "ux"],
        proposalsCount: 0,
        messagesCount: 0,
        label: "Active",
      }),
      mk({
        id: "t-04",
        needTitle: "Photography lesson",
        offerTitle: "French conversation",
        needTags: ["camera", "portrait"],
        offerTags: ["french", "speaking"],
        proposalsCount: 2,
        messagesCount: 4,
        deadlineAt: base + 1000 * 60 * 12,
      }),
      mk({
        id: "t-05",
        needTitle: "Help me move a sofa",
        offerTitle: "Fix your PC",
        needTags: ["local", "weekend"],
        offerTags: ["windows", "hardware"],
        proposalsCount: 1,
        messagesCount: 2,
        label: "No deadline",
      }),
    ];
  }, []);

  const myTrades: SwipeDeckCard<Trade>[] = useMemo(() => {
    const mk = (t: Trade): SwipeDeckCard<Trade> => ({ id: t.id, data: t });
    const base = Date.now();
    return [
      mk({
        id: "mt-01",
        needTitle: "Find a cofounder",
        offerTitle: "Build MVP",
        needTags: ["startup", "product"],
        offerTags: ["dev", "mvp"],
        proposalsCount: 2,
        messagesCount: 5,
        label: "Active",
      }),
      mk({
        id: "mt-02",
        needTitle: "Practice interview English",
        offerTitle: "Teach networking",
        needTags: ["english", "interview"],
        offerTags: ["routing", "ospf"],
        proposalsCount: 0,
        messagesCount: 0,
        deadlineAt: base + 1000 * 60 * 60 * 24 * 2,
      }),
      mk({
        id: "mt-03",
        needTitle: "Short film actor",
        offerTitle: "Cinematography",
        needTags: ["cinema", "acting"],
        offerTags: ["camera", "lighting"],
        proposalsCount: 1,
        messagesCount: 0,
        label: "Active",
      }),
    ];
  }, []);

  const needs: LibraryItem[] = useMemo(
    () => [
      { id: "n1", title: "Learn Spanish", details: "Weekly conversation practice (remote)." },
      { id: "n2", title: "Gym training buddy", details: "Consistent sessions, early mornings preferred." },
      { id: "n3", title: "Help moving a sofa", details: "Local help, weekend." },
    ],
    []
  );

  const offers: LibraryItem[] = useMemo(
    () => [
      { id: "o1", title: "Video editing", details: "Short edits, subtitles, basic color + audio." },
      { id: "o2", title: "React Native help", details: "Expo, gestures, navigation, UI structure." },
      { id: "o3", title: "French conversation", details: "Casual practice to gain confidence." },
    ],
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: surface }}>
      <TopTabs tab={tab} setTab={setTab} isDark={isDark} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
        {tab === "TRADES" ? (
          <SwipeDeck
            cards={trades}
            onOpenCard={(id) => {
              // placeholder: later navigate to /trade/[id]
              console.log("open trade", id);
            }}
            renderBackCard={({ card }) => <TradeBackPreview trade={card.data} isDark={isDark} />}
            renderCard={({ card }) => <TradeCardBody trade={card.data} now={now} isDark={isDark} />}
          />
        ) : null}

        {tab === "MY_TRADES" ? (
          <SwipeDeck
            cards={myTrades}
            onOpenCard={(id) => console.log("open my trade", id)}
            renderBackCard={({ card }) => <TradeBackPreview trade={card.data} isDark={isDark} />}
            renderCard={({ card }) => <TradeCardBody trade={card.data} now={now} isDark={isDark} />}
          />
        ) : null}

        {tab === "NEEDS" ? (
          <View style={{ width: "100%", gap: 12 }}>
            {needs.map((n) => (
              <BubbleItem key={n.id} title={n.title} details={n.details} isDark={isDark} />
            ))}
          </View>
        ) : null}

        {tab === "OFFERS" ? (
          <View style={{ width: "100%", gap: 12 }}>
            {offers.map((o) => (
              <BubbleItem key={o.id} title={o.title} details={o.details} isDark={isDark} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 14,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  centerZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 6,
  },
  rect: {
    width: "92%",
    height: 104,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  iconRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  backPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
});
