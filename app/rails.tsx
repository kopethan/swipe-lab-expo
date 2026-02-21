import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Section = {
  id: string;
  title: string;
  subtitle: string;
  sideLabel: string;
  // In the real app, this would render actual form controls.
  render: () => React.ReactNode;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function RailSettingsTemplateScreen() {
  const { height: H, width: W } = useWindowDimensions();
  const isNarrow = W < 760;

  // Card sizing: big enough to feel like “pages”, but with breathing room.
  const CARD_H = Math.round(clamp(H * 0.78, 520, 720));
  const GAP = 18;
  const STRIDE = CARD_H + GAP;

  const CARD_W = Platform.OS === "web" ? ("min(860px, 92vw)" as any) : Math.min(860, Math.round(W * 0.92));

  const scrollRef = useRef<ScrollView | null>(null);
  const activeRef = useRef(0);
  const jumpToken = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [active, setActive] = useState(0);
  const [railsVisible, setRailsVisible] = useState(true);
  const [edgeHint, setEdgeHint] = useState<"left" | "right" | null>(null);

  const sections: Section[] = useMemo(
    () => [
      {
        id: "prefs",
        title: "Preferences",
        subtitle: "Language, time zone, formats",
        sideLabel: "Prefs",
        render: () => (
          <View style={styles.rows}>
            <Row label="Language" hint="Affects date/time formatting." value="English" />
            <Row
              label="Time zone"
              hint="Displayed only in v1 (inputs remain device time zone)."
              value="Auto-detect (Europe/Paris)"
            />
            <Row label="Date format" hint="How dates are shown." value="DD/MM/YYYY" />
            <Row label="Time format" hint="Choose 24-hour or 12-hour." value="24-hour" />
          </View>
        ),
      },
      {
        id: "notifs",
        title: "Notifications",
        subtitle: "Message alerts and badges",
        sideLabel: "Notifs",
        render: () => (
          <View style={styles.rows}>
            <Row
              label="Message notifications"
              hint="Shows in-app alerts and unread indicators."
              value="On"
            />
          </View>
        ),
      },
      {
        id: "privacy",
        title: "Privacy",
        subtitle: "Visibility and data controls",
        sideLabel: "Privacy",
        render: () => (
          <View style={styles.rows}>
            <Row label="Profile visibility" hint="Who can see your profile." value="Public" />
            <Row label="Data export" hint="Export your account data." value="Available" />
            <Row label="Data deletion" hint="Permanently delete your data." value="Request" />
          </View>
        ),
      },
      {
        id: "identity",
        title: "Identity",
        subtitle: "Name and email",
        sideLabel: "ID",
        render: () => (
          <View style={styles.rows}>
            <Row label="Display name" hint="Shown on plans and talk threads." value="kopy" />
            <Row label="Email" hint="Used for login and notifications." value="k.arudhs...@gmail.com" />
            <Row label="Account type" hint="Standard members can create/join plans." value="Standard" />
          </View>
        ),
      },
      {
        id: "security",
        title: "Security",
        subtitle: "Password and sessions",
        sideLabel: "Security",
        render: () => (
          <View style={styles.rows}>
            <Row label="Change password" hint="Requires current password." value="" />
            <Row label="Two-factor" hint="Coming later." value="" />
          </View>
        ),
      },
      {
        id: "support",
        title: "Support",
        subtitle: "Report issues and suggestions",
        sideLabel: "Support",
        render: () => (
          <View style={styles.rows}>
            <Row label="Topic" hint="Pick what this is about." value="Something isn't working" />
            <Row label="Short title" hint="Optional" value="" />
            <Row label="What's going on?" hint="Describe what happened." value="" />
          </View>
        ),
      },
    ],
    []
  );

  const offsets = useMemo(() => sections.map((_, i) => i * STRIDE), [sections, STRIDE]);

  const showRails = useCallback((side?: "left" | "right" | null) => {
    setRailsVisible(true);
    setEdgeHint(side ?? null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setRailsVisible(false);
      setEdgeHint(null);
    }, 1200);
  }, []);

  const snapToNearest = useCallback(
    (y: number) => {
      const idx = clamp(Math.round(y / STRIDE), 0, sections.length - 1);
      scrollRef.current?.scrollTo({ y: idx * STRIDE, animated: true });
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    },
    [STRIDE, sections.length]
  );

  const scheduleSnap = useCallback(
    (y: number) => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => snapToNearest(y), 90);
    },
    [snapToNearest]
  );

  const onScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y ?? 0;
      showRails();

      // Update active index only when it changes (avoid re-render spam).
      const idx = clamp(Math.round(y / STRIDE), 0, sections.length - 1);
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    },
    [STRIDE, sections.length, showRails]
  );

  const cancelJump = useCallback(() => {
    jumpToken.current += 1;
  }, []);

  const stepThroughTo = useCallback(
    (targetIndex: number) => {
      cancelJump();
      const token = jumpToken.current;
      const start = activeRef.current;
      const end = clamp(targetIndex, 0, sections.length - 1);
      if (start === end) {
        showRails();
        return;
      }

      const dir = end > start ? 1 : -1;
      const steps: number[] = [];
      for (let i = start + dir; dir > 0 ? i <= end : i >= end; i += dir) steps.push(i);

      // Fast “swipe-like” stepping: short animated scrolls.
      const STEP_MS = 220;
      steps.forEach((idx, k) => {
        setTimeout(() => {
          if (jumpToken.current !== token) return;
          scrollRef.current?.scrollTo({ y: idx * STRIDE, animated: true });
          activeRef.current = idx;
          setActive(idx);
          showRails(dir > 0 ? "right" : "left");
        }, k * STEP_MS);
      });
    },
    [STRIDE, sections.length, cancelJump, showRails]
  );

  useEffect(() => {
    // Show rails initially, then fade on idle.
    showRails();
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showRails]);

  return (
    <View
      style={styles.page}
      onMouseMove={
        Platform.OS === "web"
          ? (e: any) => {
              // Edge-hover hint: if pointer is near edges, keep rails visible.
              const x = e?.nativeEvent?.locationX;
              if (typeof x !== "number") return;
              const edge = 88;
              if (x <= edge) showRails("left");
              else if (x >= W - edge) showRails("right");
            }
          : undefined
      }
    >
      <ScrollView
        ref={(r) => (scrollRef.current = r)}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingVertical: 24 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToOffsets={offsets}
        snapToAlignment="start"
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          cancelJump();
          showRails();
        }}
        onScrollEndDrag={(e) => {
          scheduleSnap(e.nativeEvent.contentOffset.y ?? 0);
        }}
        onMomentumScrollEnd={(e) => {
          // Ensure we end exactly on a card even if platform snap is imperfect.
          snapToNearest(e.nativeEvent.contentOffset.y ?? 0);
        }}
      >
        {sections.map((s, i) => (
          <View
            key={s.id}
            style={{
              height: CARD_H,
              marginBottom: i === sections.length - 1 ? 0 : GAP,
            }}
          >
            <SectionCard width={CARD_W} title={s.title} subtitle={s.subtitle} active={i === active}>
              {s.render()}
            </SectionCard>
          </View>
        ))}
      </ScrollView>

      {/* Side rails */}
      <View pointerEvents="box-none" style={styles.railsWrap}>
        {!isNarrow && (
          <Rail
            side="left"
            visible={railsVisible}
            edgeHint={edgeHint}
            sections={sections}
            active={active}
            onPick={stepThroughTo}
          />
        )}
        <Rail
          side="right"
          visible={railsVisible}
          edgeHint={edgeHint}
          sections={sections}
          active={active}
          onPick={stepThroughTo}
          compact={isNarrow}
        />
      </View>
    </View>
  );
}

function SectionCard({
  width,
  title,
  subtitle,
  active,
  children,
}: {
  width: any;
  title: string;
  subtitle: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { width }, active ? styles.cardActive : styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
          <Text
            style={[
              styles.badgeText,
              active ? styles.badgeTextActive : styles.badgeTextInactive,
            ]}
          >
            {active ? "Active" : ""}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Rail({
  side,
  visible,
  edgeHint,
  sections,
  active,
  onPick,
  compact,
}: {
  side: "left" | "right";
  visible: boolean;
  edgeHint: "left" | "right" | null;
  sections: Section[];
  active: number;
  onPick: (idx: number) => void;
  compact?: boolean;
}) {
  const isLeft = side === "left";
  const baseOpacity = visible ? 1 : 0;
  const emphasis = edgeHint === side ? 1 : 0.75;

  // Left rail shows previous sections; right rail shows next sections.
  const items = sections
    .map((s, idx) => ({ s, idx }))
    .filter(({ idx }) => (isLeft ? idx < active : idx > active));

  // Always show a few items around the active section for context.
  const maxItems = compact ? 5 : 7;
  const sliced = isLeft
    ? items.slice(Math.max(0, items.length - maxItems))
    : items.slice(0, maxItems);

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.rail,
        isLeft ? styles.railLeft : styles.railRight,
        { opacity: baseOpacity * emphasis },
      ]}
    >
      {sliced.map(({ s, idx }) => (
        <Pressable
          key={s.id}
          onPress={() => onPick(idx)}
          style={({ pressed }) => [
            styles.railItem,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.railText}>{s.sideLabel}</Text>
        </Pressable>
      ))}
      {/* Active chip */}
      <Pressable onPress={() => onPick(active)} style={[styles.railItem, styles.railItemActive]}>
        <Text style={[styles.railText, styles.railTextActive]}>
          {sections[active]?.sideLabel ?? ""}
        </Text>
      </Pressable>
    </View>
  );
}

function Row({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0b0c0d",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 18,
  },
  railsWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  rail: {
    position: "absolute",
    top: 110,
    gap: 10,
  },
  railLeft: {
    left: 14,
    alignItems: "flex-start",
  },
  railRight: {
    right: 14,
    alignItems: "flex-end",
  },
  railItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(20,22,24,0.72)",
  },
  railItemActive: {
    borderColor: "rgba(44,229,255,0.55)",
    backgroundColor: "rgba(44,229,255,0.08)",
  },
  railText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  railTextActive: {
    color: "rgba(44,229,255,0.95)",
  },
  card: {
    borderRadius: 26,
    backgroundColor: "rgba(18,19,20,0.92)",
    borderWidth: 4,
    overflow: "hidden",
  },
  cardActive: {
    borderColor: "rgba(255,255,255,0.55)",
  },
  cardInactive: {
    borderColor: "rgba(255,255,255,0.28)",
  },
  cardHeader: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  badge: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeActive: {
    borderColor: "rgba(44,229,255,0.6)",
    backgroundColor: "rgba(44,229,255,0.10)",
  },
  badgeInactive: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgeTextActive: {
    color: "rgba(44,229,255,0.95)",
  },
  badgeTextInactive: {
    color: "rgba(255,255,255,0.0)",
  },
  cardBody: {
    padding: 18,
    flex: 1,
  },
  rows: {
    gap: 12,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    fontSize: 13,
  },
  rowHint: {
    marginTop: 2,
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
  },
  rowValue: {
    color: "rgba(44,229,255,0.95)",
    fontWeight: "800",
    fontSize: 12,
  },
});
