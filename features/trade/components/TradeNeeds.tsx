import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { useTradeStore } from "../state";
import type { TradeCategory, TradeNeedItem, TradeServiceMode, TradeStatus, TradeUrgency } from "../types";

const CATEGORY_LABELS: Record<TradeCategory, string> = {
  design: "Design",
  development: "Development",
  marketing: "Marketing",
  writing: "Writing",
  "photo-video": "Photo / Video",
  language: "Language",
  "home-help": "Home help",
  teaching: "Teaching",
  business: "Business",
  other: "Other",
};

const MODE_LABELS: Record<TradeServiceMode, string> = {
  remote: "Remote",
  local: "Local",
  hybrid: "Hybrid",
};

const URGENCY_LABELS: Record<TradeUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const STATUS_LABELS: Record<TradeStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  matched: "Matched",
  expired: "Expired",
  closed: "Closed",
};

const CATEGORY_OPTIONS: TradeCategory[] = [
  "design",
  "development",
  "marketing",
  "writing",
  "photo-video",
  "language",
  "home-help",
  "teaching",
  "business",
  "other",
];

const MODE_OPTIONS: TradeServiceMode[] = ["remote", "local", "hybrid"];
const URGENCY_OPTIONS: TradeUrgency[] = ["low", "medium", "high", "urgent"];

type NeedDraft = {
  title: string;
  category: TradeCategory;
  timing: string;
  mode: TradeServiceMode;
  urgency: TradeUrgency;
  locationLabel: string;
  shortDescription: string;
  tagsText: string;
  desiredExchange: string;
};

const EMPTY_NEED_DRAFT: NeedDraft = {
  title: "",
  category: "design",
  timing: "This week",
  mode: "remote",
  urgency: "medium",
  locationLabel: "Remote",
  shortDescription: "",
  tagsText: "",
  desiredExchange: "",
};

function compactMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();

  return <Text style={[styles.fieldLabel, { color: palette.muted }]}>{children}</Text>;
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline ? styles.multilineInput : null,
          {
            borderColor: palette.border,
            backgroundColor: palette.surface,
            color: palette.text,
          },
        ]}
      />
    </View>
  );
}

function OptionChip<TValue extends string>({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: TValue;
  selected: boolean;
  onSelect: (value: TValue) => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={() => onSelect(value)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.optionChip,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.text : palette.surface,
        },
        pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <Text style={[styles.optionChipText, { color: selected ? palette.background : palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function NeedCreateForm({ onCancel }: { onCancel: () => void }) {
  const { palette } = useTheme();
  const { createNeed } = useTradeStore();
  const [draft, setDraft] = useState<NeedDraft>(EMPTY_NEED_DRAFT);
  const [error, setError] = useState("");

  const canSave = draft.title.trim().length > 1;

  const tagsPreview = useMemo(() => parseTags(draft.tagsText), [draft.tagsText]);

  function updateDraft<TKey extends keyof NeedDraft>(key: TKey, value: NeedDraft[TKey]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (error) {
      setError("");
    }
  }

  function handleSave() {
    const title = draft.title.trim();

    if (!title) {
      setError("Add a short need title first.");
      return;
    }

    createNeed({
      title,
      category: draft.category,
      timing: draft.timing.trim() || "Flexible",
      mode: draft.mode,
      urgency: draft.urgency,
      locationLabel: draft.locationLabel.trim() || MODE_LABELS[draft.mode],
      shortDescription: draft.shortDescription.trim() || "No description yet.",
      tags: tagsPreview,
      desiredExchange: draft.desiredExchange.trim() || undefined,
      status: "active",
    });

    setDraft(EMPTY_NEED_DRAFT);
    setError("");
    onCancel();
  }

  return (
    <View style={[styles.formCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.formHeader}>
        <View style={styles.formHeaderText}>
          <Text style={[styles.formKicker, { color: palette.muted }]}>NEW NEED</Text>
          <Text style={[styles.formTitle, { color: palette.text }]}>Create a need</Text>
        </View>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.closeButton,
            { borderColor: palette.border, backgroundColor: palette.surface },
            pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.closeButtonText, { color: palette.text }]}>×</Text>
        </Pressable>
      </View>

      <TextField
        label="Need title"
        value={draft.title}
        onChangeText={(value) => updateDraft("title", value)}
        placeholder="Example: Landing page design"
      />

      <TextField
        label="Short description"
        value={draft.shortDescription}
        onChangeText={(value) => updateDraft("shortDescription", value)}
        placeholder="What do you need help with?"
        multiline
      />

      <View style={styles.field}>
        <FieldLabel>Category</FieldLabel>
        <View style={styles.optionWrap}>
          {CATEGORY_OPTIONS.map((category) => (
            <OptionChip
              key={category}
              label={CATEGORY_LABELS[category]}
              value={category}
              selected={draft.category === category}
              onSelect={(value) => updateDraft("category", value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.twoColumnFields}>
        <TextField
          label="Timing"
          value={draft.timing}
          onChangeText={(value) => updateDraft("timing", value)}
          placeholder="This week"
        />
        <TextField
          label="Location"
          value={draft.locationLabel}
          onChangeText={(value) => updateDraft("locationLabel", value)}
          placeholder="Remote"
        />
      </View>

      <View style={styles.field}>
        <FieldLabel>Mode</FieldLabel>
        <View style={styles.optionWrap}>
          {MODE_OPTIONS.map((mode) => (
            <OptionChip
              key={mode}
              label={MODE_LABELS[mode]}
              value={mode}
              selected={draft.mode === mode}
              onSelect={(value) => updateDraft("mode", value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>Urgency</FieldLabel>
        <View style={styles.optionWrap}>
          {URGENCY_OPTIONS.map((urgency) => (
            <OptionChip
              key={urgency}
              label={URGENCY_LABELS[urgency]}
              value={urgency}
              selected={draft.urgency === urgency}
              onSelect={(value) => updateDraft("urgency", value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Tags"
        value={draft.tagsText}
        onChangeText={(value) => updateDraft("tagsText", value)}
        placeholder="Web design, Launch, UI"
      />

      <TextField
        label="Desired exchange"
        value={draft.desiredExchange}
        onChangeText={(value) => updateDraft("desiredExchange", value)}
        placeholder="Example: Product photos or app debugging"
      />

      {error ? <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text> : null}

      <View style={styles.formActions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: palette.border, backgroundColor: palette.surface },
            pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          disabled={!canSave}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.text },
            !canSave ? { opacity: 0.42 } : null,
            pressed && canSave ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: palette.background }]}>Save need</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CreateNeedCard({ onPress }: { onPress: () => void }) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.createCard,
        { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.createPlus, { color: palette.muted }]}>＋</Text>
      <Text style={[styles.createTitle, { color: palette.text }]}>Create a need</Text>
      <Text style={[styles.createText, { color: palette.muted }]}>
        Describe what you need and what kind of trade you want.
      </Text>
    </Pressable>
  );
}

function NeedListCard({ item, index }: { item: TradeNeedItem; index: number }) {
  const { palette } = useTheme();
  const meta = compactMeta([CATEGORY_LABELS[item.category], item.timing, MODE_LABELS[item.mode]]);

  return (
    <Pressable
      onPress={() => console.log("open need", item.id)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.needCard,
        { borderColor: palette.border, backgroundColor: palette.surface },
        pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={styles.needTopRow}>
        <Text style={[styles.needKicker, { color: palette.muted }]} numberOfLines={1}>
          CREATED NEED {index + 1}
        </Text>
        <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.statusText, { color: palette.text }]} numberOfLines={1}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={[styles.needTitle, { color: palette.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.needMeta, { color: palette.muted }]} numberOfLines={1}>
        {meta}
      </Text>

      {item.desiredExchange ? (
        <Text style={[styles.exchangeText, { color: palette.text }]} numberOfLines={1}>
          Wants: {item.desiredExchange}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function TradeNeeds() {
  const { palette } = useTheme();
  const { needs } = useTradeStore();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {isCreating ? <NeedCreateForm onCancel={() => setIsCreating(false)} /> : <CreateNeedCard onPress={() => setIsCreating(true)} />}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionKicker, { color: palette.muted }]}>MY NEEDS</Text>
        <Text style={[styles.sectionCount, { color: palette.muted }]}>{needs.length} created</Text>
      </View>

      <View style={styles.list}>
        {needs.map((item, index) => (
          <NeedListCard key={item.id} item={item} index={index} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 42,
    paddingTop: 22,
    gap: 18,
  },

  formCard: {
    borderWidth: 1,
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  formHeaderText: {
    flex: 1,
    gap: 3,
  },
  formKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
  },
  closeButtonText: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 24,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  multilineInput: {
    minHeight: 86,
  },
  twoColumnFields: {
    gap: 12,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  createCard: {
    minHeight: 188,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 34,
    borderStyle: "dashed",
    paddingHorizontal: 26,
    paddingVertical: 28,
    gap: 8,
  },
  createPlus: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 26,
    textAlign: "center",
  },
  createText: {
    maxWidth: 260,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  list: {
    gap: 14,
  },
  needCard: {
    minHeight: 124,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  needTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  needKicker: {
    flex: 1,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  needTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  needMeta: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  exchangeText: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
});
