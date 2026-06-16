import { Stack, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

import { meHubSections, navLabTabs, planPreviews, tradeFilters, tradePreviews } from "./navLab.mockData";
import type { MeHubSection, MeHubSectionId, NavLabTabId, PlanPreview, TradeFilterId, TradePreview } from "./navLab.types";

const desktopBreakpoint = 820;
const meOrderStorageKey = "hellowhen-nav-lab-me-section-order-v1";
const defaultMeSectionOrder: MeHubSectionId[] = ["activity", "plans", "tools", "account"];

function normalizeSectionOrder(order: string[] | null | undefined): MeHubSectionId[] {
  const validIds = new Set(defaultMeSectionOrder);
  const cleanOrder = (order ?? []).filter((id): id is MeHubSectionId => validIds.has(id as MeHubSectionId));
  return [...cleanOrder, ...defaultMeSectionOrder.filter((id) => !cleanOrder.includes(id))];
}

function readStoredSectionOrder() {
  if (Platform.OS !== "web") {
    return defaultMeSectionOrder;
  }

  try {
    const storage = (globalThis as any).localStorage as { getItem?: (key: string) => string | null } | undefined;
    const rawValue = storage?.getItem?.(meOrderStorageKey);

    if (!rawValue) {
      return defaultMeSectionOrder;
    }

    const parsedValue = JSON.parse(rawValue);
    return normalizeSectionOrder(Array.isArray(parsedValue) ? parsedValue : null);
  } catch {
    return defaultMeSectionOrder;
  }
}

function persistSectionOrder(order: MeHubSectionId[]) {
  if (Platform.OS !== "web") {
    return;
  }

  try {
    const storage = (globalThis as any).localStorage as { setItem?: (key: string, value: string) => void } | undefined;
    storage?.setItem?.(meOrderStorageKey, JSON.stringify(order));
  } catch {
    // Local persistence is best-effort for this isolated lab.
  }
}

function moveSectionOrder(order: MeHubSectionId[], sectionId: MeHubSectionId, direction: -1 | 1) {
  const nextOrder = [...order];
  const currentIndex = nextOrder.indexOf(sectionId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) {
    return nextOrder;
  }

  [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
  return nextOrder;
}

function getOrderedSections(order: MeHubSectionId[]) {
  return normalizeSectionOrder(order)
    .map((id) => meHubSections.find((section) => section.id === id))
    .filter((section): section is MeHubSection => Boolean(section));
}

function sectionOrderChanged(order: MeHubSectionId[]) {
  return order.some((id, index) => id !== defaultMeSectionOrder[index]);
}

function getTabTitle(tabId: NavLabTabId) {
  return navLabTabs.find((tab) => tab.id === tabId)?.label ?? "Me";
}

function LabHeader({ activeTab, isDesktop }: { activeTab: NavLabTabId; isDesktop: boolean }) {
  const { mode, palette, toggleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const active = navLabTabs.find((tab) => tab.id === activeTab) ?? navLabTabs[1];

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + (isDesktop ? 18 : 14),
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>{"< Labs"}</Text>
        </Pressable>

        <View style={styles.headerPill}>
          <Text style={[styles.headerPillText, { color: palette.muted }]}>NAV-LAB5</Text>
        </View>

        <Pressable
          onPress={toggleMode}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>Mode: {mode}</Text>
        </Pressable>
      </View>

      <View style={styles.headerTitleRow}>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.eyebrow, { color: palette.muted }]}>TRADE SHELL FILTERS</Text>
          <Text style={[styles.title, { color: palette.text }]}>{getTabTitle(activeTab)}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{active.tagline}</Text>
        </View>
      </View>
    </View>
  );
}

function TopTabs({ activeTab, onChange }: { activeTab: NavLabTabId; onChange: (tab: NavLabTabId) => void }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.topTabsWrap, { borderBottomColor: palette.border }]}>
      <View style={[styles.topTabs, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        {navLabTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.topTabButton,
                isActive ? { backgroundColor: palette.surface } : null,
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.topTabLabel, { color: isActive ? palette.text : palette.muted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BottomTabs({ activeTab, onChange }: { activeTab: NavLabTabId; onChange: (tab: NavLabTabId) => void }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomTabs,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      {navLabTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.bottomTabButton,
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <View
              style={[
                styles.bottomTabIndicator,
                { backgroundColor: isActive ? palette.text : "transparent" },
              ]}
            />
            <Text
              style={[
                styles.bottomTabLabel,
                { color: isActive ? palette.text : palette.muted },
                isActive ? styles.bottomTabLabelActive : null,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
    </View>
  );
}

function getSectionCount(section: MeHubSection) {
  return section.items.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

function SectionCountPill({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();
  const count = getSectionCount(section);

  if (count <= 0) {
    return null;
  }

  return (
    <View style={[styles.sectionCountPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.sectionCountText, { color: palette.text }]}>{count}</Text>
    </View>
  );
}

function MeItemRows({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.itemList, { borderTopColor: palette.border }]}>
      {section.items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.meItemRow,
            index > 0 ? { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth } : null,
          ]}
        >
          <View style={styles.meItemTextBlock}>
            <Text style={[styles.meItemLabel, { color: palette.text }]}>{item.label}</Text>
            {item.subtitle ? (
              <Text style={[styles.meItemSubtitle, { color: palette.muted }]}>{item.subtitle}</Text>
            ) : null}
          </View>
          <View style={styles.meItemRight}>
            {typeof item.count === "number" ? (
              <View style={[styles.countPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
                <Text style={[styles.countPillText, { color: palette.text }]}>{item.count}</Text>
              </View>
            ) : null}
            <Text style={[styles.rowChevron, { color: palette.muted }]}>›</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MobileMeAccordionCard({
  section,
  expanded,
  onToggle,
}: {
  section: MeHubSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.meSection, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.meAccordionHeader,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <View style={styles.meSectionTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
          <View style={styles.meAccordionTitleRow}>
            <Text style={[styles.meSectionTitle, { color: palette.text }]}>{section.title}</Text>
            <SectionCountPill section={section} />
          </View>
        </View>
        <Text style={[styles.mockChevron, { color: palette.muted }]}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      <Text style={[styles.meSectionSummary, { color: palette.muted }]}>{section.summary}</Text>

      {expanded ? <MeItemRows section={section} /> : null}
    </View>
  );
}

function DesktopSectionTabs({
  activeSectionId,
  sections,
  onChange,
}: {
  activeSectionId: MeHubSectionId;
  sections: MeHubSection[];
  onChange: (sectionId: MeHubSectionId) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.desktopSectionTabs, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      {sections.map((section) => {
        const isActive = activeSectionId === section.id;
        return (
          <Pressable
            key={section.id}
            onPress={() => onChange(section.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.desktopSectionTab,
              isActive ? { backgroundColor: palette.surface, borderColor: palette.border } : { borderColor: "transparent" },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.desktopSectionTabEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
            <View style={styles.desktopSectionTabTitleRow}>
              <Text style={[styles.desktopSectionTabTitle, { color: isActive ? palette.text : palette.muted }]}>
                {section.title}
              </Text>
              <SectionCountPill section={section} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function DesktopMePanel({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.desktopMePanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.desktopMePanelHeader}>
        <View style={styles.meSectionTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
          <Text style={[styles.desktopMePanelTitle, { color: palette.text }]}>{section.title}</Text>
          <Text style={[styles.desktopMePanelSummary, { color: palette.muted }]}>{section.summary}</Text>
        </View>
        <SectionCountPill section={section} />
      </View>
      <MeItemRows section={section} />
    </View>
  );
}

function ReorderControlButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.reorderControlButton,
        {
          borderColor: palette.border,
          backgroundColor: disabled ? palette.surfaceAlt : palette.surface,
          opacity: disabled ? 0.42 : 1,
        },
        pressed && !disabled ? styles.pressed : null,
        Platform.OS === "web" && !disabled ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <Text style={[styles.reorderControlText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function MobileMeOrderCard({
  section,
  index,
  totalSections,
  onMoveUp,
  onMoveDown,
}: {
  section: MeHubSection;
  index: number;
  totalSections: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.reorderCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.reorderHandle}>
        <Text style={[styles.reorderHandleIcon, { color: palette.muted }]}>☰</Text>
        <Text style={[styles.reorderIndex, { color: palette.muted }]}>{index + 1}</Text>
      </View>
      <View style={styles.reorderTextBlock}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
        <View style={styles.meAccordionTitleRow}>
          <Text style={[styles.reorderTitle, { color: palette.text }]}>{section.title}</Text>
          <SectionCountPill section={section} />
        </View>
        <Text style={[styles.reorderSummary, { color: palette.muted }]}>{section.summary}</Text>
      </View>
      <View style={styles.reorderControls}>
        <ReorderControlButton label="↑" disabled={index === 0} onPress={onMoveUp} />
        <ReorderControlButton label="↓" disabled={index === totalSections - 1} onPress={onMoveDown} />
      </View>
    </View>
  );
}

function MobileMeHub({
  sections,
  expandedSectionIds,
  customizeMode,
  canResetOrder,
  onToggleSection,
  onToggleCustomizeMode,
  onMoveSection,
  onResetOrder,
}: {
  sections: MeHubSection[];
  expandedSectionIds: MeHubSectionId[];
  customizeMode: boolean;
  canResetOrder: boolean;
  onToggleSection: (sectionId: MeHubSectionId) => void;
  onToggleCustomizeMode: () => void;
  onMoveSection: (sectionId: MeHubSectionId, direction: -1 | 1) => void;
  onResetOrder: () => void;
}) {
  const { palette } = useTheme();

  if (customizeMode) {
    return (
      <>
        <View style={styles.mobileHubToolbar}>
          <SectionHeader label="CUSTOMIZE ME" title="Reorder sections for small screens" />
          <Text style={[styles.customizeHint, { color: palette.muted }]}>
            Section order is local to this lab prototype. Main navigation stays fixed.
          </Text>
          <View style={styles.customizeActions}>
            <Pressable
              onPress={onResetOrder}
              accessibilityRole="button"
              disabled={!canResetOrder}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                { borderColor: palette.border, opacity: canResetOrder ? 1 : 0.45 },
                pressed && canResetOrder ? styles.pressed : null,
                Platform.OS === "web" && canResetOrder ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Reset default</Text>
            </Pressable>
            <Pressable
              onPress={onToggleCustomizeMode}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryActionButton,
                { backgroundColor: palette.text },
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.primaryActionText, { color: palette.background }]}>Done</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.meStack}>
          {sections.map((section, index) => (
            <MobileMeOrderCard
              key={section.id}
              section={section}
              index={index}
              totalSections={sections.length}
              onMoveUp={() => onMoveSection(section.id, -1)}
              onMoveDown={() => onMoveSection(section.id, 1)}
            />
          ))}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.mobileHubToolbar}>
        <SectionHeader label="MOBILE ME HUB" title="Tap sections to expand or collapse" />
        <Pressable
          onPress={onToggleCustomizeMode}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.customizeButton,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            pressed ? styles.pressed : null,
            Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
          ]}
        >
          <Text style={[styles.customizeButtonText, { color: palette.text }]}>Customize order</Text>
        </Pressable>
      </View>

      <View style={styles.meStack}>
        {sections.map((section) => (
          <MobileMeAccordionCard
            key={section.id}
            section={section}
            expanded={expandedSectionIds.includes(section.id)}
            onToggle={() => onToggleSection(section.id)}
          />
        ))}
      </View>
    </>
  );
}

function DesktopMeHub({
  sections,
  activeSectionId,
  onChangeSection,
}: {
  sections: MeHubSection[];
  activeSectionId: MeHubSectionId;
  onChangeSection: (sectionId: MeHubSectionId) => void;
}) {
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <>
      <SectionHeader label="DESKTOP ME HUB" title="Tabs mirror the current section order" />
      <DesktopSectionTabs sections={sections} activeSectionId={activeSectionId} onChange={onChangeSection} />
      <DesktopMePanel section={activeSection} />
    </>
  );
}

function MeScreen({ isDesktop }: { isDesktop: boolean }) {
  const { palette } = useTheme();
  const [expandedSectionIds, setExpandedSectionIds] = useState<MeHubSectionId[]>(["activity"]);
  const [activeDesktopSectionId, setActiveDesktopSectionId] = useState<MeHubSectionId>("activity");
  const [sectionOrder, setSectionOrder] = useState<MeHubSectionId[]>(() => readStoredSectionOrder());
  const [customizeMode, setCustomizeMode] = useState(false);
  const orderedSections = useMemo(() => getOrderedSections(sectionOrder), [sectionOrder]);
  const totalCount = useMemo(
    () =>
      meHubSections.reduce(
        (sum, section) => sum + section.items.reduce((inner, item) => inner + (item.count ?? 0), 0),
        0
      ),
    []
  );

  useEffect(() => {
    persistSectionOrder(sectionOrder);
  }, [sectionOrder]);

  const toggleSection = (sectionId: MeHubSectionId) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]
    );
  };

  const moveSection = (sectionId: MeHubSectionId, direction: -1 | 1) => {
    setSectionOrder((current) => moveSectionOrder(normalizeSectionOrder(current), sectionId, direction));
  };

  const resetSectionOrder = () => {
    setSectionOrder(defaultMeSectionOrder);
  };

  return (
    <View style={styles.tabContent}>
      <View style={[styles.profilePanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
          <Text style={[styles.avatarText, { color: palette.text }]}>K</Text>
        </View>
        <View style={styles.profileTextBlock}>
          <Text style={[styles.profileTitle, { color: palette.text }]}>Kopy</Text>
          <Text style={[styles.profileSubtitle, { color: palette.muted }]}>Paris · Hellowhen member</Text>
        </View>
        <View style={[styles.profileStatPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.profileStatValue, { color: palette.text }]}>{totalCount}</Text>
          <Text style={[styles.profileStatLabel, { color: palette.muted }]}>mock items</Text>
        </View>
      </View>

      {isDesktop ? (
        <DesktopMeHub
          sections={orderedSections}
          activeSectionId={activeDesktopSectionId}
          onChangeSection={setActiveDesktopSectionId}
        />
      ) : (
        <MobileMeHub
          sections={orderedSections}
          expandedSectionIds={expandedSectionIds}
          customizeMode={customizeMode}
          canResetOrder={sectionOrderChanged(sectionOrder)}
          onToggleSection={toggleSection}
          onToggleCustomizeMode={() => setCustomizeMode((current) => !current)}
          onMoveSection={moveSection}
          onResetOrder={resetSectionOrder}
        />
      )}
    </View>
  );
}

function PlanActionButton({ label, primary }: { label: string; primary?: boolean }) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.planActionButton,
        {
          borderColor: palette.border,
          backgroundColor: primary ? palette.text : palette.surfaceAlt,
        },
        pressed ? styles.pressed : null,
        Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <Text style={[styles.planActionText, { color: primary ? palette.background : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function PlanMiniStat({ label, value }: { label: string; value: string | number }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planMiniStat, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.planMiniStatValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.planMiniStatLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function PlanPreviewList({ title, items }: { title: string; items: string[] }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planPreviewList, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.planColumnTitle, { color: palette.text }]}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.planBulletRow}>
          <Text style={[styles.planBulletDot, { color: palette.muted }]}>•</Text>
          <Text style={[styles.bulletText, { color: palette.muted }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PlanCard({
  plan,
  expanded,
  onToggle,
}: {
  plan: PlanPreview;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const compactMeta = `${plan.needs.length} needs · ${plan.offers.length} offers · ${plan.joinedCount} joined`;

  return (
    <View style={[styles.planCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.planCardHeader,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <View style={styles.planHeaderTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>
            {plan.category.toUpperCase()} · {plan.status.toUpperCase()}
          </Text>
          <Text style={[styles.planTitle, { color: palette.text }]}>{plan.title}</Text>
          <Text style={[styles.planSummary, { color: palette.muted }]}>{plan.summary}</Text>
        </View>
        <Text style={[styles.mockChevron, { color: palette.muted }]}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {!expanded ? (
        <View style={styles.collapsedPlanMetaRow}>
          <Text style={[styles.footerMeta, { color: palette.muted }]}>{compactMeta}</Text>
          <Text style={[styles.footerAction, { color: palette.text }]}>Expand</Text>
        </View>
      ) : (
        <>
          <View style={styles.planStatsRow}>
            <PlanMiniStat label="needs" value={plan.needs.length} />
            <PlanMiniStat label="offers" value={plan.offers.length} />
            <PlanMiniStat label="interested" value={plan.interestedCount} />
            <PlanMiniStat label="joined" value={plan.joinedCount} />
          </View>

          <View style={styles.planColumns}>
            <PlanPreviewList title="Needs preview" items={plan.needs} />
            <PlanPreviewList title="Offers preview" items={plan.offers} />
          </View>

          <View style={[styles.nextStepPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.nextStepLabel, { color: palette.muted }]}>Suggested next step</Text>
            <Text style={[styles.nextStepText, { color: palette.text }]}>{plan.nextStep}</Text>
          </View>

          <View style={[styles.planActions, { borderTopColor: palette.border }]}>
            <PlanActionButton label="View plan" primary />
            <PlanActionButton label="Help / Join" />
            <PlanActionButton label="Create similar" />
          </View>
        </>
      )}
    </View>
  );
}

function PlansScreen() {
  const { palette } = useTheme();
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([planPreviews[0]?.id ?? ""]);

  const togglePlan = (planId: string) => {
    setExpandedPlanIds((current) =>
      current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId]
    );
  };

  return (
    <View style={styles.tabContent}>
      <View style={[styles.heroPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.plansHeroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroEyebrow, { color: palette.muted }]}>FUTURE MAIN AREA</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Plans are bigger goals.</Text>
            <Text style={[styles.heroCopy, { color: palette.muted }]}>
              A plan can contain needs, offers, people, and later trades. This lab keeps them as expandable
              mock plan cards.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createPlanButton,
              { borderColor: palette.border, backgroundColor: palette.text },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.createPlanButtonText, { color: palette.background }]}>+ Create</Text>
          </Pressable>
        </View>
      </View>

      <SectionHeader label="MOCK PLAN FEED" title="Tap a plan to expand needs and offers" />
      <View style={styles.cardStack}>
        {planPreviews.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            expanded={expandedPlanIds.includes(plan.id)}
            onToggle={() => togglePlan(plan.id)}
          />
        ))}
      </View>
    </View>
  );
}

function getFilteredTradeItems(activeFilterId: TradeFilterId) {
  if (activeFilterId === "trades") {
    return tradePreviews.filter((item) => item.type === "trade");
  }

  if (activeFilterId === "needs") {
    return tradePreviews.filter((item) => item.type === "open_need");
  }

  if (activeFilterId === "offers") {
    return tradePreviews.filter((item) => item.type === "open_offer");
  }

  return tradePreviews;
}

function getFilterCount(filterId: TradeFilterId) {
  return getFilteredTradeItems(filterId).length;
}

function TradeFilterShell({
  expanded,
  activeFilterId,
  onToggleExpanded,
  onChangeFilter,
}: {
  expanded: boolean;
  activeFilterId: TradeFilterId;
  onToggleExpanded: () => void;
  onChangeFilter: (filterId: TradeFilterId) => void;
}) {
  const { palette } = useTheme();
  const activeFilter = tradeFilters.find((filter) => filter.id === activeFilterId) ?? tradeFilters[0];

  return (
    <View style={[styles.filterPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.filterHeaderButton,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <View style={styles.filterHeaderTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>COLLAPSIBLE FILTERS</Text>
          <Text style={[styles.filterTitle, { color: palette.text }]}>{activeFilter.label}</Text>
          <Text style={[styles.filterHelper, { color: palette.muted }]}>{activeFilter.helper}</Text>
        </View>
        <View style={styles.filterHeaderRight}>
          <View style={[styles.filterCountPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.filterCountText, { color: palette.text }]}>{getFilterCount(activeFilterId)}</Text>
          </View>
          <Text style={[styles.mockChevron, { color: palette.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          <View style={[styles.filterDivider, { backgroundColor: palette.border }]} />
          <View style={styles.filterRow}>
            {tradeFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => onChangeFilter(filter.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      borderColor: palette.border,
                      backgroundColor: isActive ? palette.text : palette.surfaceAlt,
                    },
                    pressed ? styles.pressed : null,
                    Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: isActive ? palette.background : palette.text }]}>
                    {filter.label} · {getFilterCount(filter.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.filterFootnote, { color: palette.muted }]}>
            Main navigation stays fixed. Needs and offers are explored from this Trade area instead of separate root tabs.
          </Text>
        </>
      ) : null}
    </View>
  );
}

function StarterPlacementPreview() {
  const { palette } = useTheme();

  return (
    <View style={[styles.starterPlacementPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>STARTER PLACEMENT PREVIEW</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>IDEAS</Text>
        </View>
      </View>
      <Text style={[styles.starterPlacementTitle, { color: palette.text }]}>Starter cards appear only as honest ideas.</Text>
      <Text style={[styles.starterPlacementCopy, { color: palette.muted }]}>
        In this lab, the All feed shows a starter card after real/mock feed items. Filtered views hide starter ideas so search-style browsing feels clean.
      </Text>
    </View>
  );
}

function OpenItemCard({ item }: { item: TradePreview }) {
  const { palette } = useTheme();
  const isNeed = item.type === "open_need";

  return (
    <View style={[styles.openItemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{isNeed ? "OPEN NEED" : "OPEN OFFER"}</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{isNeed ? "NEED" : "OFFER"}</Text>
        </View>
      </View>

      <Text style={[styles.openItemTitle, { color: palette.text }]}>{item.title}</Text>
      <Text style={[styles.tradeMeta, { color: palette.muted }]}>{item.meta}</Text>

      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>Real open {isNeed ? "need" : "offer"} preview</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>{item.footerLabel}</Text>
      </View>
    </View>
  );
}

function TradeCard({ trade }: { trade: TradePreview }) {
  const { palette } = useTheme();
  const isStarter = trade.type === "starter";

  if (trade.type === "open_need" || trade.type === "open_offer") {
    return <OpenItemCard item={trade} />;
  }

  return (
    <View style={[styles.tradeCard, isStarter ? styles.starterTradeCard : null, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>
          {isStarter ? "TRADE IDEA" : "OPEN TRADE"}
        </Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{isStarter ? "IDEA" : "LIVE"}</Text>
        </View>
      </View>

      {isStarter && trade.placementNote ? (
        <Text style={[styles.starterPlacementNote, { color: palette.muted }]}>{trade.placementNote}</Text>
      ) : null}

      <View style={styles.exchangeBlock}>
        <View style={styles.exchangeSide}>
          <Text style={[styles.exchangeLabel, { color: palette.muted }]}>I need</Text>
          <Text style={[styles.exchangeTitle, { color: palette.text }]}>{trade.needTitle}</Text>
        </View>
        <View style={[styles.exchangeDivider, { backgroundColor: palette.border }]} />
        <Text style={[styles.exchangeIcon, { color: palette.muted }]}>↔</Text>
        <View style={[styles.exchangeDivider, { backgroundColor: palette.border }]} />
        <View style={styles.exchangeSide}>
          <Text style={[styles.exchangeLabel, { color: palette.muted }]}>I offer</Text>
          <Text style={[styles.exchangeTitle, { color: palette.text }]}>{trade.offerTitle}</Text>
        </View>
      </View>

      <Text style={[styles.tradeMeta, { color: palette.muted }]}>{trade.meta}</Text>
      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>{isStarter ? "Starter idea card" : "Real trade preview"}</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>{trade.footerLabel}</Text>
      </View>
    </View>
  );
}

function TradeScreen() {
  const { palette } = useTheme();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<TradeFilterId>("all");
  const visibleItems = useMemo(() => getFilteredTradeItems(activeFilterId), [activeFilterId]);
  const showStarterPlacementPreview = activeFilterId === "all";

  return (
    <View style={styles.tabContent}>
      <View style={[styles.heroPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.plansHeroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroEyebrow, { color: palette.muted }]}>FUTURE TRADE AREA</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Trade keeps the deck identity.</Text>
            <Text style={[styles.heroCopy, { color: palette.muted }]}>
              Needs and offers move into collapsible filters, create menus, and Me instead of staying in the main nav.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createPlanButton,
              { borderColor: palette.border, backgroundColor: palette.text },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.createPlanButtonText, { color: palette.background }]}>+ Create</Text>
          </Pressable>
        </View>
      </View>

      <TradeFilterShell
        expanded={filtersExpanded}
        activeFilterId={activeFilterId}
        onToggleExpanded={() => setFiltersExpanded((current) => !current)}
        onChangeFilter={setActiveFilterId}
      />

      {showStarterPlacementPreview ? <StarterPlacementPreview /> : null}

      <SectionHeader
        label="MOCK TRADE FEED"
        title={activeFilterId === "all" ? "Real items plus starter ideas" : `${visibleItems.length} filtered items`}
      />
      <View style={styles.cardStack}>
        {visibleItems.map((trade) => (
          <TradeCard key={trade.id} trade={trade} />
        ))}
      </View>
    </View>
  );
}

function ActiveContent({ activeTab, isDesktop }: { activeTab: NavLabTabId; isDesktop: boolean }) {
  if (activeTab === "plans") {
    return <PlansScreen />;
  }
  if (activeTab === "trade") {
    return <TradeScreen />;
  }
  return <MeScreen isDesktop={isDesktop} />;
}

export function NavLabScreen() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<NavLabTabId>("me");
  const isDesktop = Platform.OS === "web" && width >= desktopBreakpoint;

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Navigation Lab", headerShown: false }} />
      <View style={[styles.shell, isDesktop ? styles.desktopShell : null]}>
        <LabHeader activeTab={activeTab} isDesktop={isDesktop} />
        {isDesktop ? <TopTabs activeTab={activeTab} onChange={setActiveTab} /> : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop ? styles.scrollContentDesktop : null,
            !isDesktop ? styles.scrollContentMobile : null,
          ]}
        >
          <ActiveContent activeTab={activeTab} isDesktop={isDesktop} />
        </ScrollView>
        {!isDesktop ? <BottomTabs activeTab={activeTab} onChange={setActiveTab} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  desktopShell: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.68,
  },
  headerPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerTitleRow: {
    marginTop: 16,
    flexDirection: "row",
  },
  headerTitleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 6,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 20,
  },
  topTabsWrap: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTabs: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  topTabButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  topTabLabel: {
    fontSize: 14,
    fontWeight: "900",
  },
  bottomTabs: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  bottomTabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomTabIndicator: {
    width: 26,
    height: 3,
    borderRadius: 999,
  },
  bottomTabLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  bottomTabLabelActive: {
    fontWeight: "900",
  },
  scrollContent: {
    padding: 18,
  },
  scrollContentDesktop: {
    paddingBottom: 48,
  },
  scrollContentMobile: {
    paddingBottom: 28,
  },
  tabContent: {
    gap: 16,
  },
  profilePanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
  },
  profileTextBlock: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  profileSubtitle: {
    marginTop: 3,
    fontSize: 13,
  },
  profileStatPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  profileStatLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeader: {
    gap: 5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  mobileHubToolbar: {
    gap: 10,
  },
  customizeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customizeButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  customizeHint: {
    maxWidth: 520,
    fontSize: 13,
    lineHeight: 18,
  },
  customizeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryActionButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  primaryActionButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  reorderCard: {
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reorderHandle: {
    width: 32,
    alignItems: "center",
    gap: 5,
  },
  reorderHandleIcon: {
    fontSize: 19,
    fontWeight: "900",
  },
  reorderIndex: {
    fontSize: 11,
    fontWeight: "900",
  },
  reorderTextBlock: {
    flex: 1,
  },
  reorderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  reorderSummary: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  reorderControls: {
    gap: 8,
  },
  reorderControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderControlText: {
    fontSize: 17,
    fontWeight: "900",
  },
  nextPatchPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nextPatchPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  sectionCountPill: {
    minWidth: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "900",
  },
  meAccordionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  meAccordionTitleRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  desktopSectionTabs: {
    flexDirection: "row",
    borderRadius: 26,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  desktopSectionTab: {
    flex: 1,
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: "space-between",
  },
  desktopSectionTabEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  desktopSectionTabTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  desktopSectionTabTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  desktopMePanel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  desktopMePanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  desktopMePanelTitle: {
    marginTop: 5,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  desktopMePanelSummary: {
    marginTop: 8,
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 20,
  },
  meStack: {
    gap: 12,
  },
  meGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  meSection: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  meSectionDesktop: {
    flexGrow: 1,
    flexBasis: "48%",
  },
  meSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  meSectionTitleBlock: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  meSectionTitle: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  mockChevron: {
    fontSize: 18,
    fontWeight: "900",
  },
  meSectionSummary: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  itemList: {
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meItemRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  meItemTextBlock: {
    flex: 1,
  },
  meItemLabel: {
    fontSize: 15,
    fontWeight: "900",
  },
  meItemSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
  },
  meItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countPill: {
    minWidth: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  rowChevron: {
    fontSize: 21,
    fontWeight: "900",
  },
  heroPanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  plansHeroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 680,
  },
  createPlanButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlanButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  cardStack: {
    gap: 12,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planHeaderTextBlock: {
    flex: 1,
  },
  cardTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  planSummary: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
  },
  collapsedPlanMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planMiniStat: {
    minWidth: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  planMiniStatValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  planMiniStatLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  planColumns: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  planColumn: {
    flex: 1,
    gap: 5,
  },
  planPreviewList: {
    flexGrow: 1,
    flexBasis: 240,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    gap: 7,
  },
  planColumnTitle: {
    marginBottom: 2,
    fontSize: 13,
    fontWeight: "900",
  },
  planBulletRow: {
    flexDirection: "row",
    gap: 7,
  },
  planBulletDot: {
    width: 9,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  nextStepPanel: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  nextStepLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  nextStepText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "900",
  },
  planActions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planActionButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  planActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerMeta: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  footerAction: {
    fontSize: 13,
    fontWeight: "900",
  },
  filterPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  filterHeaderButton: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  filterHeaderTextBlock: {
    flex: 1,
  },
  filterTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  filterHelper: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
  },
  filterHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterCountPill: {
    minWidth: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: "900",
  },
  filterDivider: {
    height: StyleSheet.hairlineWidth,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  filterFootnote: {
    fontSize: 12,
    lineHeight: 17,
  },
  starterPlacementPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  starterPlacementTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  starterPlacementCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  openItemCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  openItemTitle: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  starterTradeCard: {
    borderStyle: "dashed",
  },
  starterPlacementNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  tradeCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
  },
  smallTag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  smallTagText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  exchangeBlock: {
    marginTop: 18,
    alignItems: "center",
    gap: 12,
  },
  exchangeSide: {
    width: "100%",
    alignItems: "center",
    gap: 5,
  },
  exchangeLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  exchangeTitle: {
    textAlign: "center",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  exchangeDivider: {
    width: "64%",
    height: StyleSheet.hairlineWidth,
  },
  exchangeIcon: {
    fontSize: 22,
    fontWeight: "900",
  },
  tradeMeta: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});
