import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { useTradeStore } from "./state";
import type {
  TradeCategory,
  TradeDurationOption,
  TradeNeedItem,
  TradeOfferItem,
  TradeServiceMode,
  TradeUrgency,
} from "./types";

type CreateSegment = "need" | "offer" | "publish";
type SourceMode = "existing" | "new";

type QuickNeedDraft = {
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

type QuickOfferDraft = {
  title: string;
  category: TradeCategory;
  availability: string;
  mode: TradeServiceMode;
  includes: string;
  locationLabel: string;
  shortDescription: string;
  tagsText: string;
  preferredExchange: string;
};

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

const DURATION_OPTIONS: Array<{ value: TradeDurationOption; label: string; helper: string }> = [
  { value: "24h", label: "24 hours", helper: "Minimum listing time" },
  { value: "3d", label: "3 days", helper: "Short test window" },
  { value: "7d", label: "7 days", helper: "Recommended" },
  { value: "14d", label: "14 days", helper: "Maximum auto expiry" },
  { value: "manual", label: "Until I close it", helper: "Owner closes manually" },
];

const EMPTY_QUICK_NEED: QuickNeedDraft = {
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

const EMPTY_QUICK_OFFER: QuickOfferDraft = {
  title: "",
  category: "photo-video",
  availability: "Weekend",
  mode: "remote",
  includes: "",
  locationLabel: "Remote",
  shortDescription: "",
  tagsText: "",
  preferredExchange: "",
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

function addDurationToDate(startDate: Date, duration: TradeDurationOption) {
  const next = new Date(startDate);

  if (duration === "24h") {
    next.setHours(next.getHours() + 24);
    return next;
  }

  if (duration === "3d") {
    next.setDate(next.getDate() + 3);
    return next;
  }

  if (duration === "7d") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  if (duration === "14d") {
    next.setDate(next.getDate() + 14);
    return next;
  }

  return null;
}

function getDurationSummary(duration: TradeDurationOption) {
  const option = DURATION_OPTIONS.find((item) => item.value === duration);
  return option ? `${option.label} · ${option.helper}` : "7 days · Recommended";
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

function SegmentButton({
  value,
  label,
  complete,
  active,
  onPress,
}: {
  value: CreateSegment;
  label: string;
  complete: boolean;
  active: boolean;
  onPress: (value: CreateSegment) => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.segmentButton,
        {
          borderColor: active ? palette.text : palette.border,
          backgroundColor: active ? palette.text : palette.surface,
        },
        pressed ? { opacity: 0.84, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <Text style={[styles.segmentButtonText, { color: active ? palette.background : palette.text }]}>
        {label}
        {complete ? " ✓" : ""}
      </Text>
    </Pressable>
  );
}

function SourceToggle({
  value,
  onChange,
  existingLabel,
  newLabel,
}: {
  value: SourceMode;
  onChange: (value: SourceMode) => void;
  existingLabel: string;
  newLabel: string;
}) {
  return (
    <View style={styles.sourceToggle}>
      <OptionChip label={existingLabel} value="existing" selected={value === "existing"} onSelect={onChange} />
      <OptionChip label={newLabel} value="new" selected={value === "new"} onSelect={onChange} />
    </View>
  );
}

function SelectNeedCard({
  item,
  selected,
  onPress,
}: {
  item: TradeNeedItem;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const meta = compactMeta([CATEGORY_LABELS[item.category], item.timing, MODE_LABELS[item.mode]]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.selectCard,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.surfaceAlt : palette.surface,
        },
        pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.selectKicker, { color: palette.muted }]}>SAVED NEED</Text>
      <Text style={[styles.selectTitle, { color: palette.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.selectMeta, { color: palette.muted }]} numberOfLines={1}>
        {meta}
      </Text>
    </Pressable>
  );
}

function SelectOfferCard({
  item,
  selected,
  onPress,
}: {
  item: TradeOfferItem;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const meta = compactMeta([CATEGORY_LABELS[item.category], item.availability, MODE_LABELS[item.mode]]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.selectCard,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.surfaceAlt : palette.surface,
        },
        pressed ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.selectKicker, { color: palette.muted }]}>SAVED OFFER</Text>
      <Text style={[styles.selectTitle, { color: palette.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.selectMeta, { color: palette.muted }]} numberOfLines={1}>
        {meta}
      </Text>
    </Pressable>
  );
}

function QuickNeedFields({
  draft,
  onChange,
}: {
  draft: QuickNeedDraft;
  onChange: <TKey extends keyof QuickNeedDraft>(key: TKey, value: QuickNeedDraft[TKey]) => void;
}) {
  return (
    <View style={styles.quickFields}>
      <TextField
        label="Need title"
        value={draft.title}
        onChangeText={(value) => onChange("title", value)}
        placeholder="Example: Landing page design"
      />
      <TextField
        label="Need description"
        value={draft.shortDescription}
        onChangeText={(value) => onChange("shortDescription", value)}
        placeholder="What do you need help with?"
        multiline
      />

      <View style={styles.field}>
        <FieldLabel>Need category</FieldLabel>
        <View style={styles.optionWrap}>
          {CATEGORY_OPTIONS.map((category) => (
            <OptionChip
              key={category}
              label={CATEGORY_LABELS[category]}
              value={category}
              selected={draft.category === category}
              onSelect={(value) => onChange("category", value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.twoColumnFields}>
        <TextField
          label="Timing"
          value={draft.timing}
          onChangeText={(value) => onChange("timing", value)}
          placeholder="This week"
        />
        <TextField
          label="Location"
          value={draft.locationLabel}
          onChangeText={(value) => onChange("locationLabel", value)}
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
              onSelect={(value) => onChange("mode", value)}
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
              onSelect={(value) => onChange("urgency", value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Tags"
        value={draft.tagsText}
        onChangeText={(value) => onChange("tagsText", value)}
        placeholder="Web design, Launch, UI"
      />
      <TextField
        label="Desired exchange"
        value={draft.desiredExchange}
        onChangeText={(value) => onChange("desiredExchange", value)}
        placeholder="Example: Product photos"
      />
    </View>
  );
}

function QuickOfferFields({
  draft,
  onChange,
}: {
  draft: QuickOfferDraft;
  onChange: <TKey extends keyof QuickOfferDraft>(key: TKey, value: QuickOfferDraft[TKey]) => void;
}) {
  return (
    <View style={styles.quickFields}>
      <TextField
        label="Offer title"
        value={draft.title}
        onChangeText={(value) => onChange("title", value)}
        placeholder="Example: Product photography"
      />
      <TextField
        label="Offer description"
        value={draft.shortDescription}
        onChangeText={(value) => onChange("shortDescription", value)}
        placeholder="What can you provide?"
        multiline
      />

      <View style={styles.field}>
        <FieldLabel>Offer category</FieldLabel>
        <View style={styles.optionWrap}>
          {CATEGORY_OPTIONS.map((category) => (
            <OptionChip
              key={category}
              label={CATEGORY_LABELS[category]}
              value={category}
              selected={draft.category === category}
              onSelect={(value) => onChange("category", value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.twoColumnFields}>
        <TextField
          label="Availability"
          value={draft.availability}
          onChangeText={(value) => onChange("availability", value)}
          placeholder="Weekend"
        />
        <TextField
          label="Location"
          value={draft.locationLabel}
          onChangeText={(value) => onChange("locationLabel", value)}
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
              onSelect={(value) => onChange("mode", value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Includes"
        value={draft.includes}
        onChangeText={(value) => onChange("includes", value)}
        placeholder="Example: 10 edited shots"
      />
      <TextField
        label="Tags"
        value={draft.tagsText}
        onChangeText={(value) => onChange("tagsText", value)}
        placeholder="Photography, Editing, Studio"
      />
      <TextField
        label="Preferred exchange"
        value={draft.preferredExchange}
        onChangeText={(value) => onChange("preferredExchange", value)}
        placeholder="Example: Landing page design"
      />
    </View>
  );
}

function PreviewCard({
  needTitle,
  needMeta,
  offerTitle,
  offerMeta,
}: {
  needTitle: string;
  needMeta: string;
  offerTitle: string;
  offerMeta: string;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.previewCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.previewHeader}>
        <Text style={[styles.previewKicker, { color: palette.muted }]}>LIVE PREVIEW</Text>
        <Text style={[styles.previewStatus, { color: palette.muted }]}>Public Feed card</Text>
      </View>

      <View style={styles.previewZone}>
        <Text style={[styles.previewLabel, { color: palette.muted }]}>I need</Text>
        <Text style={[styles.previewTitle, { color: palette.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>
          {needTitle || "Choose or create a need"}
        </Text>
        <Text style={[styles.previewMeta, { color: palette.muted }]} numberOfLines={1}>
          {needMeta || "Category · Timing · Mode"}
        </Text>
      </View>

      <View style={styles.previewExchangeRow}>
        <View style={[styles.previewLine, { backgroundColor: palette.border }]} />
        <View style={[styles.previewExchangeBadge, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.previewExchangeText, { color: palette.text }]}>↔</Text>
        </View>
        <View style={[styles.previewLine, { backgroundColor: palette.border }]} />
      </View>

      <View style={styles.previewZone}>
        <Text style={[styles.previewLabel, { color: palette.muted }]}>I offer</Text>
        <Text style={[styles.previewTitle, { color: palette.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>
          {offerTitle || "Choose or create an offer"}
        </Text>
        <Text style={[styles.previewMeta, { color: palette.muted }]} numberOfLines={1}>
          {offerMeta || "Includes · Availability · Mode"}
        </Text>
      </View>
    </View>
  );
}

function EmptySelectState({
  title,
  text,
  buttonLabel,
  onPress,
}: {
  title: string;
  text: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.emptyStateCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.emptyStateTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyStateText, { color: palette.muted }]}>{text}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.emptyStateButton,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
          pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Text style={[styles.emptyStateButtonText, { color: palette.text }]}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function SummaryLine({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  const { palette } = useTheme();

  return (
    <View style={styles.summaryLine}>
      <View style={styles.summaryLabelWrap}>
        <View
          style={[
            styles.summaryDot,
            {
              borderColor: complete ? palette.text : palette.border,
              backgroundColor: complete ? palette.text : "transparent",
            },
          ]}
        />
        <Text style={[styles.summaryLabel, { color: palette.muted }]}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: palette.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PublishSummaryCard({
  needTitle,
  offerTitle,
  durationSummary,
  needComplete,
  offerComplete,
}: {
  needTitle: string;
  offerTitle: string;
  durationSummary: string;
  needComplete: boolean;
  offerComplete: boolean;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.publishSummaryCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.publishSummaryKicker, { color: palette.muted }]}>PUBLISH CHECKLIST</Text>
      <SummaryLine label="Need" value={needTitle || "Missing need"} complete={needComplete} />
      <SummaryLine label="Offer" value={offerTitle || "Missing offer"} complete={offerComplete} />
      <SummaryLine label="Duration" value={durationSummary} complete />
      <SummaryLine label="Visibility" value="Public Feed card" complete />
    </View>
  );
}

function ConfirmationToggle({
  selected,
  onPress,
}: {
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.confirmCard,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.text : palette.surface,
        },
        pressed ? { opacity: 0.84, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.confirmTitle, { color: selected ? palette.background : palette.text }]}>
        {selected ? "Ready to publish ✓" : "Confirm before publishing"}
      </Text>
      <Text style={[styles.confirmText, { color: selected ? palette.background : palette.muted }]}>
        I understand this Trade will be visible in the public Feed. My underlying Need and Offer stay private.
      </Text>
    </Pressable>
  );
}

export function TradeCreateScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { createNeed, createOffer, createTrade, needs, offers } = useTradeStore();

  const [activeSegment, setActiveSegment] = useState<CreateSegment>("need");
  const [needSource, setNeedSource] = useState<SourceMode>(needs.length > 0 ? "existing" : "new");
  const [offerSource, setOfferSource] = useState<SourceMode>(offers.length > 0 ? "existing" : "new");
  const [selectedNeedId, setSelectedNeedId] = useState(needs[0]?.id ?? "");
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id ?? "");
  const [quickNeed, setQuickNeed] = useState<QuickNeedDraft>(EMPTY_QUICK_NEED);
  const [quickOffer, setQuickOffer] = useState<QuickOfferDraft>(EMPTY_QUICK_OFFER);
  const [duration, setDuration] = useState<TradeDurationOption>("7d");
  const [isPublishConfirmed, setIsPublishConfirmed] = useState(false);
  const [error, setError] = useState("");

  const selectedNeed = useMemo(() => needs.find((item) => item.id === selectedNeedId), [needs, selectedNeedId]);
  const selectedOffer = useMemo(() => offers.find((item) => item.id === selectedOfferId), [offers, selectedOfferId]);

  const previewNeedTitle = needSource === "existing" ? selectedNeed?.title ?? "" : quickNeed.title.trim();
  const previewOfferTitle = offerSource === "existing" ? selectedOffer?.title ?? "" : quickOffer.title.trim();
  const previewNeedMeta =
    needSource === "existing"
      ? selectedNeed
        ? compactMeta([CATEGORY_LABELS[selectedNeed.category], selectedNeed.timing, MODE_LABELS[selectedNeed.mode]])
        : ""
      : compactMeta([CATEGORY_LABELS[quickNeed.category], quickNeed.timing, MODE_LABELS[quickNeed.mode]]);
  const previewOfferMeta =
    offerSource === "existing"
      ? selectedOffer
        ? compactMeta([CATEGORY_LABELS[selectedOffer.category], selectedOffer.availability, MODE_LABELS[selectedOffer.mode]])
        : ""
      : compactMeta([quickOffer.includes || "Includes", quickOffer.availability, MODE_LABELS[quickOffer.mode]]);

  const needComplete = needSource === "existing" ? Boolean(selectedNeed) : quickNeed.title.trim().length > 0;
  const offerComplete = offerSource === "existing" ? Boolean(selectedOffer) : quickOffer.title.trim().length > 0;
  const durationSummary = getDurationSummary(duration);

  function updateQuickNeed<TKey extends keyof QuickNeedDraft>(key: TKey, value: QuickNeedDraft[TKey]) {
    setQuickNeed((current) => ({ ...current, [key]: value }));
    if (error) {
      setError("");
    }
  }

  function updateQuickOffer<TKey extends keyof QuickOfferDraft>(key: TKey, value: QuickOfferDraft[TKey]) {
    setQuickOffer((current) => ({ ...current, [key]: value }));
    if (error) {
      setError("");
    }
  }

  function handlePublish() {
    if (!needComplete) {
      setActiveSegment("need");
      setError("Choose or create a need before publishing.");
      return;
    }

    if (!offerComplete) {
      setActiveSegment("offer");
      setError("Choose or create an offer before publishing.");
      return;
    }

    if (!isPublishConfirmed) {
      setActiveSegment("publish");
      setError("Confirm that this Trade can be shown publicly before publishing.");
      return;
    }

    let needForTrade: TradeNeedItem | undefined = selectedNeed;
    let offerForTrade: TradeOfferItem | undefined = selectedOffer;

    if (needSource === "new") {
      const title = quickNeed.title.trim();
      if (!title) {
        setActiveSegment("need");
        setError("Add or select a need before publishing.");
        return;
      }

      needForTrade = createNeed({
        title,
        category: quickNeed.category,
        timing: quickNeed.timing.trim() || "Flexible",
        mode: quickNeed.mode,
        urgency: quickNeed.urgency,
        locationLabel: quickNeed.locationLabel.trim() || MODE_LABELS[quickNeed.mode],
        shortDescription: quickNeed.shortDescription.trim() || "No description yet.",
        tags: parseTags(quickNeed.tagsText),
        desiredExchange: quickNeed.desiredExchange.trim() || undefined,
        status: "active",
      });
    } else if (!needForTrade) {
      setActiveSegment("need");
      setError("Select an existing need or create a new one.");
      return;
    }

    if (offerSource === "new") {
      const title = quickOffer.title.trim();
      if (!title) {
        setActiveSegment("offer");
        setError("Add or select an offer before publishing.");
        return;
      }

      offerForTrade = createOffer({
        title,
        category: quickOffer.category,
        availability: quickOffer.availability.trim() || "Flexible",
        mode: quickOffer.mode,
        includes: quickOffer.includes.trim() || "Simple service exchange",
        locationLabel: quickOffer.locationLabel.trim() || MODE_LABELS[quickOffer.mode],
        shortDescription: quickOffer.shortDescription.trim() || "No description yet.",
        tags: parseTags(quickOffer.tagsText),
        preferredExchange: quickOffer.preferredExchange.trim() || undefined,
        status: "active",
      });
    } else if (!offerForTrade) {
      setActiveSegment("offer");
      setError("Select an existing offer or create a new one.");
      return;
    }

    const publishedAtDate = new Date();
    const expiresAtDate = addDurationToDate(publishedAtDate, duration);
    const publishedAt = publishedAtDate.toISOString();

    const publishedTrade = createTrade({
      needId: needForTrade.id,
      offerId: offerForTrade.id,
      need: needForTrade,
      offer: offerForTrade,
      matchScore: 88,
      status: "active",
      publishedAt,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : undefined,
      expirationMode: duration === "manual" ? "manual" : "duration",
    });

    if (!publishedTrade) {
      setError("Could not publish this trade. Check the need and offer selection.");
      return;
    }

    setError("");
    router.replace("/trade");
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backButton,
            { borderColor: palette.border, backgroundColor: palette.surface },
            pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null,
          ]}
        >
          <Text style={[styles.backButtonText, { color: palette.text }]}>Back</Text>
        </Pressable>
        <Text style={[styles.topKicker, { color: palette.muted }]}>CREATE TRADE</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.screenTitle, { color: palette.text }]}>Create a public trade</Text>
        <Text style={[styles.screenText, { color: palette.muted }]}>
          Build one Feed card from your private Needs and Offers. The Need and Offer stay private; the published Trade is public.
        </Text>
      </View>

      <PreviewCard
        needTitle={previewNeedTitle}
        needMeta={previewNeedMeta}
        offerTitle={previewOfferTitle}
        offerMeta={previewOfferMeta}
      />

      <View style={[styles.segmentControl, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <SegmentButton value="need" label="Need" complete={needComplete} active={activeSegment === "need"} onPress={setActiveSegment} />
        <SegmentButton
          value="offer"
          label="Offer"
          complete={offerComplete}
          active={activeSegment === "offer"}
          onPress={setActiveSegment}
        />
        <SegmentButton
          value="publish"
          label="Publish"
          complete={needComplete && offerComplete}
          active={activeSegment === "publish"}
          onPress={setActiveSegment}
        />
      </View>

      {activeSegment === "need" ? (
        <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: palette.text }]}>Choose the Need</Text>
            <Text style={[styles.panelMeta, { color: palette.muted }]}>{needs.length} saved</Text>
          </View>

          <SourceToggle value={needSource} onChange={setNeedSource} existingLabel="Use saved need" newLabel="Create need" />

          {needSource === "existing" ? (
            <View style={styles.selectionList}>
              {needs.length > 0 ? (
                needs.map((item) => (
                  <SelectNeedCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedNeedId}
                    onPress={() => setSelectedNeedId(item.id)}
                  />
                ))
              ) : (
                <EmptySelectState
                  title="No saved needs yet"
                  text="Create a private Need here, then use it to publish this public Trade."
                  buttonLabel="Create need"
                  onPress={() => setNeedSource("new")}
                />
              )}
            </View>
          ) : (
            <QuickNeedFields draft={quickNeed} onChange={updateQuickNeed} />
          )}

          <Pressable
            onPress={() => setActiveSegment("offer")}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: palette.text },
              pressed ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={[styles.nextButtonText, { color: palette.background }]}>Next: Offer</Text>
          </Pressable>
        </View>
      ) : null}

      {activeSegment === "offer" ? (
        <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: palette.text }]}>Choose the Offer</Text>
            <Text style={[styles.panelMeta, { color: palette.muted }]}>{offers.length} saved</Text>
          </View>

          <SourceToggle value={offerSource} onChange={setOfferSource} existingLabel="Use saved offer" newLabel="Create offer" />

          {offerSource === "existing" ? (
            <View style={styles.selectionList}>
              {offers.length > 0 ? (
                offers.map((item) => (
                  <SelectOfferCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedOfferId}
                    onPress={() => setSelectedOfferId(item.id)}
                  />
                ))
              ) : (
                <EmptySelectState
                  title="No saved offers yet"
                  text="Create a private Offer here, then pair it with a Need for the public Feed."
                  buttonLabel="Create offer"
                  onPress={() => setOfferSource("new")}
                />
              )}
            </View>
          ) : (
            <QuickOfferFields draft={quickOffer} onChange={updateQuickOffer} />
          )}

          <Pressable
            onPress={() => setActiveSegment("publish")}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: palette.text },
              pressed ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Text style={[styles.nextButtonText, { color: palette.background }]}>Next: Publish</Text>
          </Pressable>
        </View>
      ) : null}

      {activeSegment === "publish" ? (
        <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: palette.text }]}>Publish to Feed</Text>
            <Text style={[styles.panelMeta, { color: palette.muted }]}>Public</Text>
          </View>

          <View style={[styles.publishNote, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.publishNoteTitle, { color: palette.text }]}>Choose listing duration</Text>
            <Text style={[styles.publishNoteText, { color: palette.muted }]}>
              Trades are public only while active. Expired trades leave the Feed but remain available for owner history later.
            </Text>
          </View>

          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setDuration(option.value)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.durationCard,
                  {
                    borderColor: duration === option.value ? palette.text : palette.border,
                    backgroundColor: duration === option.value ? palette.text : palette.surface,
                  },
                  pressed ? { opacity: 0.84, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Text style={[styles.durationTitle, { color: duration === option.value ? palette.background : palette.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.durationText, { color: duration === option.value ? palette.background : palette.muted }]}>
                  {option.helper}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.durationSummary, { color: palette.muted }]}>Selected: {durationSummary}</Text>

          <PublishSummaryCard
            needTitle={previewNeedTitle}
            offerTitle={previewOfferTitle}
            durationSummary={durationSummary}
            needComplete={needComplete}
            offerComplete={offerComplete}
          />

          <ConfirmationToggle
            selected={isPublishConfirmed}
            onPress={() => setIsPublishConfirmed((current) => !current)}
          />

          {error ? <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text> : null}

          <View style={styles.formActions}>
            <Pressable
              onPress={() => router.back()}
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
              onPress={handlePublish}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: palette.text },
                !needComplete || !offerComplete || !isPublishConfirmed ? { opacity: 0.48 } : null,
                pressed ? { opacity: 0.86, transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: palette.background }]}>Publish trade</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

export default TradeCreateScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 42,
    paddingTop: 18,
    gap: 16,
  },
  topBar: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  topKicker: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  titleBlock: {
    gap: 6,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  screenText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  previewCard: {
    borderWidth: 1,
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 8,
  },
  previewHeader: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  previewStatus: {
    fontSize: 10,
    fontWeight: "800",
  },
  previewZone: {
    minHeight: 104,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  previewTitle: {
    width: "100%",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  previewMeta: {
    width: "100%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  previewExchangeRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  previewLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
  },
  previewExchangeBadge: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
  },
  previewExchangeText: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },

  segmentControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  segmentButtonText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.1,
  },

  panel: {
    borderWidth: 1,
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  panelMeta: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sourceToggle: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectionList: {
    gap: 10,
  },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  emptyStateText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  emptyStateButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyStateButtonText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  selectCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 5,
  },
  selectKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  selectTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  selectMeta: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  quickFields: {
    gap: 12,
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
    minHeight: 82,
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
  nextButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  nextButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  publishNote: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  publishNoteTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.15,
  },
  publishNoteText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  durationGrid: {
    gap: 10,
  },
  durationCard: {
    minHeight: 64,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  durationTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  durationSummary: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    lineHeight: 15,
  },
  publishSummaryCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 11,
  },
  publishSummaryKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  summaryLine: {
    gap: 5,
  },
  summaryLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  summaryDot: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderRadius: 999,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.15,
    lineHeight: 19,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
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
});
